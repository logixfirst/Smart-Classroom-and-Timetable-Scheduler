# Timetable Generation — Complete Deep Dive

> **Scope:** Every function, every file, every data structure from the moment the frontend
> clicks "Generate" through to the moment a timetable variant is rendered in the browser.
> NEP 2020-compliant, hardware-adaptive, three-stage pipeline (CP-SAT → GA → RL).

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Trigger: API Entry Point](#2-trigger-api-entry-point)
3. [Data Fetch Layer — `DjangoAPIClient`](#3-data-fetch-layer--djangoapiclient)
4. [Core Pydantic Data Models](#4-core-pydantic-data-models)
5. [Saga Orchestrator — `TimetableGenerationSaga`](#5-saga-orchestrator--timetablegenerationsaga)
6. [Stage 1 — Louvain Clustering](#6-stage-1--louvain-clustering)
7. [Stage 2 — CP-SAT Constraint Solver](#7-stage-2--cp-sat-constraint-solver)
8. [Stage 2B — Genetic Algorithm Optimization](#8-stage-2b--genetic-algorithm-optimization)
9. [Stage 3 — RL Conflict Refinement](#9-stage-3--rl-conflict-refinement)
10. [Persist Results — DB + Redis Layout](#10-persist-results--db--redis-layout)
11. [Variant Structure — Minute Detail](#11-variant-structure--minute-detail)
12. [How a Timetable Entry is Built](#12-how-a-timetable-entry-is-built)
13. [Conflict Detection Pipeline](#13-conflict-detection-pipeline)
14. [Progress Tracking (SSE Flow)](#14-progress-tracking-sse-flow)
15. [Django ORM Models](#15-django-orm-models)
16. [CP-SAT Constraint Catalogue](#16-cp-sat-constraint-catalogue)
17. [GA Fitness Function](#17-ga-fitness-function)
18. [End-to-End Data Flow Diagram](#18-end-to-end-data-flow-diagram)
19. [Key Constants and Configuration](#19-key-constants-and-configuration)

---

## 1. System Architecture Overview

```
Browser ──► Django REST (port 8000) ──► Celery task ──► FastAPI (port 8001)
                │                                            │
                │◄──────── SSE progress (Redis) ────────────│
                │                              ┌────────────┘
                │                              │  3-stage engine
                │                              │  Stage1: Louvain clustering
                │                              │  Stage2: CP-SAT per cluster
                │                              │  Stage2B: GA (3 variants)
                │                              │  Stage3: RL refinement
                │                              └────────────────► PostgreSQL
                │                                                   (timetable_data JSONB)
                │◄────────── Review page reads variants ────────── Redis cache
```

**Key design decisions:**
- Django owns auth, models, REST endpoints, approval workflow.
- FastAPI owns the heavy CPU computation (CP-SAT, GA, RL) in a separate process.
- Redis is the IPC bus: progress tracking, job state, result cache.
- PostgreSQL is the truth store: `generation_jobs.timetable_data` holds the final JSONB.
- GPU and runtime RL training are **deliberately disabled** (DESIGN FREEZE) for determinism.

---

## 2. Trigger: API Entry Point

### `backend/fastapi/api/routers/generation.py` — `POST /api/generate_variants`

```python
class GenerationRequest(BaseModel):
    organization_id: str   # org UUID or name (auto-resolved)
    semester: int          # 1-12
    time_config: Optional[TimeConfig] = None
    job_id: Optional[str] = None       # Django's pre-created UUID
    department_id: Optional[str] = None
    batch_ids: Optional[List[str]] = None
    academic_year: Optional[str] = None
```

**`generate_timetable()` function behaviour:**

1. Uses `request.job_id` if provided by Celery (Django-first architecture); otherwise generates a new UUID.
2. Calls `get_optimal_config(hardware_profile)` to compute `estimated_time_minutes`.
3. Instantiates `GenerationService(redis, hardware_profile)`.
4. Registers `service.generate_timetable(...)` as a **background task** via FastAPI's `BackgroundTasks` — returns `200 OK` immediately before generation starts.

### `backend/django/academics/celery_tasks.py` — `generate_timetable_task`

Django's Celery task (`@shared_task`) is the bridge:

1. Creates `GenerationJob` record in PostgreSQL with `status='running'`.
2. POSTs to `{FASTAPI_URL}/api/generate_variants` with job payload.
3. On `requests.Timeout` (>30s): leaves job as `running` — FastAPI may already be processing.
4. On success: job stays `running` — completion is signalled by FastAPI's later DB write.

---

## 3. Data Fetch Layer — `DjangoAPIClient`

**File:** `backend/fastapi/utils/django_client.py`  
**Class:** `DjangoAPIClient`

### Connection Pool (module-level singleton)

```python
_db_pool: psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    dsn=DATABASE_URL,
    connect_timeout=10
)
```

- Pool is **module-level** — shared across all generation jobs, never re-created.
- Each fetch method borrows its own connection via `_borrow_conn()` / `_return_conn()`.
- `_init_conn()` sets `autocommit=True` and `statement_timeout='30s'` **once per connection**.
- Connections are tracked by `id(conn)` in `_initialized_conn_ids: set`.

### Parallel Fetch (`_load_data` in saga)

```python
courses, faculty, rooms, time_slots, students = await asyncio.gather(
    django_client.fetch_courses(org_id, semester),
    django_client.fetch_faculty(org_id),
    django_client.fetch_rooms(org_id),
    django_client.fetch_time_slots(org_id, time_config),
    django_client.fetch_students(org_id),
)
```

Each `fetch_*` method uses `asyncio.to_thread()` internally so psycopg2 blocking I/O
does not stall the event loop. Wall-clock time = max(individual fetch times), not sum.

---

### `fetch_courses(org_id, semester)` — Critical Details

**SQL pattern:** Pre-aggregated JOIN (fixes N+1):

```sql
SELECT c.course_id, c.course_code, c.course_name, ...
FROM courses c
INNER JOIN course_offerings co ON ...
LEFT JOIN faculty f ON co.primary_faculty_id = f.faculty_id
LEFT JOIN (
    SELECT offering_id,
           ARRAY_AGG(DISTINCT student_id) AS student_ids
    FROM course_enrollments
    WHERE is_active = true
    GROUP BY offering_id
) ce_agg ON ce_agg.offering_id = co.offering_id
WHERE c.org_id = %s AND ce_agg.student_ids IS NOT NULL
LIMIT 5000
```

**`semester_type` mapping:** `semester == 1 → 'ODD'`, else `'EVEN'`.

**Parallel section splitting (courses with >60 students):**

```
If len(student_ids) > 60:
    num_sections = ceil(len(student_ids) / 60)
    For each section:
        course_id  = "{original_id}_off_{offering_id}_sec{section_idx}"
        course_name = "{name} (Sec N/M)"
        faculty_id  = available_faculty[section_idx % len(available_faculty)]
        student_ids = slice of students for that section
```

This means a 180-student course becomes **3 independent `Course` objects**, each schedulable simultaneously in different rooms by different faculty.

**Course ID format:**
- Single section: `{course_id}_off_{offering_id}`
- Parallel section: `{course_id}_off_{offering_id}_sec{N}`

**Caching:** `cache_manager.set('courses', org_id, courses_dict, ttl=1800)` — 30-minute Redis cache with version-key invalidation (Django signals update version key on data changes).

---

### `fetch_faculty(org_id)` — Returns `Dict[str, Faculty]`

```sql
SELECT faculty_id, faculty_code, first_name, last_name,
       dept_id, max_hours_per_week, specialization
FROM faculty
WHERE org_id = %s AND is_active = true
```

Returns a dictionary keyed by `faculty_id` (UUID string). Each `Faculty` object has:
- `max_hours_per_week`: used by CP-SAT workload constraint (HC3)
- `available_slots`: list of allowed slot IDs
- `preferred_slots`: dict of `{slot_id: preference_weight}` for GA fitness

---

### `fetch_rooms(org_id)` — Returns `List[Room]`

Each `Room` has `features: List[str]` (e.g., `['projector', 'lab']`) matched against
`course.required_features` during CP-SAT domain precomputation.

---

### `fetch_time_slots(org_id, time_config)` — Returns `List[TimeSlot]`

Fetches from `timeslots` table. If `time_config` is provided (working_days, slots_per_day,
start_time, slot_duration_minutes), generates a synthetic slot grid instead. Each `TimeSlot`:

```python
TimeSlot(
    slot_id   = str,      # UUID or "day-period" key
    day_of_week = str,    # "Monday", "Tuesday", ...
    day       = int,      # 0=Mon, 5=Sat
    period    = int,      # 0-indexed period within day
    start_time = str,     # "09:00"
    end_time   = str,     # "10:00"
    slot_name  = str      # "Monday P1"
)
```

**NEP 2020 universal time grid:** All departments share the same 54 time slots (9 periods × 6 days). Cross-department scheduling conflicts are prevented automatically.

---

## 4. Core Pydantic Data Models

**File:** `backend/fastapi/models/timetable_models.py`

### `Course`

| Field | Type | Description |
|---|---|---|
| `course_id` | `str` | Unique ID (may include `_off_` and `_sec` suffixes) |
| `course_code` | `str` | Human-readable code |
| `course_name` | `str` | Display name |
| `faculty_id` | `str` | Assigned faculty UUID |
| `student_ids` | `List[str]` | All enrolled student UUIDs |
| `batch_ids` | `List[str]` | Batch UUIDs |
| `duration` | `int` | Sessions per week (= `lecture_hours_per_week`) |
| `type` | `Optional[str]` | `lecture / lab / tutorial / seminar` |
| `credits` | `int` | NEP 2020 credit hours |
| `required_features` | `List[str]` | Room requirements (e.g., `['lab', 'projector']`) |
| `department_id` | `str` | Dept UUID |
| `subject_type` | `str` | `core / elective / open_elective` |

> **`duration` is the most important field** — it controls how many CP-SAT variables
> are created. A course with `duration=3` gets assigned 3 independent (slot, room) pairs.

---

### `Faculty`

| Field | Type | Description |
|---|---|---|
| `faculty_id` | `str` | UUID |
| `max_hours_per_week` | `int` | Hard cap enforced by HC3 (default 18) |
| `available_slots` | `List[int]` | Allowed slot IDs (empty = all allowed) |
| `preferred_slots` | `Dict[int, float]` | Slot ID → preference weight for GA |

---

### `Room`

| Field | Type | Description |
|---|---|---|
| `room_id` | `str` | UUID |
| `room_code` | `str` | Short code (e.g., `LH-101`) |
| `room_type` | `str` | `classroom / lab / seminar_hall` |
| `capacity` | `int` | Maximum students; used for domain reduction |
| `features` | `List[str]` | Available features list |
| `dept_id` | `Optional[str]` | If set, room is restricted to that department |

---

### `TimeSlot`

| Field | Type | Description |
|---|---|---|
| `slot_id` | `str` | UUID or synthetic key |
| `day` | `int` | 0=Monday … 5=Saturday |
| `period` | `int` | 0-indexed period within day |
| `start_time` | `str` | `"09:00"` |
| `end_time` | `str` | `"10:00"` |

---

### `TimetableEntry` (output model)

| Field | Type | Description |
|---|---|---|
| `course_id` | `str` | Matches `Course.course_id` |
| `course_code` | `str` | Display code |
| `faculty_id` | `str` | Assigned faculty |
| `room_id` | `str` | Assigned room |
| `time_slot_id` | `str` | Assigned time slot |
| `session_number` | `int` | Which repetition (0 to duration-1) |
| `day` | `int` | 0-5 |
| `start_time` | `str` | Wall-clock start |
| `end_time` | `str` | Wall-clock end |
| `student_ids` | `List[str]` | Enrolled students |
| `batch_ids` | `List[str]` | Batch membership |

---

## 5. Saga Orchestrator — `TimetableGenerationSaga`

**File:** `backend/fastapi/core/patterns/saga.py`  
**Entry:** `TimetableGenerationSaga.execute(job_id, request_data)`

The Saga is the master workflow. It owns cancellation tokens, progress tracking, error
compensation, and calls each stage in sequence.

### Stage Sequence

```
Step 1: _load_data          (0% → 5%)  — parallel DB fetch
Step 2: _stage1_clustering  (5% → 15%) — Louvain graph clustering
Step 3: _stage2_cpsat       (15% → 75%) — CP-SAT per cluster
Step 4: _stage2b_ga         (75% → 90%) — GA 3× variants
Step 5: _stage3_rl          (90% → 100%) — RL frozen refinement
Step 6: _persist_results    (atomic, non-cancelable)
```

### Cancellation State Machine

```
CREATED → RUNNING → CANCELLATION_REQUESTED
                          ↓
                    AT SAFE POINT?
                   YES          NO
                    ↓           ↓
                STOPPED    DEFERRED → STOPPED after atomic

CP-SAT done?
   YES → PARTIAL_SUCCESS (feasible but unoptimized solution kept)
    NO → CANCELLED (no solution)
```

**Safe points** where cancellation is checked: between clusters, between GA variants,
between RL episodes. **Atomic sections** (CP-SAT model build, DB write) cannot be cancelled.

### `_persist_results` Data Flow

After all stages: solution dict `{(course_id, session): (time_slot_id, room_id), ...}`
is converted to structured JSON and written to Django's PostgreSQL in one `UPDATE`:

```sql
UPDATE generation_jobs
SET status         = 'completed',
    progress       = 100,
    timetable_data = %s::jsonb,
    completed_at   = %s,
    updated_at     = %s
WHERE id = %s
```

After DB write, `_enqueue_cache_warm_task(job_id)` fires a Celery task
(`academics.celery_tasks.fastapi_callback_task`) to pre-warm Redis caches.

---

## 6. Stage 1 — Louvain Clustering

**File:** `backend/fastapi/engine/stage1_clustering.py`  
**Class:** `LouvainClusterer`

### Purpose

Groups the full course list into smaller clusters (~10–15 courses each) to make
CP-SAT tractable. Large problems are NP-hard; clustering ensures each CP-SAT call
stays under the time limit.

### Graph Construction — `_build_constraint_graph()`

Creates a weighted NetworkX graph. Nodes = `course_id`. Edges = constraint weight
between any two courses, computed by `_compute_constraint_weight()`:

| Relationship | Weight |
|---|---|
| Shared students (cross-enrollment) | `100.0 × overlap_ratio` + `50.0` if ratio > 0.5 |
| Same faculty | `50.0` |
| Shared required room features | `10.0` |

**Adaptive edge threshold** (controls graph density):
- RAM < 3 GB → threshold = 1.0 (very sparse, only strongest edges)
- RAM 3–5 GB → threshold = 0.5
- RAM 5–8 GB → threshold = 0.3
- RAM > 8 GB → threshold = 0.1 (dense)

Edge computation is parallelised via `ThreadPoolExecutor` with `min(cpu_count, 8)` workers.

### Community Detection — `_run_louvain()`

```python
partition = community_louvain.best_partition(G, weight='weight', random_state=42)
```

Uses the `python-louvain` library. Falls back to department-based clustering if unavailable.

### Size Optimization — `_optimize_cluster_sizes()`

| Cluster size | Action |
|---|---|
| > 15 courses | Split into 12-course chunks |
| < 5 courses | Collect into `small_clusters` pool |
| 5–15 courses | Keep as-is |

`small_clusters` pool is merged into ~10-course groups. Final output:
`Dict[int, List[Course]]`.

---

## 7. Stage 2 — CP-SAT Constraint Solver

**File:** `backend/fastapi/engine/cpsat/solver.py`  
**Class:** `AdaptiveCPSATSolver`

### What CP-SAT Does

For each cluster (list of courses), CP-SAT assigns every **session** of every course
to a feasible **(time_slot_id, room_id)** pair while satisfying all hard constraints.

A course with `duration=3` gets **3 independent session variables** — each can land
on a different day/slot/room.

### Variable Creation

```python
# One Boolean variable per (course, session, time_slot, room) combination
x_{course_id}_s{session}_t{t_slot_id}_r{room_id} ∈ {0, 1}
```

**Only valid combinations** are created (domain reduction):
- Room capacity ≥ `len(course.student_ids)`
- Room features ⊇ `course.required_features`
- Faculty is available at that slot
- Slot is not fixed to a different assignment

This is the "aggressive domain reduction" that cuts 90%+ of variables.

### The Solution Dict

The solver returns:
```python
{
    (course_id, session_number): (time_slot_id, room_id),
    ...
}
```

If a cluster fails all strategies, courses get the **greedy fallback sentinel**:
```python
(course_id, session): ('__UNSCHEDULED__', first_room_id)
```
These entries are filtered out during `_persist_results`.

### Progressive Strategy Relaxation

**File:** `backend/fastapi/engine/cpsat/strategies.py`

CP-SAT tries up to 4 strategies in order, stopping at the first success:

| Strategy | Constraints Active | Timeout |
|---|---|---|
| Full Constraints | HC1+HC2+HC3+HC4+HC5+HC6 | 30s |
| Relaxed Student | HC1+HC2+HC3+HC5+HC6 | 45s |
| Faculty + Room Only | HC1+HC2 | 60s |
| Emergency | HC1 only | 120s |

`select_strategy_for_cluster_size()` skips early strategies for large clusters
(>20 courses) that statistically always fail, saving up to 75s per cluster.

**Pre-flight overload detection:** If any faculty member has more sessions
assigned (sum of `course.duration`) than total available slots, CP-SAT would
prove INFEASIBLE immediately under all strategies. This is caught before any
strategy is attempted, skipping to greedy fallback immediately.

### Parallel Cluster Execution

```python
with ProcessPoolExecutor(max_workers=PARALLEL_CLUSTERS) as executor:
    tasks = [loop.run_in_executor(executor, _solve_cluster_worker, cluster_id, ...)]
    for coro in asyncio.as_completed(tasks):
        result_cid, cluster_solution, error_msg = await coro
```

`_solve_cluster_worker` is a **module-level function** (picklable). Thread budget:
`parallel_clusters × workers_per_cluster ≤ physical_cores`.

Falls back to sequential if available RAM < 2 GB.

---

## 8. Stage 2B — Genetic Algorithm Optimization

**File:** `backend/fastapi/engine/ga/optimizer.py`  
**Class:** `GeneticAlgorithmOptimizer`

### Purpose

GA takes the feasible CP-SAT solution and optimizes **soft constraints** — faculty
preferences, room utilization, schedule spread — generating **3 variant timetables**
with different optimization objectives.

### 3 Variants (Semantic Diversity Strategy)

| Variant | Label | Fitness Weights |
|---|---|---|
| 1 | Faculty-Friendly | faculty=55%, room=20%, spread=15%, student=10% |
| 2 | Room-Efficient | faculty=20%, room=55%, spread=15%, student=10% |
| 3 | Student-Spread | faculty=20%, room=20%, spread=45%, student=15% |

Each variant uses a different random seed (42, 55, 68) AND different fitness weights,
driving evolution toward genuinely different local optima — not just noise.

### Population Initialization (Stratified Mutation)

```
Population of 15 individuals:
  - 1  elite: exact CP-SAT solution (exploitation anchor)
  - 40% conservative (rate=0.05): fine-tune CP-SAT quality
  - 40% moderate (rate=0.15): standard exploration
  - 20% exploratory (rate=0.35): structural diversity
```

### Evolution Loop

```
For each generation (max 35):
    1. Evaluate fitness for all individuals
    2. Adaptive mutation: if variance < 1e-3 → boost rate × 2
    3. Elitism: keep top 20%
    4. Tournament selection → crossover → mutate → new generation
```

**`crossover()`** (`backend/fastapi/engine/ga/operators.py`): single-point crossover
on the solution dict. Offspring inherit assignments from different parents per course.

**`mutate()`**: randomly reassigns some courses to new (slot, room) pairs at the given
mutation rate.

### Stored Variant Record

```python
{
    'variant_id': 1,            # 1-indexed
    'seed': 42,
    'fitness': 87.3421,         # raw GA score
    'solution': {               # same format as CP-SAT solution dict
        (course_id, session): (time_slot_id, room_id), ...
    },
    'label': 'Faculty-Friendly',
    'weights': {'faculty': 0.55, ...},
}
```

---

## 9. Stage 3 — RL Conflict Refinement

**File:** `backend/fastapi/engine/rl/qlearning.py`  
**Class:** `SimpleTabularQLearning`

### Role (Strictly Limited)

> "When 2–5 valid swaps exist, learn which one is better."

RL is **NOT** used for:
- Global search or repair
- Feasibility checking
- Runtime learning (policy is frozen during generation)

### Q-Learning Details

| Parameter | Value |
|---|---|
| Algorithm | Tabular Q-learning with ε-greedy |
| State dimensions | 4–6 discrete dimensions |
| Max Q-table size | 10,000 entries (LRU eviction) |
| ε initial | 0.2 |
| ε decay | 0.99 per update |
| ε minimum | 0.01 |
| γ (discount) | 0.9 |
| α (learning rate) | 0.1 |

**DESIGN FREEZE:** `frozen=True` is always passed at runtime. `update_q_value()` is
a no-op when frozen. The policy loaded from `data/rl_policies/sem_{N}/*.pkl` was
trained offline.

**Reward function** (`backend/fastapi/engine/rl/reward_calculator.py`):
- Conflict reduced: `+1.0`
- Conflict increased: `-5.0`  
- No conflict change: `+0.2` (tiny improvement bonus)

### Current Status

```python
refined = solution  # TODO: Implement rl.refine_solution(solution)
```

The RL stage loads and freezes a policy but currently returns the solution unchanged.
The infrastructure is production-ready; refinement application is scheduled post-freeze.

---

## 10. Persist Results — DB + Redis Layout

### Internal Solution → Timetable Entry Conversion

```python
for (course_id, session), (t_slot_id, room_id) in final_solution.items():
    if t_slot_id == '__UNSCHEDULED__':
        continue    # skip greedy fallback entries
    entry = {
        'course_id':   course_id,
        'course_code': course.course_code,
        'course_name': course.course_name,
        'faculty_id':  course.faculty_id,
        'room_id':     room_id,
        'room_code':   room.room_code,
        'time_slot_id': str(t_slot_id),
        'day':          slot.day,          # 0-5
        'day_of_week':  slot.day_of_week,  # "Monday"
        'start_time':   slot.start_time,   # "09:00"
        'end_time':     slot.end_time,     # "10:00"
        'session_number': session,         # 0 to duration-1
        'student_ids':  [...],
        'batch_ids':    [...],
    }
```

### PostgreSQL Storage

`generation_jobs.timetable_data` (JSONB) stores the full payload:

```json
{
  "timetable_entries": [ ...all TimetableEntry objects... ],
  "total_sessions_scheduled": 8279,
  "total_courses": 2494,
  "variants_count": 3,
  "variants": [
    { "variant_id": 1, "label": "Faculty-Friendly", "score": 100.0, ... },
    { "variant_id": 2, "label": "Room-Efficient",   "score": 94.2, ... },
    { "variant_id": 3, "label": "Student-Spread",   "score": 89.7, ... }
  ],
  "generated_at": "2026-02-28T10:34:12Z"
}
```

### Redis Storage (lightweight only)

**Key:** `result:job:{job_id}` — TTL 24h

Redis stores **summaries only** — no `timetable_entries` rows. This was necessary because
the full payload exceeded the 10 MB Upstash Redis limit.

```json
{
  "timetable": {
    "total_sessions_scheduled": 8279,
    "total_courses": 2494,
    "variants_count": 3,
    "variants": [
      { "variant_id": 1, "label": "...", "score": 100.0, "conflicts": 0,
        "quality_metrics": {...}, "statistics": {...}  }
    ]
  },
  "variants": [ ...same lightweight variant list... ],
  "metadata": {
    "job_id": "...", "org_id": "...", "semester": 1,
    "total_entries": 8279, "generated_at": "..."
  }
}
```

### Cache Warm-up (Celery `fastapi_callback_task`)

After DB write, FastAPI enqueues `academics.celery_tasks.fastapi_callback_task`.
The Django Celery worker then writes:

| Redis Key | Content | TTL |
|---|---|---|
| `workflow_{job_id}` | Job metadata | 1h |
| `variants_list_{job_id}` | All variant summaries | 1h |
| `variant_entries_{job_id}-variant-{N}` | First 500 entries for variant N | 1h |

---

## 11. Variant Structure — Minute Detail

Each variant in `generation_jobs.timetable_data.variants[]` contains:

```json
{
  "variant_id": 1,
  "label": "Faculty-Friendly",

  "score": 100.0,
  "fitness": 112.8437,
  "conflicts": 0,
  "room_utilization": 67.3,

  "quality_metrics": {
    "overall_score": 100.0,
    "total_conflicts": 0,
    "room_utilization_score": 67.3
  },

  "statistics": {
    "total_classes": 8279,
    "total_conflicts": 0
  },

  "timetable_entries": [
    {
      "course_code":  "CS301",
      "subject_name": "Operating Systems",
      "faculty_id":   "uuid-of-faculty",
      "faculty_name": "Dr. Sharma",
      "room_id":      "uuid-of-room",
      "room_code":    "LH-201",
      "time_slot_id": "uuid-of-slot",
      "day":          0,
      "start_time":   "09:00",
      "end_time":     "10:00"
    },
    ...
  ]
}
```

### `score` vs `fitness`

- `fitness` = raw GA float (unbounded, higher = better, not comparable across runs)
- `score` = normalised to 0–100 relative to the best variant in this run  
  `score = (variant.fitness / max_fitness) × 100`

The best variant always has `score = 100.0`. Other variants' scores are proportional.

### `conflicts` Count

Built during `_build_variant_payload()`:

```python
# Faculty double-booking
fac_key = (faculty_id, time_slot_id)
if fac_key already seen → conflicts += 1

# Room double-booking  
room_key = (room_id, time_slot_id)
if room_key already seen → conflicts += 1
```

Any CP-SAT solution should have 0 conflicts because HC1 and HC2 are hard constraints.
GA mutations can temporarily introduce conflicts — the fitness function penalises them.

---

## 12. How a Timetable Entry is Built

The central data transformation in the entire pipeline:

```
PostgreSQL (raw DB rows)
    │
    ├─ courses c JOIN course_offerings co JOIN ce_agg
    │   → List[Course] objects with student_ids populated
    │
    ├─ timeslots
    │   → List[TimeSlot] with day/period/start_time/end_time
    │
    └─ rooms
        → List[Room] with capacity/features/room_code

            │
            ▼
    Louvain Clustering → clusters: List[List[Course]]
            │
            ▼
    CP-SAT Solver
    Variables: x_{course_id}_s{session}_t{slot}_r{room} ∈ {0,1}
    Constraints: HC1..HC6
    Output: {(course_id, session): (time_slot_id, room_id)}
            │
            ▼
    GA Optimizer (3 variants)
    Mutates & evaluates fitness
    Output: 3 × {(course_id, session): (time_slot_id, room_id)}
            │
            ▼
    _persist_results()
    For each (course, session) → (slot, room):
        Lookup: course from courses_by_id[course_id]
        Lookup: slot  from slot_by_id[str(t_slot_id)]
        Lookup: room  from rooms_by_id[room_id]
        Build TimetableEntry dict {course_code, faculty_id, room_code, day, ...}
            │
            ▼
    generation_jobs.timetable_data JSONB
    variants[N].timetable_entries[M] = TimetableEntry
```

---

## 13. Conflict Detection Pipeline

**File:** `backend/django/academics/services/conflict_service.py`  
**Triggered by:** `ConflictViewSet.detect()` — `GET /api/conflicts/detect/?job_id=<>&variant_id=<>`

### Detection Algorithm

```python
# Group all entries by (day, time_slot)
by_time[(day, time_slot)].append(entry)

# For each time slot:
# Faculty conflict: same faculty_name in >1 entry → CRITICAL
# Room conflict: same room_number in >1 entry → CRITICAL
```

**Conflict severity levels:**

| Type | Severity | Meaning |
|---|---|---|
| `faculty_conflict` | CRITICAL | Faculty double-booked |
| `room_conflict` | CRITICAL | Room double-booked |
| `student_conflict` | HIGH | Student in two classes |
| `capacity_violation` | MEDIUM | Room too small |
| `feature_mismatch` | LOW | Room missing required features |

### Conflict Object Shape

```json
{
  "type": "faculty_conflict",
  "severity": "critical",
  "day": "Monday",
  "time_slot": "09:00-10:00",
  "faculty": "Dr. Sharma",
  "courses": ["CS301", "CS401"],
  "rooms": ["LH-101", "LH-201"],
  "message": "Dr. Sharma assigned to 2 classes simultaneously",
  "suggestion": "Reschedule one class to different time slot"
}
```

### Apply / Acknowledge Flow

`POST /api/conflicts/apply/` with `{job_id, variant_id, conflict_index}`:

1. Reads `acknowledged_conflicts_{job_id}_{variant_id}` from Redis (default `[]`).
2. Appends `conflict_index` if not already present.
3. Stores back with 24-hour TTL.
4. `detect()` always appends `acknowledged_indices: [...]` to its response.

This is a **soft dismissal** — acknowledgement is stored per-user-session in Redis,
not in the timetable data itself.

---

## 14. Progress Tracking (SSE Flow)

**File:** `backend/fastapi/utils/progress_tracker.py`  
**Class:** `ProgressTracker`

### Progress Stage Weights

| Stage | Overall % Range | Triggers |
|---|---|---|
| `loading` | 0% → 5% | Data fetch complete |
| `clustering` | 5% → 15% | Cluster count |
| `cpsat_solving` | 15% → 75% | Per cluster completion |
| `ga_optimization` | 75% → 90% | Per GA generation per variant |
| `rl_refinement` | 90% → 100% | RL complete |

### Redis Progress Key

**Key:** `progress:job:{job_id}` — TTL 2h

```json
{
  "job_id": "...",
  "stage": "cpsat_solving",
  "stage_progress": 43.2,
  "overall_progress": 36.5,
  "status": "running",
  "eta_seconds": 127,
  "started_at": 1709123400,
  "last_updated": 1709123527,
  "metadata": {
    "total_items": 216,
    "completed_items": 94,
    "variant": 2,
    "generation": 15,
    "best_fitness": 84.3
  }
}
```

### SSE Delivery

Django's SSE endpoint (`/api/generation/{job_id}/progress/`) polls this Redis key
every ~2 seconds and streams events to the browser using Server-Sent Events.
The frontend upgrades from polling to SSE via `EventSource` on the progress page.

---

## 15. Django ORM Models

**File:** `backend/django/academics/models/timetable.py`

### `GenerationJob`

```python
class GenerationJob(models.Model):
    id           = UUIDField(primary_key=True)
    organization = ForeignKey(Organization)
    status       = CharField(choices=[
                     'pending', 'running', 'completed', 'failed',
                     'cancelling', 'cancelled', 'approved', 'rejected'
                   ])
    timetable_data = JSONField(null=True)    # Full payload: entries + variants
    progress     = IntegerField(0-100)
    academic_year = CharField
    semester     = IntegerField
    created_at   = DateTimeField(auto_now_add=True)
    updated_at   = DateTimeField(auto_now=True)
    completed_at = DateTimeField(null=True)
    error_message = TextField(null=True)
```

### `TimeSlot` (Django Model)

```python
class TimeSlot(models.Model):
    timeslot_id = UUIDField(primary_key=True)
    organization = ForeignKey(Organization)
    day_of_week = CharField  # 'monday', 'tuesday', ...
    start_time  = TimeField
    end_time    = TimeField
    slot_name   = CharField
    slot_order  = IntegerField
    is_available = BooleanField(default=True)
    is_break    = BooleanField(default=False)
    is_lunch    = BooleanField(default=False)
```

---

## 16. CP-SAT Constraint Catalogue

**File:** `backend/fastapi/engine/cpsat/constraints.py`

| Code | Name | Function | Description |
|---|---|---|---|
| **HC1** | Faculty Conflict | `add_faculty_constraints()` | `∀ (faculty, slot): sum(vars) ≤ 1` — no double-booking |
| **HC2** | Room Conflict | `add_room_constraints()` | `∀ (room, slot): sum(vars) ≤ 1` — one class per room per slot |
| **HC3** | Faculty Workload | `add_workload_constraints()` | `∀ faculty: sum(all_assigned_vars) ≤ max_hours_per_week` |
| **HC4** | Student Conflict | `add_student_constraints()` | `∀ (student, slot): sum(vars) ≤ 1` — no student time conflict |
| **HC5** | Max Sessions/Day | `add_max_sessions_per_day_constraints()` | Each course can appear at most N times per day (default 2) |
| **HC6** | Fixed Slots | `add_fixed_slot_constraints()` | Lab/special courses locked to specific slots |

**HC4 modes:**
- `"ALL"` — constrain every student (default, correct)
- `"CRITICAL"` — only students in 5+ courses this cluster (performance fallback)
- `"NONE"` — skip entirely (emergency mode only, can produce student conflicts)

**Performance optimizations in constraints:**

- `build_student_course_index()` — precomputes `{course_id: set(student_ids)}` **once**
  before the 216-cluster loop, eliminating per-cluster rebuild.
- `session_vars_index` — O(N) pass builds `{(course_id, session): [vars]}` for O(1) lookup
  instead of O(N²) scan.
- `_precompute_student_conflict_groups()` — precomputed once per cluster before strategy loop
  so every strategy retry costs O(actual_conflicts) not O(V×E).

---

## 17. GA Fitness Function

**File:** `backend/fastapi/engine/ga/fitness.py`

```
Total fitness = w_faculty × faculty_score
              + w_room    × room_score
              + w_spread  × spread_score
              + w_student × student_penalty_score
```

### Metric 1: Faculty Preferences (`_evaluate_faculty_preferences`)

- Period 0 (first slot of day): `-5.0`
- Period ≥ 7 (late): `-3.0`
- Period 1–5 (prime hours): `+1.0`

### Metric 2: Room Utilization (`_evaluate_room_utilization`)

- Room capacity close to class size: full score
- Room much larger than needed: penalty proportional to wasted capacity

### Metric 3: Peak Spreading (`_evaluate_peak_spreading`)

Prefers schedules where course sessions are spread across different days
rather than stacked. Penalizes multiple sessions of the same course on the same day.

### Metric 4: Student Conflict Penalty (`_evaluate_student_conflicts`)

Detects any students double-booked by GA mutations:
- `student_schedule[(student_id, slot)] → [course_id, ...]`
- Penalty `-10.0 × count_of_double_bookings`

**BUG 7 FIX:** `slot_id` is declared as `str` in the Pydantic model. All arithmetic
(modulo, comparison) now goes through `_safe_slot_int(t_slot_id)` to avoid TypeError.

---

## 18. End-to-End Data Flow Diagram

```
Browser: POST /api/generation/generate/
              │
              ▼
Django: TimetableWorkflowViewSet
  → Creates GenerationJob(status='pending') in PostgreSQL
  → Sets status='running'
  → Queues generate_timetable_task(job_id, org_id, semester)
  → Returns {job_id} to browser
              │
              ▼ (async via Celery worker)
Django Celery Worker: generate_timetable_task
  → POST http://fastapi:8001/api/generate_variants
  → Returns immediately (fire-and-forget)
              │
              ▼ (FastAPI BackgroundTask)
FastAPI: GenerationService.generate_timetable()
  → Creates TimetableGenerationSaga
  → Calls saga.execute(job_id, {org_id, semester})

SAGA STEP 1: _load_data (0%→5%)
  → DjangoAPIClient
  → asyncio.gather(5 parallel DB queries)
  → returns {courses[], faculty{}, rooms[], time_slots[], students[]}

SAGA STEP 2: _stage1_clustering (5%→15%)
  → LouvainClusterer.cluster_courses(courses)
  → Build weighted NetworkX graph
  → Run community_louvain.best_partition()
  → Optimize cluster sizes (5-15 courses each)
  → returns clusters: List[List[Course]]

SAGA STEP 3: _stage2_cpsat (15%→75%)
  → build_student_course_index(all_courses)           [OPT2]
  → ProcessPoolExecutor(_solve_cluster_worker × N)    [OPT1]
  → For each cluster:
      → AdaptiveCPSATSolver.solve_cluster(cluster)
      → _precompute_valid_domains()
      → Try strategy 1..4 until success:
          → create Boolean variables {x_course_sess_slot_room}
          → add HC1..HC6 constraints
          → solver.Solve()
      → fallback: __UNSCHEDULED__ sentinel
  → returns solution: {(course_id, session): (slot_id, room_id)}

SAGA STEP 4: _stage2b_ga (75%→90%)
  → For 3 variants (seed=42,55,68 / different fitness weights):
      → GeneticAlgorithmOptimizer(initial_solution, weights)
      → Initialize population (stratified mutation)
      → Evolve 35 generations (elitism + tournament + crossover + mutate)
      → Adaptive mutation (boost when variance < 1e-3)
  → returns best_solution (highest fitness across all variants)
  → stores all 3 variant records in self.job_data['variants']

SAGA STEP 5: _stage3_rl (90%→100%)
  → Load frozen policy (offline trained Q-table)
  → Currently returns solution unchanged (TODO: apply local swaps)

SAGA STEP 6: _persist_results (ATOMIC)
  → Convert solution dict → List[TimetableEntry dicts]
  → For each variant: _build_variant_payload()
      → Count faculty/room conflicts
      → Normalize score to 0-100
      → Build timetable_entries list
  → Redis: store lightweight summary (no entry rows)
  → PostgreSQL: UPDATE generation_jobs SET timetable_data = %s::jsonb
  → _enqueue_cache_warm_task(job_id)  → Celery warm-up

Celery cache_warm_task:
  → Reads variants from PostgreSQL
  → Writes variants_list_{job_id}, variant_entries_{job_id}-variant-{N} to Redis

Browser: GET /api/timetable/variants/{job_id}/entries/
  → Django TimetableVariantViewSet.entries()
  → Cache hit: returns variant_entries_{id} from Redis
  → Cache miss: reads timetable_data from PostgreSQL, converts, returns
```

---

## 19. Key Constants and Configuration

### GA Parameters

| Constant | Value | Location |
|---|---|---|
| `NUM_VARIANTS` | 3 | `saga.py` |
| `GA_POPULATION_SIZE` | 15 (max 25) | `config.py` + `optimizer.py` |
| `GA_GENERATIONS` | 20 (max 35) | `config.py` + `optimizer.py` |
| `ELITISM_RATE` | 0.2 (20%) | `optimizer.py` |
| `MUTATION_RATE` | 0.15 (default) | `optimizer.py` |
| `CROSSOVER_RATE` | 0.7 | `optimizer.py` |

### Clustering Parameters

| Constant | Value |
|---|---|
| `target_cluster_size` | 10 |
| `MAX_CLUSTER_SIZE` | 15 |
| `MIN_CLUSTER_SIZE` | 5 |
| `MERGE_SIZE` | 10 |

### CP-SAT Strategy Timeouts

| Strategy | Timeout |
|---|---|
| Full Constraints | 30s |
| Relaxed Student | 45s |
| Faculty + Room Only | 60s |
| Emergency | 120s |

### Progress Stage Weights

| Stage | Range |
|---|---|
| `loading` | 0–5% |
| `clustering` | 5–15% |
| `cpsat_solving` | 15–75% |
| `ga_optimization` | 75–90% |
| `rl_refinement` | 90–100% |

### Redis Keys Reference

| Key Pattern | Content | TTL |
|---|---|---|
| `progress:job:{id}` | Generation progress JSON | 2h |
| `result:job:{id}` | Lightweight result summary | 24h |
| `cancel:job:{id}` | Cancellation flag | 1h |
| `start_time:job:{id}` | ISO timestamp string | 1h |
| `workflow_{id}` | Job metadata | 1h |
| `variants_list_{id}` | All variant summaries | 1h |
| `variant_entries_{id}-variant-{N}` | First 500 entries for variant N | 1h |
| `conflicts_{id}_{variant_id}` | Detected conflicts | 10m |
| `acknowledged_conflicts_{id}_{variant_id}` | Acknowledged conflict indices | 24h |
| `ttdata:version:{org}:{sem}` | Cache version for invalidation | 24h |

---

*Document generated: February 28, 2026*  
*Covers: FastAPI engine (saga, cpsat, ga, rl, clustering), DjangoAPIClient, Django models, Celery tasks, conflict detection, progress tracking*
