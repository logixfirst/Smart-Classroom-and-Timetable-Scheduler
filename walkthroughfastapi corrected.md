# FastAPI Engine — Bug Fix Walkthrough

## Summary
All 8 requested fixes applied across 6 files. Zero new files created.

---

## Files Modified

| File | Fixes Applied |
|------|--------------|
| [engine/ga/fitness.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/ga/fitness.py) | BUG 7, BUG 3 |
| [engine/cpsat/constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | BUG 1, BUG 2, MISS 6, MISS 2 |
| [engine/cpsat/solver.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/solver.py) | Wired all new constraints + HC-numbered docs |
| [engine/cpsat/strategies.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/strategies.py) | Added 4-level progressive relaxation with workload + per-day flags |
| [utils/django_client.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/utils/django_client.py) | BUG 4 |
| [core/patterns/saga.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/core/patterns/saga.py) | ISS 5, MISS 1 |

---

## BUG 7 — [fitness.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/ga/fitness.py) Runtime Crash (`t_slot_id % 10` on str)

**Root cause**: `TimeSlot.slot_id` is [str](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/django/academics/models/academic_structure.py#140-142) in the Pydantic model. The old fitness used `t_slot_id % 10` which throws `TypeError` on every fitness evaluation, crashing the entire GA.

**Fix in [fitness.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/ga/fitness.py)**:
- Replaced raw arithmetic with `slot_by_id` dict lookup (str → TimeSlot object)
- Used `slot.period` (int field on TimeSlot) for period-based preference scoring
- Added [_safe_slot_int()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/ga/fitness.py#69-78) helper for any other callers

---

## BUG 1 — Student Conflicts Completely Skipped

**Root cause**: Both branches of [add_student_constraints()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py#127-204) did `return 0` with a `TODO`. Students could be double-booked.

**Fix in [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py)**:
```python
# Build: (student_id, t_slot_id) → list of CP-SAT vars
student_schedule[(student_id, t_slot_id)].append(var)
# For each student+slot with >1 assignment: model.Add(sum(vars) <= 1)
```
Supports 3 modes: `ALL`, `CRITICAL` (5+ courses only, for large clusters), `NONE` (emergency only).

---

## BUG 2 — Faculty Workload Removed, Never Replaced

**Root cause**: Workload constraints were "moved to pre-clustering" but no clustering code enforced them. Faculty could be assigned 40+ hours/week.

**Fix in [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py)**:
```python
# Group all session vars by faculty (O(N) index)
# model.Add(sum(faculty_vars) <= max_hours_per_week)
```
O(N) approach (not O(N²)). Applied as `HC3` in solver.

---

## BUG 4 — Room Features Always `[]`

**Root cause**: `django_client.fetch_rooms()` always set `features=[]` regardless of DB contents.

**Fix in [django_client.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/utils/django_client.py)**:
- Added `features, allow_cross_department_usage` to the SQL query
- Parses PostgreSQL array format `{projector,whiteboard}` → Python `['projector', 'whiteboard']`
- Sets `allow_cross_department_usage` as dynamic attribute on Room object

---

## MISS 2 — Fixed/Special Slots Not Supported

**Fix in [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py)**: New [add_fixed_slot_constraints()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py#251-322) function.

Protocol: encode a fixed slot in `course.required_features` as `"fixed_slot:5"` (slot_id=5).
The constraint forces all other slots to 0 and requires exactly one room at the fixed slot.

---

## MISS 6 — No Max Sessions Per Day

**Fix in [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py)**: New [add_max_sessions_per_day_constraints()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py#206-249) function (HC5).

```python
# For each (course, day): model.Add(sum(day_vars) <= max_sessions_per_day)
```
Default max = 2 sessions/course/day. Configurable per [AdaptiveCPSATSolver(max_sessions_per_day=N)](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/solver.py#28-305).

---

## ISS 5 — Final Timetable Never Saved to Django

**Root cause**: STEP 6 of the saga was `# TODO: Save to database` / `pass`. The [GenerationJob](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/django/academics/models/timetable.py#62-101) status was never set to `completed` and `timetable_data` was never written.

**Fix in [saga.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/core/patterns/saga.py)**: New [_persist_results()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/core/patterns/saga.py#484-649) method that:
1. Converts internal [(course_id, session) → (slot, room)](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/django/academics/models/course.py#124-131) dict to structured JSON
2. Redis `SET result:job:{job_id}` with 24h TTL (for variants API)
3. PostgreSQL `UPDATE generation_jobs SET status='completed', timetable_data=%s`

Also implemented [_compensate()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/core/patterns/saga.py#650-703) (was also `TODO`) to mark failed jobs with `status='failed'`.

---

## MISS 1 — Only 1 Timetable Generated

**Fix in [saga.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/core/patterns/saga.py)**: [_stage2b_ga()](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/core/patterns/saga.py#372-447) now runs GA **3 times** with different seeds (42, 55, 68) to produce 3 distinct timetable variants.

```python
NUM_VARIANTS = 3
for variant_idx in range(NUM_VARIANTS):
    seed = 42 + variant_idx * 13
    random.seed(seed)
    optimized = optimizer.optimize()
    variants.append({'variant_id': ..., 'label': ..., 'fitness': ..., 'solution': ...})
```

All 3 variants stored in `result:job:{job_id}` in Redis. Admin UI can display all 3 for the user to choose.

---

## Constraint Architecture Summary

| HC | Name | File | Status |
|----|------|------|--------|
| HC1 | Faculty conflicts | [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | ✅ Was working |
| HC2 | Room conflicts | [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | ✅ Was working |
| HC3 | Faculty workload | [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | 🔧 Re-added (BUG 2) |
| HC4 | Student conflicts | [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | 🔧 Implemented (BUG 1) |
| HC5 | Max sessions/day | [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | ✨ New (MISS 6) |
| HC6 | Fixed slots | [constraints.py](file:///d:/GitHub/Smart-Classroom-and-Timetable-Scheduler/backend/fastapi/engine/cpsat/constraints.py) | ✨ New (MISS 2) |
