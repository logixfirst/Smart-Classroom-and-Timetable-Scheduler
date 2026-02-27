# Backend Refactoring Changelog
**Date:** February 27–28, 2026  
**Scope:** Django backend — `academics/`, `core/`, `erp/`  
**Principle:** Google/Meta SRP, layered architecture, proper package structure

---

## Phase 1 — Layer Violation Fix

### `academics/views_optimized.py` (now `views/fast_views.py`)
- **Violation fixed:** Raw `cache.get/set` calls in the API layer (infrastructure bypass)
- **Fix:** Replaced all 6 fast endpoints with `CacheService.get_or_set()` from `core/cache_service.py`
- **Rule enforced:** API layer must never call infrastructure directly; always go through service layer

---

## Phase 2 — SRP Splits (Single Responsibility Principle)

### `auth_views.py` — Split into 3 files

| Old (1 file, 558 lines) | New files |
|-------------------------|-----------|
| Login / logout / refresh / current_user | `views/auth_views.py` (~368 lines) |
| Password reset request / confirm / change | `views/password_views.py` (new) |
| Session list / revoke | `views/session_views.py` (new) |

- Removed unused imports from `auth_views.py`: `secrets`, `ValidationError`, `validate_password`

### `generation_views.py` — Extracted business logic to service

| Old | New |
|-----|-----|
| 120+ line business logic inside `generate_timetable` action | `services/generation_job_service.py` (new) |

**New service functions:**
- `resolve_time_config(org, academic_year, semester, form_config)` — priority-based time config resolution
- `create_generation_job(org, academic_year, semester, priority, time_config)` — DB job creation
- `enqueue_job_background(job, org_id, priority)` — non-blocking thread dispatch
- `_queue_to_fastapi(job, org_id)` — FastAPI integration
- `_queue_via_celery(job, priority)` — Celery fallback

Also fixed: `os.getenv("FASTAPI_AI_SERVICE_URL")` → `settings.FASTAPI_URL` in `cancel_generation`

### `workflow_views.py` — Split into 2 files

| Old (1 file, 400 lines) | New files |
|-------------------------|-----------|
| `TimetableWorkflowViewSet` (mutable: approve/reject) | `views/workflow_views.py` (~115 lines) |
| `TimetableVariantViewSet` (immutable: list/entries/select) | `views/timetable_variant_views.py` (new) |

---

## Phase 3 — Directory Restructure

### Files moved INTO `academics/views/`

| Old location (academics root) | New location | Notes |
|-------------------------------|-------------|-------|
| `generation_views.py` | `views/generation_views.py` | |
| `workflow_views.py` | `views/workflow_views.py` | |
| `timetable_variant_views.py` | `views/timetable_variant_views.py` | |
| `timetable_views.py` | `views/timetable_views.py` | |
| `progress_endpoints.py` | `views/progress_endpoints.py` | |
| `views_optimized.py` | `views/fast_views.py` | renamed |
| `conflict_views.py` | `views/conflict_views.py` | |
| `timetable_config_views.py` | `views/timetable_config_views.py` | |

All relative imports updated from `from .x` to `from ..x` (one package level up).

### Files moved INTO `academics/services/`

| Old location | New location |
|-------------|-------------|
| `conflict_service.py` | `services/conflict_service.py` |
| (new) `generation_job_service.py` | `services/generation_job_service.py` |

### Files moved INTO `academics/models/`

| Old location | New location | Import fix |
|-------------|-------------|-----------|
| `timetable_config_models.py` | `models/timetable_config.py` | `from .base import Organization` |

---

## Phase 4 — `__init__.py` Updates

### `academics/models/__init__.py`
- Added: `from .timetable_config import TimetableConfiguration`
- Added `TimetableConfiguration` to `__all__`

### `academics/services/__init__.py`
- Added: `from .conflict_service import ConflictDetectionService`
- Added: `from .generation_job_service import resolve_time_config, create_generation_job, enqueue_job_background`
- Updated `__all__`

### `academics/views/__init__.py`
- **Completely rewritten** — now the single source of truth for all view exports
- Exports all 20+ views/viewsets in grouped sections (Auth, Dashboard, ViewSets, Generation, Timetable, Progress, Fast, Conflict, Config)

### `academics/urls.py`
- **Simplified to a single import block:** `from .views import (...)` — replaces 7 separate import blocks that were pointing directly at scattered files

### `academics/timetable_config_serializers.py`
- Fixed stale import: `from .timetable_config_models import` → `from .models import`

---

## Phase 5 — Dead File Removal

| File deleted | Reason |
|-------------|--------|
| `erp/celery_settings.py` | Never imported anywhere. All config duplicated (with correct Redis DB indices) in `erp/settings.py` |

---

## Final Structure

```
academics/
├── models/
│   ├── base.py                   Organization, Building
│   ├── academic_structure.py     School, Department, Program
│   ├── course.py                 Course, CourseOffering, CourseEnrollment
│   ├── faculty.py                Faculty
│   ├── student.py                Student, Batch
│   ├── room.py                   Room, Classroom, Lab
│   ├── timetable.py              TimeSlot, GenerationJob, Timetable, TimetableSlot
│   ├── timetable_config.py       TimetableConfiguration  ← MOVED
│   ├── user.py                   User, UserSession
│   └── __init__.py               exports all models
│
├── services/
│   ├── conflict_service.py       ConflictDetectionService  ← MOVED
│   ├── department_view_service.py DepartmentViewService
│   ├── generation_job_service.py  resolve/create/enqueue  ← NEW
│   └── __init__.py               exports all services
│
├── views/
│   ├── auth_views.py             login, logout, refresh, current_user
│   ├── password_views.py         password reset/change  ← NEW
│   ├── session_views.py          session list/revoke  ← NEW
│   ├── dashboard_views.py        stats, profiles
│   ├── user_viewset.py           UserViewSet
│   ├── academic_viewsets.py      School/Dept/Program/Batch
│   ├── course_viewset.py         CourseViewSet
│   ├── faculty_viewset.py        FacultyViewSet
│   ├── student_viewset.py        StudentViewSet
│   ├── room_viewsets.py          Room/Building/Lab
│   ├── timetable_viewsets.py     Timetable/TimetableSlot
│   ├── generation_views.py       GenerationJobViewSet  ← MOVED
│   ├── workflow_views.py         TimetableWorkflowViewSet  ← MOVED+SPLIT
│   ├── timetable_variant_views.py TimetableVariantViewSet  ← NEW/MOVED
│   ├── timetable_views.py        per-role timetable endpoints  ← MOVED
│   ├── progress_endpoints.py     SSE progress streaming  ← MOVED
│   ├── fast_views.py             ultra-fast cached lists  ← MOVED+RENAMED
│   ├── conflict_views.py         ConflictViewSet  ← MOVED
│   ├── timetable_config_views.py TimetableConfigurationViewSet  ← MOVED
│   └── __init__.py               single export hub (rewritten)
│
├── urls.py                       one clean import block
├── mixins.py                     SmartCachedViewSet, DataSyncMixin, etc.
├── serializers.py
├── timetable_config_serializers.py
├── celery_tasks.py
├── signals.py
├── admin.py
└── apps.py
```

---

## Non-ASCII Character Cleanup

Replaced all non-ASCII punctuation (em dashes `—`, arrows `→`, smart quotes) with plain ASCII equivalents in all modified Python files. This prevents `UnicodeEncodeError` on Windows terminals and `charmap` codec failures.

**Files cleaned:** `generation_views.py`, `auth_views.py`, `password_views.py`, `session_views.py`, `generation_job_service.py`, `timetable_variant_views.py`, `workflow_views.py`

---

## Validation

All changes verified with:
```
python manage.py check
# System check identified no issues (0 silenced).
```
