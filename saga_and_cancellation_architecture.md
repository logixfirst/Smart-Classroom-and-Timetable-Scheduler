# Saga Pattern & Cancellation System — Complete Architecture

## Overview

The timetable generation workflow is implemented using the **Saga pattern** — a sequence of steps where each step is independently cancelable, and failures trigger compensation rollbacks. Cancellation is **cooperative**, not forced: the running job checks for a cancellation signal at defined **safe points** and exits cleanly without leaving the system in an inconsistent state.

---

## Files Involved

| File | Role |
|------|------|
| `backend/fastapi/core/patterns/saga.py` | Orchestrates all 5 generation stages end-to-end |
| `backend/fastapi/core/cancellation.py` | All cancellation primitives: token, safe point, atomic section |
| `backend/fastapi/api/routers/generation.py` | FastAPI `POST /api/cancel/{job_id}` endpoint |
| `backend/django/academics/generation_views.py` | Django `POST /api/timetable/cancel/{job_id}/` endpoint |
| `backend/django/academics/celery_tasks.py` | Celery callback that finalizes job status after cancellation |
| `frontend/src/app/admin/timetables/status/[jobId]/page.tsx` | Cancel button in the UI |

---

## Part 1 — Saga Pattern

### What is a Saga?

A Saga is a sequence of steps (transactions) where:
- Each step can succeed or fail independently
- If a step fails, **compensation actions** undo any side effects from completed previous steps
- The whole sequence is treated as a logical unit, even though it spans multiple services

In this project, the "transaction" is timetable generation across 5 algorithmic stages.

---

### Saga Architecture Diagram

```
User clicks "Generate"
        │
        ▼
Django: POST /api/generation-jobs/generate/
        │   Creates GenerationJob (status=running)
        │   Fires Celery task
        ▼
Celery: calls FastAPI POST /generate
        │
        ▼
FastAPI: TimetableGenerationSaga.execute(job_id, request_data)
        │
        ├─► [SafePoint] STEP 1: _load_data()
        │       Fetch courses, faculty, rooms, time_slots, students from DB (asyncio.gather)
        │       tracker.start_stage('loading') → tracker.complete_stage()
        │
        ├─► [SafePoint] STEP 2: _stage1_clustering()
        │       Louvain community detection → slice courses into ~10-course clusters
        │       Fallback: greedy chunking if Louvain fails
        │       tracker.start_stage('clustering') → tracker.complete_stage()
        │
        ├─► [SafePoint] STEP 3: _stage2_cpsat()
        │       For each cluster: AdaptiveCPSATSolver.solve_cluster()
        │       token.check_or_raise() BETWEEN clusters (not during)
        │       tracker.update_stage_progress(n, total) after each cluster
        │       Saves solution to self.job_data['cpsat_solution'] for PARTIAL_SUCCESS
        │
        ├─► [SafePoint] STEP 4: _stage2b_ga()
        │       Runs GA 3× with different seeds (variants 1, 2, 3)
        │       Best fitness across 3 runs becomes the solution
        │       Saves all variants to self.job_data['variants']
        │
        ├─► [SafePoint] STEP 5: _stage3_rl()
        │       Frozen tabular Q-learning — no runtime training
        │       Attempts to load pre-trained policy for this semester
        │       Currently applies: local swap refinement only
        │
        └─► [AtomicSection] STEP 6: _persist_results()
                NON-CANCELABLE
                1. Converts solution dict → TimetableEntry JSON
                2. Writes result variants to Redis (result:job:{id}, TTL 24h)
                3. UPDATE generation_jobs SET status='completed', timetable_data=... WHERE job_id=...
                4. tracker.mark_completed() → Redis: {status: completed, overall_progress: 100}
```

---

### Stage-by-Stage Detail

#### Step 1 — `_load_data()`

```python
# All 5 Django DB tables fetched in parallel
courses, faculty, rooms, time_slots, students = await asyncio.gather(
    django_client.fetch_courses(org_id, semester),
    django_client.fetch_faculty(org_id),
    django_client.fetch_rooms(org_id),
    django_client.fetch_time_slots(org_id, time_config),
    django_client.fetch_students(org_id)
)
```

Returns a single `data` dict reused by all subsequent stages. No DB calls happen after this point.

#### Step 2 — `_stage1_clustering()`

Louvain community detection groups courses that share students/faculty into small clusters (~10 courses each). Each cluster is solved independently by CP-SAT. Greedy fallback: if Louvain raises any exception, courses are chunked by index.

#### Step 3 — `_stage2_cpsat()` — The Critical Stage

```python
for cluster_id, cluster in enumerate(clusters):
    token.check_or_raise(f"cpsat_cluster_{cluster_id}")  # Safe point between clusters

    cluster_solution = solver.solve_cluster(cluster)       # Work FIRST (atomic)
    
    if tracker:
        tracker.update_stage_progress(cluster_id + 1, len(clusters))  # Report AFTER
    
    solution.update(cluster_solution)
```

**Why check BETWEEN clusters, not during?**
CP-SAT model construction and the OR-Tools solver call are atomic — interrupting mid-solve would produce an unusable partial assignment. The safe point is the gap between cluster N finishing and cluster N+1 starting.

**Partial success storage:** After this stage, `self.job_data['cpsat_solution'] = solution` is saved. If cancellation happens in Stage 4 or 5, this is what gets returned as `PARTIAL_SUCCESS`.

#### Step 4 — `_stage2b_ga()`

Generates **3 variants** with different random seeds (42, 55, 68). Each variant is a full GA run of 20 generations × 15 population. The variant with the highest fitness score becomes `final_solution`. All three variants are stored in `self.job_data['variants']` for the admin UI to display as choices.

#### Step 5 — `_stage3_rl()`

Frozen Q-learning policy — no learning at runtime (DESIGN FREEZE constraint). Attempts to load a pre-trained Q-table from `sem_{semester}` key. Currently applies only local-swap refinement; the full refinement is marked TODO.

#### Step 6 — `_persist_results()` (NonCancelable)

```
1. Build TimetableEntry list from solution dict
2. redis.setex("result:job:{id}", 86400, json.dumps(full_result))   ← 24h TTL
3. psycopg2: UPDATE generation_jobs SET status='completed', timetable_data=...
4. If DB fails → warning only (Redis has the data, Django can poll from there)
```

Non-cancelable because a half-written `generation_jobs` row with `status=completed` but missing `timetable_data` would be a corrupt record.

---

### Compensation — `_compensate()`

Called on any `CancellationError` or unhandled `Exception`.

```python
async def _compensate(self, job_id: str):
    # 1. Clear Redis cancel flag
    redis_client.delete(f"cancel:job:{job_id}")

    # 2. UPDATE generation_jobs SET status='failed'
    #    WHERE job_id=... AND status NOT IN ('completed', 'approved')
    # (Guards: never overwrites a completed or approved job)
```

The `NOT IN ('completed', 'approved')` guard prevents compensation from corrupting a job that completed between the error being raised and the compensation running.

---

### PARTIAL_SUCCESS vs CANCELLED

```python
is_partial_success = self.stage_completed['cpsat']

if is_partial_success:
    # CP-SAT produced a feasible (but unoptimized) timetable
    return {
        'success': True,
        'partial': True,
        'state': 'partial_success',
        'solution': self.job_data.get('cpsat_solution', {}),
        'message': 'Basic solution generated, optimization cancelled'
    }
else:
    # Cancelled before CP-SAT — no usable solution
    return {
        'success': False,
        'state': 'cancelled',
        'cancelled': True,
    }
```

| Cancelled at | Result | Has timetable? |
|-------------|--------|---------------|
| Step 1 or 2 | `CANCELLED` | No |
| Step 3 (mid CP-SAT) | `CANCELLED` | No |
| Step 4 (GA) | `PARTIAL_SUCCESS` | Yes (CP-SAT quality) |
| Step 5 (RL) | `PARTIAL_SUCCESS` | Yes (GA quality) |
| Step 6 (atomic) | Cannot be cancelled | — |

---

## Part 2 — Cancellation System

### Design Philosophy

> "Cancellation must never leave the system in an inconsistent state."

The system implements the **3-Tier Cooperative Cancellation Model** (Google/Meta/Microsoft pattern):

| Tier | Mode | Behaviour |
|------|------|-----------|
| 1 | **SOFT** | Finish current atomic step, exit cleanly, save safe artifacts |
| 2 | **HARD** | Abort ASAP, release memory, do NOT save partial results |
| 3 | **EMERGENCY** | Process killed externally (OOM/SIGKILL), recovery on next run |

All cancellations in this project use **SOFT mode** by default.

---

### Cancellation State Machine

```
CREATED
   │
   ▼
RUNNING
   │
   ▼ (user clicks Cancel)
CANCELLATION_REQUESTED
   │
   ▼
AT SAFE POINT?
   │
   ├─── YES ─────────────────────────────────► STOPPED
   │                                               │
   └─── NO (inside atomic section) ────► DEFERRED ─────► STOPPED (after atomic section)
                                                           │
                                              CP-SAT completed?
                                               │           │
                                              YES          NO
                                               │           │
                                        PARTIAL_SUCCESS  CANCELLED
```

---

### `cancellation.py` — All Primitives

#### `CancellationToken`

The main object passed through every stage method.

```python
token = CancellationToken(job_id, redis_client, CancellationMode.SOFT)
```

| Method | What it does |
|--------|-------------|
| `is_cancelled()` | Reads `cancel:job:{id}` from Redis. Returns `True` if the key exists. Safe to call frequently. |
| `acknowledge()` | Called exactly once when actually stopping. Writes `state:job:{id}` → `{state: cancelled}` to Redis. |
| `check_or_raise(context)` | Combines `is_cancelled()` + `acknowledge()` + `raise CancellationError`. Used at every safe point. |

**How `is_cancelled()` reads the flag:**

```python
cancel_flag = redis.get(f"cancel:job:{self.job_id}")
if cancel_flag:
    data = json.loads(cancel_flag)
    self.reason = CancellationReason(data.get('reason', 'user_requested'))
    return True
```

The flag value is JSON: `{"reason": "user_requested", "timestamp": "..."}`. The reason is carried through to the `CancellationError` exception and ultimately surfaced in the API response.

---

#### `SafePoint` (context manager)

Wraps a cancelable block. Checks cancellation **at entry AND at exit**.

```python
class SafePoint:
    def __enter__(self):
        self.token.check_or_raise(self.context)   # Check before entering
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:                       # No exception during the block
            self.token.check_or_raise(self.context)  # Check after finishing
        return False  # Never suppress exceptions
```

**Usage in saga:**
```python
with SafePoint(token, "clustering"):
    clusters = await self._stage1_clustering(...)
```

If a cancellation flag was set at any point while clustering ran, `__exit__` raises `CancellationError`.

---

#### `AtomicSection` (context manager)

Wraps a **non-cancelable** block. If a cancel flag exists when entering, it defers the cancellation until **after** the block completes.

```python
class AtomicSection:
    def __enter__(self):
        if self.token.is_cancelled():
            self._deferred_cancellation = True   # Note the request, don't raise yet
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._deferred_cancellation and exc_type is None:
            # Block finished successfully — now raise the deferred cancellation
            self.token.check_or_raise(self.context)
        return False
```

**Usage in saga:**
```python
with AtomicSection(token, "persistence"):
    await self._persist_results(...)   # DB write — never interrupted
```

Even if the user clicked Cancel 30 seconds ago, the DB write finishes first, then cancellation propagates.

---

#### `request_cancellation()` (module-level function)

Called by external callers (API endpoints) to write the Redis flag.

```python
def request_cancellation(job_id, redis_client, reason=CancellationReason.USER_REQUESTED):
    cancel_data = {'reason': reason.value, 'timestamp': '...'}
    redis_client.setex(f"cancel:job:{job_id}", 3600, json.dumps(cancel_data))
    
    # Also publishes a Redis pub/sub event (for future WebSocket listeners)
    redis_client.publish(f"progress:{job_id}", json.dumps({
        'event': 'cancellation_requested', 'reason': reason.value
    }))
```

The key `cancel:job:{id}` has a **1-hour TTL** — if cancellation is never acknowledged (e.g., the worker crashed), the flag auto-clears.

---

#### `clear_cancellation()` (module-level function)

Called by the saga on successful completion to remove the flag.

```python
def clear_cancellation(job_id, redis_client):
    redis_client.delete(f"cancel:job:{job_id}")
```

Prevents a ghost cancellation flag from affecting a future re-run of the same `job_id`.

---

#### `CancellationReason` enum

```python
class CancellationReason(Enum):
    USER_REQUESTED   = "user_requested"   # Normal Cancel button
    TIMEOUT          = "timeout"          # Job exceeded max time
    MEMORY_LIMIT     = "memory_limit"     # OOM guard triggered
    ERROR            = "error"            # Internal failure
    SYSTEM_SHUTDOWN  = "system_shutdown"  # FastAPI shutting down
```

---

## Part 3 — Cancel Request Flow (End-to-End)

When the user clicks the Cancel button in the UI, the request flows through 4 layers:

```
Browser
  │  Click "Cancel"
  ▼
page.tsx: POST /api/generation-jobs/{jobId}/cancel/
  │
  ▼
Django: GenerationJobViewSet.cancel_generation()  [generation_views.py]
  │  1. Check: status NOT IN ['completed', 'cancelled']
  │  2. cache.set("cancel:job:{id}", "1", timeout=3600)   ← Django Redis cache
  │  3. job.status = 'cancelling'; job.save()
  │  4. (async, fire-and-forget) requests.post(fastapi_url + "/api/cancel/{id}")
  ▼
FastAPI: POST /api/cancel/{job_id}  [generation.py router]
  │  1. request_cancellation(job_id, redis, CancellationReason.USER_REQUESTED)
  │     → redis.setex("cancel:job:{id}", 3600, json.dumps({reason:...}))
  │     → redis.publish("progress:{id}", {event: cancellation_requested})
  │  2. Returns: {status: "cancellation_requested", message: "Job will stop at next safe point"}
  ▼
TimetableGenerationSaga (running in background asyncio task)
  │  token.check_or_raise() fires at the next safe point (between clusters)
  │  CancellationError raised
  │  _compensate() runs: clears Redis flag, UPDATE generation_jobs SET status='failed'
  │  tracker.mark_cancelled() → Redis: {status: cancelled}
  ▼
Django SSE stream (progress_endpoints.py)
  │  Reads Redis every 1s
  │  Sees status='cancelled' → yields: event: done  data: {status: "cancelled"}
  │  Closes stream
  ▼
useProgress hook (frontend)
  │  Receives "done" event → calls onComplete()/checks status
  ▼
page.tsx: status === 'cancelled' → renders "Generation Cancelled" state
```

---

### Why Two Cancel Paths? (Django AND FastAPI)

Django sets `cache.set("cancel:job:{id}", "1")` directly into its Redis cache **first**, before even calling FastAPI. This is a safety net:

- If FastAPI is temporarily unreachable, the flag is already in Redis
- The saga's `token.is_cancelled()` reads from the same shared Redis — it will see the flag regardless of which service wrote it
- The FastAPI endpoint call is a courtesy notification (fire-and-forget with `timeout=5`)

---

### Safe Points Map

```
┌──────────────────────┬─────────────────────┬──────────────────┐
│ Stage                │ Safe to cancel?      │ Check location   │
├──────────────────────┼─────────────────────┼──────────────────┤
│ Data loading         │ ✅ Yes (SafePoint)   │ __enter__        │
│ Clustering           │ ✅ Yes (SafePoint)   │ __enter__        │
│ Between CP-SAT       │ ✅ Yes               │ loop top         │
│ clusters             │                     │ (check_or_raise) │
│ Inside CP-SAT solve  │ ❌ No (OR-Tools      │ Not called       │
│                      │ solver call)         │                  │
│ Between GA variants  │ ✅ Yes (SafePoint)   │ __exit__         │
│ RL refinement        │ ✅ Yes (SafePoint)   │ __enter__        │
│ Persistence (DB      │ ❌ No (AtomicSection │ Deferred until   │
│ write)               │ — non-cancelable)    │ after commit     │
└──────────────────────┴─────────────────────┴──────────────────┘
```

---

## Part 4 — Celery Callback (Final Status Sync)

After FastAPI finishes (success, failure, or cancellation), it calls a Celery task `fastapi_callback_task` to finalize the Django DB record.

```python
@shared_task
def fastapi_callback_task(job_id, status, variants=None, error=None):
    job = GenerationJob.objects.get(id=job_id)
    
    if status == 'cancelled':
        job.status = 'cancelled'
        job.error_message = 'Cancelled by user'
        job.completed_at = timezone.now()
    
    elif status == 'completed':
        job.status = 'completed'
        job.progress = 100
        if variants:
            job.timetable_data = {'variants': variants}
    
    elif status == 'failed':
        job.status = 'failed'
        job.error_message = error or 'Generation failed'
    
    job.save()
    
    # Cleanup
    cache.delete(f"generation_queue:{job_id}")
    cache.delete(f"cancel:job:{job_id}")   # Remove cancel flag after job ends
```

This is an **enterprise reliability pattern**: instead of FastAPI calling Django via HTTP callback (which can fail if Django is temporarily down), it enqueues a Celery task. Celery retries failed tasks automatically, so the final status always reaches the DB.

---

## Part 5 — Redis Key Summary

| Key | Written by | Read by | TTL | Purpose |
|-----|-----------|---------|-----|---------|
| `progress:job:{id}` | FastAPI ProgressTracker | Django SSE stream | 7200s | Live progress JSON |
| `cancel:job:{id}` | Django cache / FastAPI request_cancellation | FastAPI token.is_cancelled() | 3600s | Cancellation signal |
| `state:job:{id}` | CancellationToken.acknowledge() | — | 3600s | Cancellation acknowledgement record |
| `result:job:{id}` | FastAPI _persist_results() | Django variants endpoint | 86400s | Full timetable + all 3 GA variants |
| `generation_queue:{id}` | Django Celery task | — | — | Temp task tracking |

---

## Enterprise Pattern Assessment

| Pattern | Implementation |
|---------|---------------|
| Cooperative cancellation | `token.check_or_raise()` at every inter-stage boundary — never forced kill |
| Atomic section protection | `AtomicSection` defers cancellation — DB write always completes |
| Deferred exception | Cancellation requested mid-atomic → raised only after `__exit__` |
| Partial success detection | `stage_completed['cpsat']` flag — preserves feasible solution |
| Compensation rollback | `_compensate()` with `NOT IN ('completed', 'approved')` guard |
| Dual-path cancel | Django writes Redis flag AND notifies FastAPI — resilient to inter-service failures |
| Celery reliable callback | Final status sync via task queue, not HTTP — survives Django restart |
| TTL-based cleanup | All Redis keys expire automatically — no manual cleanup job needed |
| Reason tracking | `CancellationReason` enum carried through token → error → API response |
