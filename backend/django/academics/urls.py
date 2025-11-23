from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .generation_views import GenerationJobViewSet
from .timetable_views import (
    fastapi_callback,
    get_department_timetable,
    get_faculty_timetable,
    get_student_timetable,
)
from .views import (  # AttendanceViewSet - Old attendance system, replaced by attendance_urls
    BatchViewSet,
    ClassroomViewSet,
    CourseViewSet,
    DepartmentViewSet,
    FacultyViewSet,
    LabViewSet,
    StudentViewSet,
    SubjectViewSet,
    TimetableSlotViewSet,
    TimetableViewSet,
    UserViewSet,
    current_user_view,
    login_view,
    logout_view,
    refresh_token_view,
)

router = DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(
    r"courses", CourseViewSet, basename="course"
)  # CourseViewSet is an alias for ProgramViewSet
router.register(
    r"programs", CourseViewSet, basename="program"
)  # Same ViewSet, different URL
router.register(r"subjects", SubjectViewSet)
router.register(r"faculty", FacultyViewSet)
router.register(r"students", StudentViewSet)
router.register(r"batches", BatchViewSet)
router.register(r"classrooms", ClassroomViewSet)
router.register(r"labs", LabViewSet, basename="lab")  # Labs now use Classroom model
router.register(r"timetables", TimetableViewSet)
router.register(r"timetable-slots", TimetableSlotViewSet)
# Old attendance ViewSet - commented out in favor of new attendance system
# router.register(r"attendance", AttendanceViewSet)
router.register(r"generation-jobs", GenerationJobViewSet, basename="generation-job")

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
    # Auth endpoints - CSRF exempt via APICSRFExemptMiddleware
    path("auth/login/", login_view, name="login"),
    path("auth/login", login_view, name="login-no-slash"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/logout", logout_view, name="logout-no-slash"),
    path("auth/refresh/", refresh_token_view, name="refresh-token"),
    path("auth/refresh", refresh_token_view, name="refresh-token-no-slash"),
    path("auth/me/", current_user_view, name="current-user"),
    path("auth/me", current_user_view, name="current-user-no-slash"),
]
