from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache

from django_filters.rest_framework import DjangoFilterBackend
from .mixins import SmartCachedViewSet, DataSyncMixin, PerformanceMetricsMixin
from .models import (
    User,
    Department,
    Course,
    Subject,
    Faculty,
    Student,
    Batch,
    Classroom,
    Lab,
    Timetable,
    TimetableSlot,
    Attendance,
)
from .serializers import (
    UserSerializer,
    DepartmentSerializer,
    CourseSerializer,
    SubjectSerializer,
    FacultySerializer,
    StudentSerializer,
    BatchSerializer,
    ClassroomSerializer,
    LabSerializer,
    TimetableSerializer,
    TimetableSlotSerializer,
    AttendanceSerializer,
)


# =============================
# VIEWSETS WITH SMART CACHING
# =============================


class UserViewSet(DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet):
    """
    Enhanced User ViewSet with automatic sync to Faculty/Student
    and intelligent caching
    """
    queryset = (
        User.objects.all()
        .order_by("id")
        .only(
            "id",
            "username",
            "email",
            "role",
            "department",
            "first_name",
            "last_name",
            "is_active",
        )
    )
    serializer_class = UserSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["role", "department"]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["id", "username", "role"]
    
    def get_model_stats(self, queryset):
        """Additional stats for User model"""
        return {
            'by_role': {
                'admin': queryset.filter(role='admin').count(),
                'faculty': queryset.filter(role='faculty').count(),
                'staff': queryset.filter(role='staff').count(),
                'student': queryset.filter(role='student').count(),
            },
            'active_users': queryset.filter(is_active=True).count()
        }


class DepartmentViewSet(SmartCachedViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["department_name", "department_id"]
    cache_timeout = 900  # 15 minutes


class CourseViewSet(SmartCachedViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["level", "duration_years"]
    search_fields = ["course_name", "course_id"]
    cache_timeout = 900  # 15 minutes


class SubjectViewSet(SmartCachedViewSet):
    queryset = (
        Subject.objects.select_related("course", "department")
        .all()
        .order_by("subject_id")
    )
    serializer_class = SubjectSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["course", "department"]
    search_fields = ["subject_name", "subject_id"]
    ordering_fields = ["subject_id", "subject_name"]
    cache_timeout = 600  # 10 minutes


class FacultyViewSet(DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet):
    """
    Enhanced Faculty ViewSet with automatic sync to User
    and intelligent caching
    """
    queryset = Faculty.objects.select_related("department").order_by("faculty_id")
    serializer_class = FacultySerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["department", "designation"]
    search_fields = ["faculty_name", "faculty_id", "email", "specialization"]
    ordering_fields = ["faculty_id", "faculty_name"]

    @action(detail=True, methods=["get"])
    def timetable(self, request, pk=None):
        faculty = self.get_object()
        slots = TimetableSlot.objects.filter(faculty=faculty)
        serializer = TimetableSlotSerializer(slots, many=True)
        return Response(serializer.data)
    
    def get_model_stats(self, queryset):
        """Additional stats for Faculty model"""
        from django.db.models import Avg
        return {
            'by_department': {
                dept: queryset.filter(department__department_id=dept).count()
                for dept in queryset.values_list('department__department_id', flat=True).distinct()
            },
            'avg_workload': queryset.aggregate(Avg('max_workload_per_week'))['max_workload_per_week__avg']
        }


class StudentViewSet(DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet):
    """
    Enhanced Student ViewSet with automatic sync to User
    and intelligent caching
    """
    queryset = (
        Student.objects.select_related("department", "course", "faculty_advisor")
        .only(
            "student_id",
            "name",
            "email",
            "phone",
            "electives",
            "year",
            "semester",
            "department__department_id",
            "department__department_name",
            "department__building_name",
            "department__head_of_department",
            "course__course_id",
            "course__course_name",
            "course__duration_years",
            "course__level",
            "faculty_advisor__faculty_id",
            "faculty_advisor__faculty_name",
        )
        .order_by("student_id")
    )
    serializer_class = StudentSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["department", "course", "semester", "year"]
    search_fields = ["name", "student_id", "email"]
    ordering_fields = ["student_id", "name", "year", "semester"]

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        student = self.get_object()
        attendance = Attendance.objects.filter(student=student)
        serializer = AttendanceSerializer(attendance, many=True)
        return Response(serializer.data)
    
    def get_model_stats(self, queryset):
        """Additional stats for Student model"""
        return {
            'by_year': {
                year: queryset.filter(year=year).count()
                for year in range(1, 5)
            },
            'by_semester': {
                sem: queryset.filter(semester=sem).count()
                for sem in range(1, 9)
            },
            'by_course': {
                course: queryset.filter(course__course_id=course).count()
                for course in queryset.values_list('course__course_id', flat=True).distinct()
            }
        }


class BatchViewSet(SmartCachedViewSet):
    queryset = (
        Batch.objects.select_related("course", "department").all().order_by("batch_id")
    )
    serializer_class = BatchSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["course", "department", "semester", "year"]
    search_fields = ["batch_id"]
    ordering_fields = ["batch_id", "year", "semester"]
    cache_timeout = 600  # 10 minutes


class ClassroomViewSet(SmartCachedViewSet):
    queryset = Classroom.objects.select_related("department").all().order_by("room_id")
    serializer_class = ClassroomSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["department", "room_type"]
    search_fields = ["room_number", "room_id"]
    ordering_fields = ["room_id", "capacity"]
    cache_timeout = 900  # 15 minutes


class LabViewSet(SmartCachedViewSet):
    queryset = Lab.objects.select_related("department").all().order_by("lab_id")
    serializer_class = LabSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["department"]
    ordering_fields = ["lab_id", "capacity"]
    search_fields = ["lab_name", "lab_id"]
    cache_timeout = 900  # 15 minutes


class TimetableViewSet(SmartCachedViewSet):
    queryset = (
        Timetable.objects.select_related(
            "department", "batch", "generation_job", "created_by"
        )
        .prefetch_related("slots")
        .all()
    )
    serializer_class = TimetableSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["department", "batch", "semester", "academic_year", "status"]
    cache_timeout = 300  # 5 minutes

    @action(detail=True, methods=["get"])
    def slots(self, request, pk=None):
        timetable = self.get_object()
        slots = TimetableSlot.objects.filter(timetable=timetable)
        serializer = TimetableSlotSerializer(slots, many=True)
        return Response(serializer.data)


class TimetableSlotViewSet(SmartCachedViewSet):
    queryset = TimetableSlot.objects.select_related(
        "timetable", "subject", "faculty", "classroom"
    ).all()
    serializer_class = TimetableSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["timetable", "subject", "faculty", "classroom", "day"]
    cache_timeout = 300  # 5 minutes


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("student", "slot", "marked_by").all()
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "slot", "is_present", "date"]


# Authentication Views
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login endpoint - accepts username/email and password, returns token and user data
    """
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Please provide both username and password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Try authenticating with username first
    user = authenticate(username=username, password=password)
    
    # If failed and username looks like email, try finding user by email
    if user is None and '@' in username:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass

    if user is None:
        return Response(
            {"error": "Invalid username/email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Get or create token
    token, created = Token.objects.get_or_create(user=user)

    # Return user data and token
    return Response(
        {
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "department": user.department,
            },
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint - deletes the user's token
    """
    try:
        request.user.auth_token.delete()
        return Response({"message": "Successfully logged out"})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user details
    """
    user = request.user
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "department": user.department,
        }
    )
