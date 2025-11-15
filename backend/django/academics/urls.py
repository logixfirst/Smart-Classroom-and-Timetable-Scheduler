from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    DepartmentViewSet,
    CourseViewSet,
    SubjectViewSet,
    FacultyViewSet,
    StudentViewSet,
    BatchViewSet,
    ClassroomViewSet,
    LabViewSet,
    TimetableViewSet,
    TimetableSlotViewSet,
    AttendanceViewSet,
    login_view,
    logout_view,
    current_user_view,
)
from .generation_views import GenerationJobViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"courses", CourseViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"faculty", FacultyViewSet)
router.register(r"students", StudentViewSet)
router.register(r"batches", BatchViewSet)
router.register(r"classrooms", ClassroomViewSet)
router.register(r"labs", LabViewSet)
router.register(r"timetables", TimetableViewSet)
router.register(r"timetable-slots", TimetableSlotViewSet)
router.register(r"attendance", AttendanceViewSet)
router.register(r"generation-jobs", GenerationJobViewSet, basename="generation-job")

urlpatterns = [
    path("", include(router.urls)),
    # Auth endpoints - support both with and without trailing slash
    path("auth/login/", login_view, name="login"),
    path("auth/login", login_view, name="login-no-slash"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/logout", logout_view, name="logout-no-slash"),
    path("auth/me/", current_user_view, name="current-user"),
    path("auth/me", current_user_view, name="current-user-no-slash"),
]
