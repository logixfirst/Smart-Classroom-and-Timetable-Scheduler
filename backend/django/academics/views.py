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
from .models import (
    User, Department, Course, Subject, Faculty, Student,
    Batch, Classroom, Lab, Timetable, TimetableSlot, Attendance
)
from .serializers import (
    UserSerializer, DepartmentSerializer, CourseSerializer, SubjectSerializer,
    FacultySerializer, StudentSerializer, BatchSerializer, ClassroomSerializer,
    LabSerializer, TimetableSerializer, TimetableSlotSerializer, AttendanceSerializer
)

class CachedModelViewSet(viewsets.ModelViewSet):
    """Base ViewSet with caching and cache invalidation"""
    
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    def invalidate_cache(self):
        """Clear related cache when data changes"""
        try:
            # Clear all cached pages - this ensures fresh data after changes
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            
            # Delete all cache keys with our prefix
            pattern = "sih28:1:views.decorators.cache.cache_page*"
            keys = redis_conn.keys(pattern)
            if keys:
                redis_conn.delete(*keys)
                
        except Exception as e:
            # Fallback: clear entire cache if pattern delete fails
            try:
                cache.clear()
            except:
                pass  # Ignore cache errors
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        self.invalidate_cache()
        return response
    
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        self.invalidate_cache()
        return response
    
    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        self.invalidate_cache()
        return response
    
    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        self.invalidate_cache()
        return response

class UserViewSet(CachedModelViewSet):
    queryset = User.objects.all().order_by('id').only(
        'id', 'username', 'email', 'role', 'department', 
        'first_name', 'last_name', 'is_active'
    )
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'department']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['id', 'username', 'role']
    
    def get_queryset(self):
        """Optimize queryset with defer for better performance"""
        return super().get_queryset()

class DepartmentViewSet(CachedModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['department_name', 'department_id']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class CourseViewSet(CachedModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['level', 'duration_years']
    search_fields = ['course_name', 'course_id']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class SubjectViewSet(CachedModelViewSet):
    queryset = Subject.objects.select_related('course', 'department').all().order_by('subject_id')
    serializer_class = SubjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'department']
    search_fields = ['subject_name', 'subject_id']
    ordering_fields = ['subject_id', 'subject_name']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class FacultyViewSet(CachedModelViewSet):
    queryset = Faculty.objects.select_related('department').order_by('faculty_id')
    serializer_class = FacultySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'designation']
    search_fields = ['faculty_name', 'faculty_id', 'email', 'specialization']
    ordering_fields = ['faculty_id', 'faculty_name']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def timetable(self, request, pk=None):
        faculty = self.get_object()
        slots = TimetableSlot.objects.filter(faculty=faculty)
        serializer = TimetableSlotSerializer(slots, many=True)
        return Response(serializer.data)

class StudentViewSet(CachedModelViewSet):
    queryset = Student.objects.select_related(
        'department', 'course', 'faculty_advisor'
    ).only(
        'student_id', 'name', 'email', 'phone', 'electives', 'year', 'semester',
        'department__department_id', 'department__department_name', 
        'department__building_name', 'department__head_of_department',
        'course__course_id', 'course__course_name', 'course__duration_years', 'course__level',
        'faculty_advisor__faculty_id', 'faculty_advisor__faculty_name'
    ).order_by('student_id')
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'course', 'semester', 'year']
    search_fields = ['name', 'student_id', 'email']
    ordering_fields = ['student_id', 'name', 'year', 'semester']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def attendance(self, request, pk=None):
        student = self.get_object()
        attendance = Attendance.objects.filter(student=student)
        serializer = AttendanceSerializer(attendance, many=True)
        return Response(serializer.data)

class BatchViewSet(CachedModelViewSet):
    queryset = Batch.objects.select_related('course', 'department').all().order_by('batch_id')
    serializer_class = BatchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'department', 'semester', 'year']
    search_fields = ['batch_id']
    ordering_fields = ['batch_id', 'year', 'semester']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class ClassroomViewSet(CachedModelViewSet):
    queryset = Classroom.objects.select_related('department').all().order_by('room_id')
    serializer_class = ClassroomSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'room_type']
    search_fields = ['room_number', 'room_id']
    ordering_fields = ['room_id', 'capacity']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class LabViewSet(CachedModelViewSet):
    queryset = Lab.objects.select_related('department').all().order_by('lab_id')
    serializer_class = LabSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department']
    ordering_fields = ['lab_id', 'capacity']
    search_fields = ['lab_name', 'lab_id']
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class TimetableViewSet(CachedModelViewSet):
    queryset = Timetable.objects.select_related(
        'department', 'batch', 'generation_job', 'created_by'
    ).prefetch_related('slots').all()
    serializer_class = TimetableSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['department', 'batch', 'semester', 'academic_year', 'status']
    
    @action(detail=True, methods=['get'])
    def slots(self, request, pk=None):
        timetable = self.get_object()
        slots = TimetableSlot.objects.filter(timetable=timetable)
        serializer = TimetableSlotSerializer(slots, many=True)
        return Response(serializer.data)

class TimetableSlotViewSet(CachedModelViewSet):
    queryset = TimetableSlot.objects.select_related(
        'timetable', 'subject', 'faculty', 'classroom'
    ).all()
    serializer_class = TimetableSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['timetable', 'subject', 'faculty', 'classroom', 'day']

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related(
        'student', 'slot', 'marked_by'
    ).all()
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'slot', 'is_present', 'date']


# Authentication Views
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login endpoint - accepts username and password, returns token and user data
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Please provide both username and password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'error': 'Invalid username or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get or create token
    token, created = Token.objects.get_or_create(user=user)
    
    # Return user data and token
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'department': user.department
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint - deletes the user's token
    """
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Successfully logged out'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user details
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'department': user.department
    })
