from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .generation_views import GenerationJobViewSet
from .timetable_views import (
    fastapi_callback,
    get_department_timetable,
    get_faculty_timetable,
    get_student_timetable,
    get_progress,
)
from .workflow_views import TimetableWorkflowViewSet, TimetableVariantViewSet
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

urlpatterns = [
    path("", include(router.urls)),
    # New Attendance management routes (takes priority)
    path("attendance/", include("academics.attendance_urls")),
    # Timetable viewing endpoints (RBAC-based)
    path(
        "timetable/department/<str:dept_id>/",
        get_department_timetable,
        name="department-timetable",
    ),
    path("timetable/faculty/me/", get_faculty_timetable, name="faculty-timetable"),
    path("timetable/student/me/", get_student_timetable, name="student-timetable"),
    path("timetable/callback/", fastapi_callback, name="fastapi-callback"),
    path("progress/<str:job_id>/", get_progress, name="get-progress"),
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
]
