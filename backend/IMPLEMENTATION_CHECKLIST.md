# ✅ Timetable System - Implementation Checklist

## 📊 Current Status

### ✅ IMPLEMENTED (Django Backend)

**Models** (`academics/models.py`):
- ✅ Organization, Campus, School, Department
- ✅ Program, Subject, Faculty, Student, Batch
- ✅ Classroom, TimeSlot
- ✅ User (with RBAC: admin, hod, faculty, student)
- ✅ GenerationJob (tracks generation progress)
- ✅ Timetable, TimetableSlot
- ✅ Attendance

**Serializers** (`academics/serializers.py`):
- ✅ All model serializers
- ✅ GenerationJobSerializer
- ✅ GenerationJobCreateSerializer

**Views** (`academics/generation_views.py`):
- ✅ GenerationJobViewSet with actions:
  - ✅ `POST /api/generation-jobs/generate/` - Start generation
  - ✅ `GET /api/generation-jobs/{id}/status/` - Get status
  - ✅ `GET /api/generation-jobs/{id}/progress/` - Get progress
  - ✅ `POST /api/generation-jobs/{id}/approve/` - Approve/reject
  - ✅ `GET /api/generation-jobs/{id}/result/` - Get result

**URLs** (`academics/urls.py`):
- ✅ All routes registered

### ✅ IMPLEMENTED (FastAPI Backend)

**Engine** (`backend/fastapi/engine/`):
- ✅ `orchestrator.py` - Main orchestrator
- ✅ `stage1_clustering.py` - Clustering
- ✅ `stage2_hybrid.py` - Scheduling
- ✅ `stage3_rl.py` - Enhanced 33D RL
- ✅ `context_engine.py` - 5D context
- ✅ `variant_generator.py` - 5 variants

**Main** (`backend/fastapi/main.py`):
- ✅ `/health` - Health check
- ✅ `/api/generate_variants` - Generate 5 variants
- ✅ `/api/variants/{job_id}` - Get variants
- ✅ `/api/status/{job_id}` - Get status
- ✅ `/ws/progress/{job_id}` - WebSocket progress

---

## ❌ MISSING / NEEDS IMPLEMENTATION

### 1. Django - View Timetable Endpoints

**Missing endpoints for viewing timetables by role:**

```python
# academics/views.py - ADD THESE

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHOD])
def get_department_timetable(request, dept_id):
    """HOD views their department timetable"""
    pass

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsFaculty])
def get_faculty_timetable(request):
    """Faculty views their personal timetable"""
    pass

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def get_student_timetable(request):
    """Student views their personal schedule"""
    pass
```

### 2. Django - FastAPI Callback

**Missing callback endpoint for FastAPI to save results:**

```python
# academics/generation_views.py - ADD THIS

@api_view(['POST'])
def fastapi_callback(request):
    """
    FastAPI calls this after generation completes
    Saves variants to PostgreSQL
    """
    pass
```

### 3. Django - Missing Fields in GenerationJob

**Current GenerationJob model needs:**
- ❌ `organization` FK
- ❌ `department` FK
- ❌ `batch` FK
- ❌ `created_by` FK
- ❌ `job_id` as string (currently UUID)

### 4. Frontend - Missing Pages

**Need to create:**
- ❌ `/admin/timetable/generate` - Admin generation page
- ❌ `/hod/timetable` - HOD department view
- ❌ `/faculty/timetable` - Faculty personal view
- ❌ `/student/timetable` - Student personal view

### 5. Redis Integration

**Missing:**
- ❌ Progress tracking keys setup
- ❌ Result caching setup

---

## 🎯 Implementation Priority

### Phase 1: Fix Django Backend (HIGH PRIORITY)

1. **Update GenerationJob model**:
```python
class GenerationJob(models.Model):
    job_id = models.CharField(max_length=50, primary_key=True)  # Change from UUID
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, null=True)
    semester = models.IntegerField()
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    progress = models.IntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True)
    error_message = models.TextField(null=True)
```

2. **Add view timetable endpoints**:
   - Department view (HOD)
   - Faculty view
   - Student view

3. **Add FastAPI callback endpoint**

### Phase 2: Frontend Pages (MEDIUM PRIORITY)

1. Admin generation page with progress bar
2. HOD department timetable view
3. Faculty personal timetable view
4. Student personal schedule view

### Phase 3: Testing & Polish (LOW PRIORITY)

1. End-to-end testing
2. Error handling
3. Loading states
4. UI polish

---

## 📝 Quick Implementation Guide

### Step 1: Update Django Models

```bash
cd backend/django
python manage.py makemigrations
python manage.py migrate
```

### Step 2: Add View Endpoints

Create `academics/timetable_views.py`:
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import TimetableSlot, User

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_department_timetable(request, dept_id):
    # HOD can only see their department
    if request.user.role == 'hod' and request.user.department_id != dept_id:
        return Response({'error': 'Unauthorized'}, status=403)

    slots = TimetableSlot.objects.filter(
        subject__department_id=dept_id,
        timetable__is_active=True
    ).select_related('subject', 'faculty', 'classroom')

    return Response({
        'slots': TimetableSlotSerializer(slots, many=True).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_faculty_timetable(request):
    faculty = request.user.faculty_profile

    slots = TimetableSlot.objects.filter(
        faculty=faculty,
        timetable__is_active=True
    ).select_related('subject', 'batch', 'classroom')

    return Response({
        'slots': TimetableSlotSerializer(slots, many=True).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_timetable(request):
    student = request.user.student_profile

    # Get student's enrolled subjects
    enrollments = student.batch.subject_enrollments.all()
    subject_ids = [e.subject_id for e in enrollments]

    slots = TimetableSlot.objects.filter(
        subject_id__in=subject_ids,
        batch=student.batch,
        timetable__is_active=True
    ).select_related('subject', 'faculty', 'classroom')

    return Response({
        'slots': TimetableSlotSerializer(slots, many=True).data
    })
```

### Step 3: Register URLs

Add to `academics/urls.py`:
```python
from .timetable_views import (
    get_department_timetable,
    get_faculty_timetable,
    get_student_timetable
)

urlpatterns += [
    path('timetable/department/<str:dept_id>/', get_department_timetable),
    path('timetable/faculty/me/', get_faculty_timetable),
    path('timetable/student/me/', get_student_timetable),
]
```

### Step 4: Test Endpoints

```bash
# HOD views department
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/timetable/department/CSE/

# Faculty views personal timetable
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/timetable/faculty/me/

# Student views personal schedule
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/timetable/student/me/
```

---

## 🎉 Summary

**What's Working:**
- ✅ Django models & serializers
- ✅ Generation job creation
- ✅ FastAPI variant generation
- ✅ Progress tracking infrastructure

**What's Missing:**
- ❌ View timetable endpoints (3 endpoints)
- ❌ FastAPI callback endpoint (1 endpoint)
- ❌ Frontend pages (4 pages)
- ❌ Model updates (GenerationJob)

**Estimated Time:**
- Django endpoints: 2-3 hours
- Frontend pages: 4-5 hours
- Testing: 2 hours
- **Total: 8-10 hours**

---

**Next Action**: Implement the 3 view timetable endpoints in Django!
