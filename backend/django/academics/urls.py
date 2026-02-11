from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .generation_views import GenerationJobViewSet
from .timetable_views import (
    fastapi_callback,
    get_department_timetable,
    get_faculty_timetable,
    get_student_timetable,
)
from .progress_endpoints import get_progress, stream_progress, health_check
from .workflow_views import TimetableWorkflowViewSet, TimetableVariantViewSet
from .timetable_config_views import TimetableConfigurationViewSet
from .conflict_views import ConflictViewSet
from .views_optimized import (
    fast_generation_jobs,
    fast_faculty,
    fast_departments,
    fast_courses,
    fast_students,
    fast_rooms,
)
from .views import (
    BatchViewSet,
    BuildingViewSet,
    CourseViewSet,
    DepartmentViewSet,
    FacultyViewSet,
    LabViewSet,
    ProgramViewSet,
    RoomViewSet,
    SchoolViewSet,
    StudentViewSet,
    TimetableSlotViewSet,
    TimetableViewSet,
    UserViewSet,
    current_user_view,
    dashboard_stats,
    faculty_profile_and_courses,
    student_profile_and_courses,
    login_view,
    logout_view,
    refresh_token_view,
)

router = DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"programs", ProgramViewSet, basename="program")
router.register(r"subjects", CourseViewSet, basename="subject")  # Alias for courses
router.register(r"faculty", FacultyViewSet)
router.register(r"students", StudentViewSet)
router.register(r"batches", BatchViewSet, basename="batch")
router.register(r"rooms", RoomViewSet, basename="room")
router.register(r"classrooms", RoomViewSet, basename="classroom")  # Alias for rooms
router.register(r"labs", LabViewSet, basename="lab")
router.register(r"buildings", BuildingViewSet, basename="building")
router.register(r"schools", SchoolViewSet, basename="school")
router.register(r"timetables", TimetableViewSet)
router.register(r"timetable-slots", TimetableSlotViewSet)
router.register(r"generation-jobs", GenerationJobViewSet, basename="generation-job")
router.register(r"timetable/workflows", TimetableWorkflowViewSet, basename="workflow")
router.register(r"timetable/variants", TimetableVariantViewSet, basename="variant")
router.register(r"timetable-configs", TimetableConfigurationViewSet, basename="timetable-config")
router.register(r"conflicts", ConflictViewSet, basename="conflict")

urlpatterns = [
    # Faculty and Student profile - MUST be before router to avoid conflict
    path("faculty/profile/", faculty_profile_and_courses, name="faculty-profile"),
    path("student/profile/", student_profile_and_courses, name="student-profile"),
    # Timetable viewing endpoints (RBAC-based)
    path(
        "timetable/department/<str:dept_id>/",
        get_department_timetable,
        name="department-timetable",
    ),
    path("timetable/faculty/me/", get_faculty_timetable, name="faculty-timetable"),
    path("timetable/student/me/", get_student_timetable, name="student-timetable"),
    path("timetable/callback/", fastapi_callback, name="fastapi-callback"),
    # Progress tracking endpoints (Enterprise SSE pattern)
    path("generation/progress/<str:job_id>/", get_progress, name="generation-progress"),
    path("generation/stream/<str:job_id>/", stream_progress, name="generation-stream"),
    path("generation/health/", health_check, name="generation-health"),
    # Auth endpoints - CSRF exempt via APICSRFExemptMiddleware
    path("auth/login/", login_view, name="login"),
    path("auth/login", login_view, name="login-no-slash"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/logout", logout_view, name="logout-no-slash"),
    path("auth/refresh/", refresh_token_view, name="refresh-token"),
    path("auth/refresh", refresh_token_view, name="refresh-token-no-slash"),
    path("auth/me/", current_user_view, name="current-user"),
    path("auth/me", current_user_view, name="current-user-no-slash"),
    # Dashboard stats
    path("dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    # PERFORMANCE: Ultra-fast endpoints
    path("fast/jobs/", fast_generation_jobs, name="fast-jobs"),
    path("fast/faculty/", fast_faculty, name="fast-faculty"),
    path("fast/departments/", fast_departments, name="fast-departments"),
    path("fast/courses/", fast_courses, name="fast-courses"),
    path("fast/students/", fast_students, name="fast-students"),
    path("fast/rooms/", fast_rooms, name="fast-rooms"),
    # Router URLs (keep at end to avoid conflicts with specific paths above)
    path("", include(router.urls)),
]
