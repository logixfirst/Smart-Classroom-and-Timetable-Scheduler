"""
Views package - all academic API views in one place.

Sub-modules by responsibility:
  auth_views.py           - login, logout, token refresh, current user
  password_views.py       - password reset + change
  session_views.py        - session list + revoke
  dashboard_views.py      - stats, faculty/student profiles
  user_viewset.py         - UserViewSet
  academic_viewsets.py    - School, Department, Program, Batch
  course_viewset.py       - CourseViewSet
  faculty_viewset.py      - FacultyViewSet
  student_viewset.py      - StudentViewSet
  room_viewsets.py        - Room, Building, Lab
  timetable_viewsets.py   - Timetable, TimetableSlot
  generation_views.py     - GenerationJobViewSet
  workflow_views.py       - TimetableWorkflowViewSet
  timetable_variant_views.py - TimetableVariantViewSet
  timetable_views.py      - per-role timetable endpoints + fastapi callback
  progress_endpoints.py   - SSE progress streaming
  fast_views.py           - ultra-fast cached list endpoints
  conflict_views.py       - ConflictViewSet
  timetable_config_views.py - TimetableConfigurationViewSet
"""

# ── Auth ─────────────────────────────────────────────────────────────────────
from .auth_views import (
    login_view,
    logout_view,
    current_user_view,
    refresh_token_view,
)
from .password_views import (
    password_reset_request_view,
    password_reset_confirm_view,
    password_change_view,
)
from .session_views import (
    list_sessions_view,
    revoke_session_view,
)

# ── Dashboard ─────────────────────────────────────────────────────────────────
from .dashboard_views import (
    dashboard_stats,
    student_profile_and_courses,
    faculty_profile_and_courses,
)

# ── Core ViewSets ─────────────────────────────────────────────────────────────
from .user_viewset import UserViewSet
from .academic_viewsets import (
    SchoolViewSet,
    DepartmentViewSet,
    ProgramViewSet,
    BatchViewSet,
)
from .course_viewset import CourseViewSet, SubjectViewSet
from .faculty_viewset import FacultyViewSet
from .student_viewset import StudentViewSet
from .room_viewsets import RoomViewSet, ClassroomViewSet, LabViewSet, BuildingViewSet
from .timetable_viewsets import TimetableViewSet, TimetableSlotViewSet

# ── Generation & Workflow ─────────────────────────────────────────────────────
from .generation_views import GenerationJobViewSet
from .workflow_views import TimetableWorkflowViewSet
from .timetable_variant_views import TimetableVariantViewSet

# ── Timetable display ─────────────────────────────────────────────────────────
from .timetable_views import (
    fastapi_callback,
    get_department_timetable,
    get_faculty_timetable,
    get_student_timetable,
)

# ── Progress / SSE ────────────────────────────────────────────────────────────
from .progress_endpoints import get_progress, stream_progress, health_check

# ── Fast (cached) endpoints ───────────────────────────────────────────────────
from .fast_views import (
    fast_generation_jobs,
    fast_faculty,
    fast_departments,
    fast_courses,
    fast_students,
    fast_rooms,
)

# ── Conflict detection ────────────────────────────────────────────────────────
from .conflict_views import ConflictViewSet

# ── Timetable configuration ───────────────────────────────────────────────────
from .timetable_config_views import TimetableConfigurationViewSet

__all__ = [
    # Auth
    'login_view', 'logout_view', 'current_user_view', 'refresh_token_view',
    'password_reset_request_view', 'password_reset_confirm_view', 'password_change_view',
    'list_sessions_view', 'revoke_session_view',
    # Dashboard
    'dashboard_stats', 'student_profile_and_courses', 'faculty_profile_and_courses',
    # ViewSets
    'UserViewSet', 'SchoolViewSet', 'DepartmentViewSet', 'ProgramViewSet', 'BatchViewSet',
    'CourseViewSet', 'SubjectViewSet', 'FacultyViewSet', 'StudentViewSet',
    'RoomViewSet', 'ClassroomViewSet', 'LabViewSet', 'BuildingViewSet',
    'TimetableViewSet', 'TimetableSlotViewSet',
    # Generation & workflow
    'GenerationJobViewSet', 'TimetableWorkflowViewSet', 'TimetableVariantViewSet',
    # Timetable display
    'fastapi_callback', 'get_department_timetable', 'get_faculty_timetable', 'get_student_timetable',
    # Progress
    'get_progress', 'stream_progress', 'health_check',
    # Fast endpoints
    'fast_generation_jobs', 'fast_faculty', 'fast_departments',
    'fast_courses', 'fast_students', 'fast_rooms',
    # Conflict
    'ConflictViewSet',
    # Config
    'TimetableConfigurationViewSet',
]
