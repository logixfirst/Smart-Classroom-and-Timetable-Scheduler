"""
Views package - Modular structure following Google/Meta best practices

This package splits the original 810-line views.py god file into:
- auth_views.py (260 lines) - Login, logout, token refresh, current user
- dashboard_views.py (230 lines) - Dashboard stats, student/faculty profiles
- user_viewset.py (15 lines) - UserViewSet
- academic_viewsets.py (60 lines) - School, Department, Program, Batch ViewSets
- course_viewset.py (20 lines) - CourseViewSet
- faculty_viewset.py (50 lines) - FacultyViewSet
- student_viewset.py (65 lines) - StudentViewSet
- room_viewsets.py (50 lines) - Room, Building, Lab ViewSets
- timetable_viewsets.py (40 lines) - Timetable, TimetableSlot ViewSets

All imports preserved for backward compatibility.
"""

# Authentication views
from .auth_views import (
    login_view,
    logout_view,
    current_user_view,
    refresh_token_view,
)

# Dashboard views
from .dashboard_views import (
    dashboard_stats,
    student_profile_and_courses,
    faculty_profile_and_courses,
)

# ViewSets
from .user_viewset import UserViewSet
from .academic_viewsets import (
    SchoolViewSet,
    DepartmentViewSet,
    ProgramViewSet,
    BatchViewSet,
)
from .course_viewset import (
    CourseViewSet,
    SubjectViewSet,  # Backward compat alias
)
from .faculty_viewset import FacultyViewSet
from .student_viewset import StudentViewSet
from .room_viewsets import (
    RoomViewSet,
    ClassroomViewSet,  # Backward compat alias
    LabViewSet,
    BuildingViewSet,
)
from .timetable_viewsets import (
    TimetableViewSet,
    TimetableSlotViewSet,
)

# Export all for backward compatibility
__all__ = [
    # Auth views
    'login_view',
    'logout_view',
    'current_user_view',
    'refresh_token_view',
    # Dashboard views
    'dashboard_stats',
    'student_profile_and_courses',
    'faculty_profile_and_courses',
    # ViewSets
    'UserViewSet',
    'SchoolViewSet',
    'DepartmentViewSet',
    'ProgramViewSet',
    'BatchViewSet',
    'CourseViewSet',
    'SubjectViewSet',
    'FacultyViewSet',
    'StudentViewSet',
    'RoomViewSet',
    'ClassroomViewSet',
    'LabViewSet',
    'BuildingViewSet',
    'TimetableViewSet',
    'TimetableSlotViewSet',
]
