# System Health & Architecture Q&A
*Answers based on live code analysis of the actual repository — not guesses.*

---

## Q1. Current Broken State — What Is Actually Failing?

### All Three Services: RUNNING ✅ (Live confirmed Feb 25 2026)

**Observed live terminal output** confirms all three services start and serve requests correctly:

| Service | Port | Status | Evidence |
|---------|------|--------|----------|
| **Django** 5.1.3 | 8000 | ✅ Running | Auth, dashboard, generation all return 200/201 |
| **Celery** v5.3.6 | — | ✅ Running | Received task, called FastAPI, succeeded in 27s |
| **FastAPI** | 8001 | ✅ Running | 47 clusters solved before user stopped server (Ctrl+C) |

**Authenticated flow verified:**
- `/api/auth/login/` → 200 ✅
- `/api/auth/me/` → 200 (user: `harsh`, role: `ADMIN`, org: `Banaras Hindu University`) ✅
- `/api/dashboard/stats/` → 200 (21399 users, 2320 courses, 19072 students) ✅
- `POST /api/generation-jobs/generate/` → 201 ✅
- SSE `/api/generation/stream/{job_id}/` → 200 text/event-stream ✅

> **Note:** A previous terminal snapshot showed `Exit Code: 1` — that was a stale terminal for an earlier failed invocation (typo: `pythonmanage.py`). The server itself is healthy.

---

### CRITICAL: Memory Pressure / OOM Risk During Generation (NEW FINDING)

**Observed in live FastAPI logs:** RAM climbs continuously with each cluster solved and the cleanup system is entirely ineffective.

```
09:27:38 WARNING  RAM usage 80.0%  ← cluster 7
09:36:39 WARNING  RAM usage 87.6%  ← cluster 29
09:37:19 ERROR    RAM usage 90.4%  ← cluster 30 → CRITICAL threshold hit
  GC collected 0 objects
  clear_memory_cache: Cleared 0 entries (~0.0 MB)
  Cleanup complete: 90.4% → 90.6%  ← WORSE after cleanup
09:38:20 ERROR    RAM usage 91.6%  ← cluster 33 → second CRITICAL hit
  GC collected 0 objects, Cleared 0 entries, freed ~-0.02 GB  ← negative
09:39:02 WARNING  87.6%           ── brief drop, then climbs again
```

**Why cleanup fails:** CP-SAT solver objects (`CpModel`, `CpSolver`, constraint graphs) live in C++ memory allocated by OR-Tools. Python's garbage collector and the in-memory `cache_manager` have nothing to release. After 34 clusters, 15.35 GB system RAM is 91%+ used. With 182 clusters remaining at ~25s each, the server will reach OOM before the job completes — likely around cluster 50–70.

**Impact:** The FastAPI worker process will be killed by the OS OOM killer (or OR-Tools will throw `std::bad_alloc`). The saga's `except Exception` catches it, calls `mark_failed()`, writes `failed` to Redis. The Django DB is untouched (see `job_id` bug below).

**Fix:** Explicitly release solver after each cluster:
```python
# saga.py or solver.py — after extracting the solution from a cluster
del solver
del model
import gc
gc.collect()
```
Additionally reduce CP-SAT worker count under memory pressure:
```python
# In AdaptiveCPSATSolver.solve()
if memory_monitor.current_percent > 85:
    num_workers = max(2, num_workers // 2)
```

---

### Critical Bug Found in Code: `job_id` Column Mismatch

**File:** `backend/fastapi/core/patterns/saga.py` → `_persist_results()` and `_compensate()`

```python
# saga._persist_results() — line ~620
cur.execute(
    """
    UPDATE generation_jobs
    SET status = 'completed', progress = 100, timetable_data = %s::jsonb, ...
    WHERE job_id = %s          ← THIS COLUMN DOES NOT EXIST
    """,
    (timetable_json, ..., job_id)
)
```

**Django model:**
```python
# timetable.py
class GenerationJob(models.Model):
    id = models.UUIDField(primary_key=True, ...)   ← column name in DB is "id"
    # db_column is NOT set, so Django uses the field name: "id"
```

The PostgreSQL column is `id`. The saga queries `WHERE job_id = %s`. This will produce:

```
psycopg2.errors.UndefinedColumn: column "job_id" does not exist
```

Every successful generation will crash at the persistence step, leaving the job in a running state forever and nothing written to the DB. This is currently masked because the error is caught:
```python
except Exception as db_err:
    logger.error(f"[SAGA-PERSIST] DB write failed: {db_err}")
    # Non-fatal: falls back to Redis-only
```
The job appears "completed" in Redis but the Django DB record never updates. This is why the status page may show completed but the admin timetables list shows the job as still running.

**Fix (one line each):**
```python
# _persist_results(): change
WHERE job_id = %s
# to
WHERE id = %s

# _compensate(): same change
UPDATE generation_jobs SET status = 'failed' WHERE job_id = %s
# to
UPDATE generation_jobs SET status = 'failed' WHERE id = %s
```

---

### Missing Status Choices: `cancelling` and `cancelled`

**Django model:**
```python
class GenerationJob(models.Model):
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("running", "Running"),
            ("completed", "Completed"),
            ("failed", "Failed"),
            # ← 'cancelling' and 'cancelled' are MISSING
        ],
    )
```

**But these statuses ARE used in:**
- `generation_views.py` line 294: `job.status = 'cancelling'`
- `celery_tasks.py` line 145: `job.status = 'cancelled'`
- `progress_endpoints.py` line 180: `TERMINAL = frozenset(('completed', 'failed', 'cancelled'))`

Django won't raise an exception if you set a value outside `choices` (choices are UI-only in Django unless `.full_clean()` is called), but the SSE stream's terminal check will never match `'cancelled'` because the DB value `'cancelled'` exists but isn't modelled. If you ever run `job.full_clean()` before save it will raise `ValidationError`.

**Fix:** Add the two missing choices to the model and create a migration.

---

### Redis Tracker: No Error Handling

**File:** `backend/fastapi/utils/progress_tracker.py`

```python
def update(self, ...):
    # ...
    self.redis.setex(self.key, 7200, json.dumps(data))  # No try/except
```

If Redis is unavailable mid-generation (Upstash TLS timeout, network blip), this raises `redis.exceptions.ConnectionError` which propagates through `tracker.update()` → CP-SAT loop → `_stage2_cpsat()` → `execute()` → caught by `except Exception as e` → `mark_failed()` → which also calls `self.redis.setex()` and throws again → unhandled. The saga crashes with a half-complete timetable.

---

## Q2. Priority Concern by Layer

**Ranked by what will break a demo (updated from live run observation):**

| Priority | Layer | Issue | Impact |
|----------|-------|-------|--------|
| 🔴 1 | **Engine stability** | RAM hits 91%+ at cluster 33/216 — OOM kills the job before completion | Generation never finishes for university-scale data |
| 🔴 2 | **Data integrity** | `WHERE job_id = %s` → DB write always fails silently | Every job "completes" but is never saved to Django DB |
| 🟠 3 | **Engine correctness** | Redis crash mid-generation kills the job | Intermittent failures under load |
| 🟡 4 | **API reliability** | `cancelling`/`cancelled` not in choices | Cancel flow partially broken |
| 🟡 5 | **Frontend UX** | SSE AllowAny — any UUID readable | Security risk, not a crash |
| 🟢 6 | **Engine correctness** | GA fixed seeds → identical variants | Poor UX, not a crash |

---

## Q3. File Structure — Actual Directory Tree

### FastAPI — 65 Python files

```
backend/fastapi/
├── config.py
├── main.py
├── pytest.ini
│
├── api/
│   ├── __init__.py
│   ├── deps.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── cors.py
│   │   ├── error_handler.py
│   │   └── rate_limiting.py
│   └── routers/
│       ├── __init__.py
│       ├── cache.py
│       ├── conflicts.py
│       ├── generation.py        ← POST /generate, POST /cancel/{job_id}, GET /variants/{job_id}
│       ├── health.py
│       └── websocket.py
│
├── core/
│   ├── __init__.py
│   ├── cancellation.py          ← CancellationToken, SafePoint, AtomicSection
│   ├── lifespan.py
│   ├── logging_config.py
│   ├── memory_monitor.py
│   ├── patterns/
│   │   ├── __init__.py
│   │   ├── bulkhead.py
│   │   ├── circuit_breaker.py
│   │   └── saga.py              ← TimetableGenerationSaga (6-step orchestrator)
│   └── services/
│       ├── __init__.py
│       └── generation_service.py
│
├── engine/
│   ├── __init__.py
│   ├── adaptive_executor.py
│   ├── rate_limiter.py
│   ├── stage1_clustering.py     ← LouvainClusterer + greedy fallback
│   ├── context/
│   │   ├── __init__.py
│   │   ├── feature_store.py
│   │   └── signal_extractor.py
│   ├── cpsat/
│   │   ├── __init__.py
│   │   ├── constraints.py       ← HC1–HC6 constraint builders
│   │   ├── progress.py
│   │   ├── solver.py            ← AdaptiveCPSATSolver (progressive relaxation)
│   │   └── strategies.py
│   ├── ga/
│   │   ├── __init__.py
│   │   ├── fitness.py
│   │   ├── operators.py         ← crossover, mutate, tournament_selection
│   │   └── optimizer.py         ← GeneticAlgorithmOptimizer (3 variants, fixed seeds)
│   ├── hardware/
│   │   ├── __init__.py
│   │   ├── cloud_detector.py
│   │   ├── config.py
│   │   ├── detector.py
│   │   ├── gpu_detector.py
│   │   └── profile.py
│   └── rl/
│       ├── __init__.py
│       ├── qlearning.py         ← SimpleTabularQLearning (frozen policy)
│       ├── reward_calculator.py
│       └── state_manager.py
│
├── models/
│   ├── __init__.py
│   ├── request_models.py
│   ├── response_models.py
│   └── timetable_models.py      ← Pydantic: Course, Faculty, Room, TimeSlot, Student, Batch
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── run_tests.py
│   ├── test_utils.py
│   └── api/  core/  utils/
│
└── utils/
    ├── __init__.py
    ├── cache_manager.py
    ├── django_client.py         ← Raw psycopg2 queries → Pydantic model construction
    ├── metrics.py
    └── progress_tracker.py      ← ProgressTracker (single source of Redis writes)
```

### Django — 47 Python files

```
backend/django/
├── manage.py
│
├── academics/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── celery_tasks.py          ← generate_timetable_task, fastapi_callback_task
│   ├── conflict_service.py
│   ├── conflict_views.py
│   ├── generation_views.py      ← GenerationJobViewSet (generate, cancel, approve)
│   ├── mixins.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── academic_structure.py
│   │   ├── base.py              ← Organization, Building
│   │   ├── course.py            ← Course, CourseOffering, CourseEnrollment
│   │   ├── faculty.py           ← Faculty
│   │   ├── room.py              ← Room
│   │   ├── student.py           ← Batch, Student
│   │   ├── timetable.py         ← TimeSlot, GenerationJob, Timetable
│   │   └── user.py
│   ├── progress_endpoints.py    ← SSE stream_progress, get_progress, health
│   ├── serializers.py
│   ├── services/
│   │   └── department_view_service.py
│   ├── signals.py
│   ├── timetable_config_models.py
│   ├── timetable_config_serializers.py
│   ├── timetable_config_views.py
│   ├── timetable_views.py
│   ├── urls.py
│   ├── views/
│   │   ├── academic_viewsets.py
│   │   ├── auth_views.py
│   │   ├── course_viewset.py
│   │   ├── dashboard_views.py
│   │   ├── faculty_viewset.py
│   │   ├── room_viewsets.py
│   │   ├── student_viewset.py
│   │   ├── timetable_viewsets.py
│   │   └── user_viewset.py
│   ├── views_optimized.py
│   └── workflow_views.py        ← TimetableWorkflowViewSet (approve, reject)
│
├── core/
│   ├── audit_logging.py
│   ├── authentication.py
│   ├── cache_service.py
│   ├── csrf_middleware.py
│   ├── hardware_detector.py
│   ├── health_checks.py
│   ├── middleware.py
│   ├── permissions.py
│   ├── rbac.py
│   └── storage.py
│
└── erp/
    ├── asgi.py
    ├── celery.py
    ├── celery_settings.py
    ├── security.py
    ├── settings.py              ← GZipMiddleware first in stack (SSE bypass needed)
    ├── urls.py
    └── wsgi.py
```

---

## Q4. Django Model Structure — Backbone Models

### `GenerationJob` (`generation_jobs` table)

```python
class GenerationJob(models.Model):
    id            = UUIDField(primary_key=True)     # ← column name: "id" (NOT "job_id")
    organization  = FK(Organization, db_column='org_id')
    status        = CharField(choices=[pending, running, completed, failed])
                   # MISSING: cancelling, cancelled  ← bug
    created_at    = DateTimeField(auto_now_add)
    updated_at    = DateTimeField(auto_now)
    completed_at  = DateTimeField(null=True)
    error_message = TextField(null=True)
    progress      = IntegerField(default=0, 0-100)
    academic_year = CharField(null=True, db_index)
    semester      = IntegerField(null=True, db_index)
    timetable_data = JSONField(null=True)           # full result stored here

# Indexes: created, status+created, org+created, year+semester
```

> **`job_id` in API response is a serializer alias, not a DB column.**
> `GenerationJobListSerializer` adds `job_id = serializers.CharField(source='id', read_only=True)`.
> Both `id` and `job_id` in the API JSON carry the same UUID value.
> The PostgreSQL column is `id`. This confirms the `WHERE job_id = %s` bug in `saga.py` is real —
> raw psycopg2 queries use the actual column name, not the serializer alias.

### `TimeSlot` (`timeslots` table)

```python
class TimeSlot(models.Model):
    timeslot_id  = UUIDField(primary_key=True)       # FastAPI calls this slot_id
    organization = FK(Organization, db_column='org_id')
    day_of_week  = CharField(max_length=10)          # "monday", "tuesday" etc
    start_time   = TimeField()
    end_time     = TimeField()
    slot_name    = CharField(max_length=50)
    slot_order   = IntegerField()
    is_available = BooleanField(default=True)
    is_break     = BooleanField(default=False)
    is_lunch     = BooleanField(default=False)

# django_client maps: timeslot_id → slot_id in Pydantic TimeSlot
```

### `Course` + `CourseOffering` + `CourseEnrollment`

```
courses           ←──── INNER JOIN ────→  course_offerings
  course_id (PK)                             offering_id (PK)
  course_code                                course_id (FK)
  lecture_hours_per_week  ← maps to duration  primary_faculty_id (FK)
  room_type_required                         co_faculty_ids (JSONB array)
  min_room_capacity                          semester_type (ODD/EVEN)
  course_type                                total_enrolled
                                ↓
                          course_enrollments
                            offering_id (FK)
                            student_id (FK)
                            is_active = true

# django_client creates FastAPI Course objects from this 3-table JOIN
# Large courses (>60 students) are split into parallel sections per offering
```

**Field mapping Django → FastAPI Pydantic `Course`:**

| Django DB column | FastAPI `Course` field | Notes |
|-----------------|----------------------|-------|
| `courses.course_id` | `course_id` | Same |
| `courses.course_code` | `course_code` | Same |
| `courses.course_name` | `course_name` | Same |
| `course_offerings.primary_faculty_id` | `faculty_id` | Mapped |
| `courses.lecture_hours_per_week` | `duration` | 3 if NULL |
| `courses.course_type` | `type`, `subject_type` | Both set |
| `ARRAY_AGG(student_id)` | `student_ids: List[str]` | Subquery |
| `COALESCE(c.dept_id, f.dept_id)` | `department_id` | Fallback |

### `Room` (`rooms` table)

```python
class Room(models.Model):
    room_id           = UUIDField(primary_key=True)
    organization      = FK(Organization, db_column='org_id')
    building          = FK(Building, db_column='building_id')
    room_code         = CharField(max_length=50)
    room_type         = CharField(max_length=50)      # classroom, lab
    seating_capacity  = IntegerField()                # → FastAPI capacity
    features          = JSONField(null=True)          # → FastAPI features: List[str]
    is_active         = BooleanField(default=True)
```

**Field mapping Django → FastAPI `Room`:**

| Django | FastAPI | Notes |
|--------|---------|-------|
| `room_id` | `room_id` | Same |
| `room_code` | `room_code` | Same |
| `seating_capacity` | `capacity` | Renamed |
| `features` (JSONField) | `features: List[str]` | Parsed |
| `room_type` | `room_type` | Same |

### `Faculty` (`faculty` table)

```python
class Faculty(models.Model):
    faculty_id           = UUIDField(primary_key=True)
    organization         = FK(Organization, db_column='org_id')
    department           = FK(Department, db_column='dept_id')
    faculty_code         = CharField(max_length=30)
    first_name           = CharField(max_length=100)
    last_name            = CharField(max_length=100)
    max_hours_per_week   = IntegerField(default=18)   # used directly in HC3
    specialization       = CharField(max_length=200)
    is_active            = BooleanField(default=True)
    # Computed property:
    faculty_name         → f"{first_name} {last_name}"
```

**Field mapping Django → FastAPI `Faculty`:**

| Django | FastAPI | Notes |
|--------|---------|-------|
| `faculty_id` | `faculty_id` | Same |
| `faculty_name` (property) | `faculty_name` | Computed |
| `faculty_code` | `faculty_code` | Same |
| `department.dept_id` | `department_id` | FK resolved |
| `max_hours_per_week` | `max_hours_per_week` | Same |
| `specialization` | `specialization` | Same |

---

## Q5. Scale of Current Test Data

### Actual Observed Live Data (Feb 25 2026 run — Banaras Hindu University, Semester ODD)

| Entity | Actual count | Source |
|--------|-------------|--------|
| Course sections (after parallel splitting) | **2,494** | `[COURSE LOAD] 2494 sections` |
| Course offerings before splitting | 1,332 | `1332 offerings, 2324 parallel` |
| CP-SAT clusters | **216** | `Created 216 clusters from 2494 courses` |
| Faculty | **2,320** | saga data loaded log |
| Rooms | **1,147** | saga data loaded log |
| Time slots | **48** (6d × 8 teaching slots) | `Generated 48 time slots (6d x 8 slots/day)` |
| Students | **19,072** | saga data loaded log + dashboard |
| Total users in system | 21,399 | dashboard stats |
| Departments | 127 | `generate response: all 127 departments` |

> **Note on time slots:** Config was `slots_per_day=9`, `08:00–17:00`, lunch break `12:00–13:00`. 
> 9 configured slots − 1 lunch slot = **8 actual teaching slots per day**. NEP 2020 grid logic is correct.

**What the CP-SAT solver actually handles per cluster (observed):**
- Cluster size: 12 courses per cluster (avg) — `min=1, max=14, avg=11.5`
- Each solve took **14–31 seconds** per cluster with 60-second timeout
- Constraint counts per cluster: ~576 faculty conflicts + ~480–1,104 room conflicts + ~11,712–26,016 student conflicts + 72 session-per-day constraints
- 216 clusters × ~23s avg = **~82 minutes** projected total CP-SAT time

**Theoretical query limits (from model/code):**

| Entity | Max supported | LIMIT in query |
|--------|--------------|----------------|
| Courses per semester | 5,000 | `LIMIT 5000` in `fetch_courses()` |
| Faculty | 2,000+ | No explicit cap |
| Students | 25,000+ | No explicit cap |
| Rooms | Not capped | No explicit cap |

**Observed performance bottleneck:** The binding constraint is **RAM**, not CPU or time. 
At 2,494 courses / 216 clusters, RAM hits critical (91%+) after only 34 clusters. 
This means the current implementation **cannot complete a full university run** on a 15 GB machine.

---

## Live Run Analysis — Feb 25, 2026 (Job `85d1b932`)

**Timeline of observed run:**

| Time | Event |
|------|-------|
| 09:24:27 | `POST /api/generation-jobs/generate/` → 201, job created |
| 09:24:30 | Celery received task, started calling FastAPI |
| 09:24:35 | FastAPI started saga: loaded 2494 courses, 2320 faculty, 1147 rooms |
| 09:24:51 | 48 time slots generated (NEP 2020 grid) |
| 09:24:57 | Celery confirmed job queued in FastAPI (27s round-trip) |
| 09:25:26 | Clustering complete: 216 clusters (min=1, max=14, avg=11.5 courses) |
| 09:25:26 | CP-SAT started — cluster 1/216 |
| 09:27:19 | Memory WARNING at 80.0% — cluster 7 |
| 09:36:39 | Memory WARNING at 87.6% — cluster 29 |
| 09:37:19 | **Memory CRITICAL at 90.4%** — cluster 30. GC freed 0 objects. Cache freed 0 MB. Net: −0.02 GB |
| 09:38:20 | **Memory CRITICAL at 91.6%** — cluster 33. Same result. Net: −0.02 GB |
| 09:43:21 | Cluster 47/216 solving — user stopped server (Ctrl+C) |
| (never) | Job DB write never attempted (only 47/216 clusters done) |

**SSE stream observation:**
```
[SSE] DB fallback emitted for job 85d1b932...: status=queued progress=0.0%
```
The SSE correctly fell back to Django DB because FastAPI had not yet written any Redis progress 
for this job (it was still in the `loading data` phase when SSE first polled). This is expected behaviour — 
`status=queued` is correct at that moment.

**Memory pattern (clusters vs RAM):**
```
Cluster  7 → 80.0% (first warning)
Cluster 14 → 87.6%
Cluster 29 → 87.6%
Cluster 30 → 90.4% CRITICAL
Cluster 33 → 91.6% CRITICAL
Cluster 35 → 87.6% (brief drop after solver internal GC)
Cluster 40 → 86.6%
Cluster 47 → still rising
```
Pattern: CP-SAT solver allocates C++ objects that Python GC cannot release. 
Each cluster leaves residual memory. Estimated OOM crash: cluster 55–70.

---

## Risk 1 — SSE Authentication: Confirmed Real Risk

```python
# progress_endpoints.py
@require_http_methods(["GET"])
@csrf_exempt
def stream_progress(request, job_id):
    # No authentication check here
    # AllowAny = any user with any job UUID gets real-time data
```

**Why it matters at demo scale:** Job IDs are UUIDs (128-bit). Guessing one is computationally infeasible. But if any endpoint ever leaks a `job_id` in a list response without `IsAuthenticated`, the stream is open.

**Minimum fix:**
```python
def stream_progress(request, job_id):
    if not request.user.is_authenticated:
        return HttpResponse(status=401)
    try:
        job = GenerationJob.objects.only('organization').get(id=job_id)
        if str(job.organization_id) != str(request.user.organization_id):
            return HttpResponse(status=403)
    except GenerationJob.DoesNotExist:
        return HttpResponse(status=404)
    # ... rest of function
```

---

## Risk 2 — Redis as Single Point of Failure: Confirmed Real Risk

```python
# progress_tracker.py — no protection on any Redis call
def update(self, overall_progress, ...):
    self.redis.setex(self.key, 7200, json.dumps(data))  # throws ConnectionError if Redis down
```

When Redis goes down mid-CP-SAT, `tracker.update()` throws, `.check_or_raise_cpsat_cluster_N` catches it as a general exception, saga's `except Exception` catches it, calls `tracker.mark_failed()` which also tries Redis and throws again — **unhandled exception, Uvicorn worker crashes**.

**Minimum fix for tracker:**
```python
def update(self, ...):
    try:
        self.redis.setex(self.key, 7200, json.dumps(data))
    except Exception as e:
        logger.warning(f"[PROGRESS] Redis write failed (non-fatal): {e}")
        # Job continues — progress just won't be visible until Redis recovers
```

---

## Risk 3 — GA Fixed Seeds: Confirmed, Lower Priority

```python
# saga._stage2b_ga()
for variant_idx in range(NUM_VARIANTS):
    variant_seed = 42 + variant_idx * 13   # seeds: 42, 55, 68 — always identical
    random.seed(variant_seed)
```

Same org + same semester + same courses = Variant 1, 2, 3 are always the same three timetables. This is deterministic across restarts, not just within a session.

**Why seeds alone are not enough for diversity:** The GA starts from the same `initial_solution` (CP-SAT output), uses the same population size (15), the same mutation rate (0.15), and the same fitness function. Different seeds only diversify the initial random perturbations in `_initialize_population()`. The fitness landscape is the same, so they converge to near-identical local optima.

**Fix requires semantic diversity, not just seed diversity:**
```python
# Different objective weights per variant, not just different seeds
VARIANT_CONFIGS = [
    {'seed': 42, 'faculty_weight': 1.0, 'room_weight': 0.5, 'spread_weight': 0.3},   # faculty-first
    {'seed': 55, 'faculty_weight': 0.5, 'room_weight': 1.0, 'spread_weight': 0.3},   # room-efficiency
    {'seed': 68, 'faculty_weight': 0.6, 'room_weight': 0.6, 'spread_weight': 1.0},   # spread-first
]
```

Pass the weights into `evaluate_fitness_simple()` per variant. Then each variant optimizes for a genuinely different objective. The admin UI can label them: "Faculty-Friendly", "Room-Efficient", "Student-Spread".

---

## Summary: What to Fix Before Demo

In exact order (updated from live run findings — Feb 25 2026):

1. **Memory leak / OOM during generation** — CP-SAT solver objects retain C++ memory that Python GC cannot release. Add explicit `del solver; del model; gc.collect()` after each cluster. Also reduce worker count when RAM > 85%. Without this fix, generation **cannot complete** on the university dataset (216 clusters, 15 GB machine).

2. **`WHERE job_id = %s` → `WHERE id = %s`** in `saga.py` `_persist_results()` and `_compensate()` — one-line fix, currently every completed generation silently fails to save to Django DB. Confirmed: `job_id` in the API response is a serializer alias (`serializers.CharField(source='id')`), not a real DB column.

3. **Add `cancelling`/`cancelled` to `GenerationJob.status` choices** — add to model + `makemigrations` + `migrate`

4. **Wrap all `self.redis.*` calls in `progress_tracker.py` with try/except** — prevents Redis blip from crashing entire generation job

5. **Add authentication to `stream_progress()`** — minimum check before demo

6. **GA semantic diversity** — lower priority, affects demo quality not correctness

> Django, Celery, and FastAPI all start and serve requests correctly as of Feb 25 2026.
