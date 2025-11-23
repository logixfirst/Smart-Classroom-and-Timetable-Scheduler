"""
Attendance Management URL Configuration
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .attendance_views import AttendanceSessionViewSet, StudentAttendanceViewSet
from .attendance_views_admin import (
    AdminAttendanceViewSet,
    AttendanceAlertViewSet,
    FacultyAttendanceViewSet,
)

router = DefaultRouter()
router.register(r"sessions", AttendanceSessionViewSet, basename="attendance-session")
router.register(r"students", StudentAttendanceViewSet, basename="attendance-student")
router.register(r"faculty", FacultyAttendanceViewSet, basename="attendance-faculty")
router.register(r"admin", AdminAttendanceViewSet, basename="attendance-admin")
router.register(r"alerts", AttendanceAlertViewSet, basename="attendance-alert")

urlpatterns = [
    path("", include(router.urls)),
]
