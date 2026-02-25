# Progress Tracking System — Complete Architecture

## System Overview

The progress tracker is a **3-layer distributed system**: FastAPI writes → Redis stores → Django reads → SSE streams → Next.js renders. No component knows about the others except through Redis. This is the correct separation of concerns for a system where the worker (FastAPI) and the web server (Django) run as two completely separate processes on potentially different machines.

```
FastAPI Engine                     Redis                      Django                  Browser
─────────────                     ────────────────────────   ─────────────────────   ─────────────────
ProgressTracker.update()  ──────► "progress:job:{id}"       SSE stream_progress()   useProgress hook
                                  (JSON, 2hr TTL)     ─────► polls every 1s ──────► setProgress(data)
                                                             DB fallback every 3s     60 FPS animation
```

---

## File-by-File Breakdown

### 1. `backend/fastapi/utils/progress_tracker.py` — The Writer

This is the **single source of truth** for all progress writing. Nothing else writes to Redis progress keys.

**Class:** `ProgressTracker`

| Method | What it does |
|--------|-------------|
| `__init__` | Creates `progress:job:{id}` key in Redis with `initializing` state, 2hr TTL |
| `start_stage(stage)` | Records stage start time, writes stage boundary start % to Redis |
| `update_stage_progress(completed, total)` | Called inside CP-SAT loop — maps `n/N` clusters to real overall % |
| `complete_stage()` | Writes exact end % of the stage (no partial value) |
| `update()` | Core method — clamps floats, calls `_track_progress_point()`, calculates ETA, does `redis.setex()` |
| `mark_completed()` | Writes `status=completed`, `overall=100`, `eta=0` |
| `mark_failed(msg)` | Writes `status=failed`, error inside `metadata.error` |
| `mark_cancelled()` | Writes `status=cancelled` |
| `_estimate_eta_moving_average()` | Calculates ETA from sliding window of last 10 `(timestamp, progress)` pairs |
| `_estimate_eta_simple()` | Fallback: simple `elapsed / progress%` linear extrapolation |

**Stage weight map** (hardcoded, total = 100%):

```
loading:          0%  →  5%
clustering:       5%  →  15%
cpsat_solving:   15%  →  75%   ← 60% of the job
ga_optimization: 75%  →  90%
rl_refinement:   90%  → 100%
```

**Redis key format:** `progress:job:{uuid}` → JSON string, TTL 7200s (2 hours)

**JSON schema written to Redis:**

```json
{
  "job_id": "8ae7f267-...",
  "stage": "cpsat_solving",
  "stage_progress": 34.57,
  "overall_progress": 35.74,
  "status": "running",
  "eta_seconds": 312,
  "started_at": 1740000000,
  "last_updated": 1740000180,
  "metadata": {
    "completed_items": 74,
    "total_items": 216
  }
}
```

---

### 2. `backend/fastapi/core/patterns/saga.py` — Who Calls ProgressTracker

The `TimetableGenerationSaga` creates one `ProgressTracker` per job and drives it through all stages. The key CP-SAT loop:

```python
# For each cluster (e.g. 216 clusters):
cluster_solution = solver.solve_cluster(cluster)            # do the work FIRST
tracker.update_stage_progress(cluster_id + 1, len(clusters))  # THEN report 1/216, 2/216...
```

No other file calls `ProgressTracker`. Saga is the only driver.

---

### 3. `backend/django/academics/progress_endpoints.py` — The Reader / SSE Publisher

**Three endpoints:**

#### `GET /api/generation/progress/{job_id}/` — One-shot REST snapshot
Reads `progress:job:{id}` from Redis, returns JSON. Used by the REST polling fallback in the frontend.

#### `GET /api/generation/stream/{job_id}/` — The main SSE stream

This is the critical function. Here is exactly what `event_stream()` does:

```
1. Immediately yields:
   event: connected
   data: {"job_id": "..."}

   (browser exits "Connecting..." spinner before any I/O)

2. Every 1 second:
   a. If Redis is live  →  GET key  →  if new data, yield:
      event: progress
      data: {json}

   b. If Redis is down  →  retry with exponential backoff (1s, 2s, 4s... max 30s)
                        →  after 5 failures, switch to DB-only mode (never crashes)

3. Every 3 seconds (when Redis key not found):
   →  DB fallback: read GenerationJob.status + progress from Django ORM
   →  Build synthetic ProgressData dict from DB fields
   →  yield: event: progress  data: {synthetic_json}
   →  (prevents "Connecting..." from lasting more than 3s even if Redis is cold)

4. When status is completed/failed/cancelled:
   →  yield: event: done  data: {"status": "..."}
   →  break (stream closes cleanly)
```

**Why plain Django view and not DRF?**
DRF's content negotiation rejects `StreamingHttpResponse` with HTTP 406. This uses `@csrf_exempt` + `@require_http_methods` instead.

**Why `Content-Encoding: identity` header?**
Django's `GZipMiddleware` is first in the middleware stack. Without this header, it wraps the streaming generator with `compress_sequence()` which only flushes when its internal buffer fills to ~8 KB. SSE events are tiny (~100 bytes each), so the buffer never fills — the browser waits forever. Setting `Content-Encoding: identity` causes `GZipMiddleware.process_response()` to skip this response completely.

#### `GET /api/generation/health/` — Health check
Pings Redis, returns `{status: healthy}` or `503`.

---

### 4. `frontend/src/hooks/useProgress.ts` — The Frontend Engine

Four separate, independently usable hooks:

#### `useProgress(jobId)`

Manages the `EventSource` connection lifecycle.

```
- Creates:  EventSource → /api/generation/stream/{jobId}/
- On "connected" event  →  setIsConnected(true)
- On "progress" event   →  setProgress(parsed JSON)
- On "done" event       →  calls onComplete()/onError(), closes EventSource
- On onerror            →  exponential backoff reconnect (max 5 attempts)
                            uses reconnectCountRef (not state) to avoid
                            stale closure bug — reconnect count stored in ref,
                            state is only for display
- Effect deps: [jobId] ONLY (reconnectAttempt intentionally excluded)
```

> **Critical:** The `reconnectAttempt` exclusion from deps is intentional. Previously it was `[jobId, reconnectAttempt]` which caused the hook to kill and restart the `EventSource` every time the counter reset to `0` on successful connect — an infinite loop. The fix uses `reconnectCountRef` (a `useRef`) for actual counting inside the `onerror` closure, and `reconnectAttempt` state is kept only for display purposes.

#### `useSmoothProgress(actualProgress)`

Velocity-based physics animation running at 60 FPS via `requestAnimationFrame`.

```
Physics model:
  velocity += (target - current) * acceleration
  velocity *= damping
  next = current + velocity
  next = clamp(next, 0, target)   ← never exceeds backend value
  next = max(next, current)        ← monotonic, never goes back

Config:  acceleration=0.02, damping=0.85, epsilon=0.05
At 100%: switches to time-based ease-out cubic (600ms)
```

If the backend reports 15% then 40%, the bar doesn't jump — it smoothly accelerates from 15 → 16 → 17 → ... → 40.

#### `useSmoothedETA(eta_seconds)`

Exponential smoothing: `display += (actual - display) * 0.15`

Prevents the ETA from jumping between "5m 20s" and "8m 10s" when the backend recalculates.

#### `getProgressColor(progress)`

Continuous HSL gradient: `hue = (progress / 100) * 120`

- `0%`   → `hsl(0,   90%, 50%)` — red
- `50%`  → `hsl(60,  90%, 50%)` — yellow
- `100%` → `hsl(120, 90%, 50%)` — green

No discrete color steps — fully continuous.

---

### 5. `frontend/src/app/admin/timetables/status/[jobId]/page.tsx` — The Page

Uses all four hooks and renders:

- Overall progress bar (physics-animated, HSL color)
- Current stage name (human-readable, no algorithm names shown to user)
- Stage progress bar (separate animation, faster response)
- ETA display (exponentially smoothed)
- 5-stage pipeline visualization: `loading → organize → build → optimize → finalize`
- Green dot "Live Updates" / red "Disconnected" connection indicator
- Cancel button — calls `DELETE /api/generation-jobs/{id}/cancel/`
- **REST polling fallback** — if SSE delivers no `progress` event within 30 seconds, polls `GET /generation-jobs/{id}/` every 5s and shows a "Job status (REST): running" badge

---

## Data Flow — End-to-End

```
1. User clicks "Generate Timetable" (new/page.tsx)
   → POST /api/generation-jobs/generate/
   → Django creates GenerationJob (status=running), fires Celery task
   → Celery calls FastAPI POST /generate
   → FastAPI starts TimetableGenerationSaga in asyncio background
   → Browser redirects to /admin/timetables/status/{job_id}

2. Status page mounts, useProgress creates EventSource
   → GET /api/generation/stream/{job_id}/
   → Django immediately yields: event: connected
   → useProgress: setIsConnected(true), spinner becomes green dot

3. FastAPI saga calls tracker.start_stage('loading')
   → Redis: {"stage":"loading","overall_progress":0,"status":"running",...}
   → Django SSE loop reads Redis every 1s
   → New data → yield: event: progress  data: {...}
   → useProgress: setProgress(data) → progress is no longer null
   → Page exits "Connecting..." → shows progress bars

4. For each of 216 CP-SAT clusters:
   → tracker.update_stage_progress(n, 216)
   → Redis updated with n/216 mapped to 15–75% overall
   → Django SSE detects change → emits event
   → useSmoothProgress animates 15% → 75% smoothly across all 216 updates

5. tracker.mark_completed()
   → Redis: {"status":"completed","overall_progress":100,...}
   → Django SSE emits: event: progress (100%) then event: done
   → useProgress closes EventSource
   → page.tsx status===completed → shows "Schedule Ready!" card
   → setTimeout 2s → router.push('/admin/timetables')
```

---

## Is it Enterprise Level?

**Yes** — these are genuine enterprise patterns:

| Pattern | Implementation | Real-world reference |
|---------|---------------|----------------------|
| Separation of concerns | FastAPI writes, Redis stores, Django reads — three separate components, zero coupling | Google Pub/Sub architecture |
| Dual-source resilience | SSE falls back to DB if Redis is cold — never shows infinite spinner | AWS CloudWatch fallback pattern |
| Moving average ETA | Sliding window of 10 `(time, progress)` points instead of naive `elapsed/progress` | Used in large-scale ML training jobs |
| Monotonic progress constraint | UI never goes backward even if backend sends unstable values | Twitter/Meta progress bar specs |
| Velocity physics animation | `requestAnimationFrame` + damped velocity — smooth integer steps 40→41→42 | Google Material Design Progress |
| Ref-based reconnect counter | `reconnectCountRef` avoids stale closure bug in exponential backoff | React docs: "avoid stale closures in effects" |
| GZip bypass for SSE | `Content-Encoding: identity` — deep Django middleware internals knowledge | Django production SSE hardening |
| Float precision | `round(x, 2)` throughout, no `int()` truncation in ETA or progress | Prevents "stuck at 14%" UX bug |
| Redis TTL (7200s) | Progress keys auto-expire after 2 hours — no manual cleanup needed | Standard ephemeral job state pattern |

---

## What is Currently Missing for Full Enterprise Production

| Gap | Risk | Suggested fix |
|-----|------|---------------|
| **No authentication on SSE stream** (`AllowAny`) | Any user can poll any `job_id` UUID | Validate `request.user` owns the job in `stream_progress()` |
| **Redis polling every 1s** (not pub/sub) | At 1,000 concurrent jobs = 1,000 Redis GETs/sec from Django | Migrate to Redis pub/sub (`SUBSCRIBE progress:job:{id}`) |
| **No WebSocket fallback** | SSE blocked by some reverse proxies (Nginx with buffering, some CDNs) | Add `EventSource` → WebSocket fallback detection in `useProgress` |
| **No Prometheus metrics on stream lifecycle** | Cannot alert on SSE connection drop rate or Redis miss rate | Add counters: `sse_connections_total`, `sse_redis_misses_total`, `sse_db_fallback_total` |

---

## Key Bugs Fixed (Historical Reference)

### Bug 1 — GZipMiddleware killing SSE stream

**Symptom:** Browser stuck at "Connecting to generation service..." indefinitely.

**Root cause:** `GZipMiddleware` is the first middleware in Django's `MIDDLEWARE` list. It wraps `StreamingHttpResponse` generators with `compress_sequence()`, which only flushes data when its internal buffer fills to ~8 KB. Each SSE event is ~100 bytes, so the buffer never fills — no events ever reach the browser.

**Fix applied** in `progress_endpoints.py`:
```python
response['Content-Encoding'] = 'identity'
# GZipMiddleware.process_response() checks has_header('Content-Encoding')
# and skips compression when the header is already set
```

### Bug 2 — reconnectAttempt dep causing infinite EventSource restart loop

**Symptom:** `connected` event received once, then immediate disconnect, then reconnect, infinite cycle. "Connecting..." never resolves.

**Root cause:** `useEffect` had `[jobId, reconnectAttempt]` as deps. On successful connect, `setReconnectAttempt(0)` fired (resetting 1 → 0). React detected the state change, re-ran the effect, the cleanup function ran (`isMounted = false`, `eventSource.close()`), killing the live connection before any `progress` events arrived.

**Fix applied** in `useProgress.ts`:
```typescript
// reconnectCountRef: actual counter — lives in a ref, safe inside onerror closures
const reconnectCountRef = useRef(0)

// onerror: reads ref (not stale state)
const attempt = reconnectCountRef.current + 1
reconnectCountRef.current = attempt
setReconnectAttempt(attempt)  // state = display only

// Effect deps: only jobId — reconnectAttempt excluded intentionally
}, [jobId])
```
