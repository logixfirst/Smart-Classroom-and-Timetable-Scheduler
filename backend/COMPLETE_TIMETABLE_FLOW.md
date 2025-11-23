# 🎯 Complete Timetable Generation Flow - Frontend to Backend

## 🏗️ Simplified Architecture (No Dean)

```
Registrar/Admin → Generate Timetable → FastAPI → Redis → Result
                                                    ↓
HOD → View Department Timetable ← Django API ← PostgreSQL
Faculty → View Personal Timetable ← Django API ← PostgreSQL
Student → View Personal Timetable ← Django API ← PostgreSQL
```

## 🔄 Complete Flow

### 1. Admin Generates Timetable (Frontend)

**Page**: `/admin/timetables/generate`

```typescript
// User clicks "Generate Timetable"
const response = await fetch('http://localhost:8000/api/timetable/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    organization_id: 'BHU',
    semester: 3,
    academic_year: '2024-25'
  })
});

const { job_id } = await response.json();
// job_id: "tt_abc123"
```

### 2. Django Creates Job & Calls FastAPI

**Django Endpoint**: `POST /api/timetable/generate`

```python
# backend/django/academics/views.py

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrStaff])
def generate_timetable(request):
    # Create job in PostgreSQL
    job = GenerationJob.objects.create(
        job_id=f"tt_{uuid.uuid4().hex[:12]}",
        organization_id=request.data['organization_id'],
        semester=request.data['semester'],
        academic_year=request.data['academic_year'],
        created_by=request.user,
        status='queued'
    )

    # Call FastAPI to start generation
    fastapi_url = f"{settings.FASTAPI_URL}/api/generate_variants"
    response = requests.post(fastapi_url, json={
        'job_id': job.job_id,
        'organization_id': job.organization_id,
        'semester': job.semester,
        'academic_year': job.academic_year
    })

    return Response({'job_id': job.job_id})
```

### 3. FastAPI Generates Timetable

**FastAPI Endpoint**: `POST /api/generate_variants`

```python
# backend/fastapi/main.py

@app.post("/api/generate_variants")
async def generate_variants(request: GenerationRequest, background_tasks: BackgroundTasks):
    job_id = request.job_id

    # Start background generation
    background_tasks.add_task(run_variant_generation, request, job_id)

    return {"job_id": job_id, "status": "queued"}

async def run_variant_generation(request, job_id):
    # Update progress in Redis
    redis_client.set(f"progress:{job_id}", 0)

    # Stage 1: Clustering (20%)
    redis_client.set(f"progress:{job_id}", 20)

    # Stage 2: Scheduling (70%)
    redis_client.set(f"progress:{job_id}", 70)

    # Stage 3: Conflict Resolution (90%)
    redis_client.set(f"progress:{job_id}", 90)

    # Save result to Redis
    redis_client.setex(f"result:{job_id}", 3600, json.dumps(result))
    redis_client.set(f"progress:{job_id}", 100)

    # Callback to Django
    await call_django_callback(job_id, result)
```

### 4. Frontend Polls Progress

```typescript
// Poll every 3 seconds
const checkProgress = async () => {
  const response = await fetch(`http://localhost:8000/api/timetable/progress/${job_id}`);
  const { progress, status } = await response.json();

  updateProgressBar(progress); // 0-100

  if (status === 'completed') {
    showSuccessModal();
    loadTimetable(job_id);
  } else if (status !== 'failed') {
    setTimeout(checkProgress, 3000);
  }
};
```

### 5. Django Saves Result to PostgreSQL

**Django Callback**: `POST /api/timetable/callback`

```python
@api_view(['POST'])
def fastapi_callback(request):
    job_id = request.data['job_id']
    variants = request.data['variants']

    # Update job status
    job = GenerationJob.objects.get(job_id=job_id)
    job.status = 'completed'
    job.completed_at = timezone.now()
    job.save()

    # Save variants to PostgreSQL
    for variant in variants:
        timetable = Timetable.objects.create(
            generation_job=job,
            variant_name=variant['name'],
            quality_score=variant['quality_score']
        )

        # Save entries
        for entry in variant['entries']:
            TimetableEntry.objects.create(
                timetable=timetable,
                course_id=entry['course_id'],
                faculty_id=entry['faculty_id'],
                room_id=entry['room_id'],
                time_slot_id=entry['time_slot_id'],
                day=entry['day'],
                start_time=entry['start_time'],
                end_time=entry['end_time']
            )

    return Response({'status': 'saved'})
```

### 6. HOD Views Department Timetable

**Page**: `/hod/timetable`

```typescript
// HOD logs in, sees their department
const response = await fetch(`http://localhost:8000/api/timetable/department/${dept_id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const timetable = await response.json();
// Shows only CSE department classes
```

**Django Endpoint**:
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_department_timetable(request, dept_id):
    # Check permission: HOD can only see their department
    if request.user.role == 'HOD' and request.user.department_id != dept_id:
        return Response({'error': 'Unauthorized'}, status=403)

    entries = TimetableEntry.objects.filter(
        course__department_id=dept_id,
        timetable__status='published'
    ).select_related('course', 'faculty', 'room', 'time_slot')

    return Response(TimetableEntrySerializer(entries, many=True).data)
```

### 7. Faculty Views Personal Timetable

**Page**: `/faculty/timetable`

```typescript
// Faculty logs in, sees their classes
const response = await fetch(`http://localhost:8000/api/timetable/faculty/me`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const myClasses = await response.json();
// Shows only classes assigned to this faculty
```

**Django Endpoint**:
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsFaculty])
def get_faculty_timetable(request):
    faculty_id = request.user.faculty_profile.faculty_id

    entries = TimetableEntry.objects.filter(
        faculty_id=faculty_id,
        timetable__status='published'
    ).select_related('course', 'room', 'time_slot')

    return Response(TimetableEntrySerializer(entries, many=True).data)
```

### 8. Student Views Personal Timetable

**Page**: `/student/timetable`

```typescript
// Student logs in, sees their schedule
const response = await fetch(`http://localhost:8000/api/timetable/student/me`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const mySchedule = await response.json();
// Shows only classes student is enrolled in
```

**Django Endpoint**:
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudent])
def get_student_timetable(request):
    student_id = request.user.student_profile.student_id

    # Get student's enrolled courses
    enrollments = CourseEnrollment.objects.filter(
        student_id=student_id
    ).values_list('course_id', flat=True)

    # Get timetable entries for enrolled courses
    entries = TimetableEntry.objects.filter(
        course_id__in=enrollments,
        timetable__status='published'
    ).select_related('course', 'faculty', 'room', 'time_slot')

    return Response(TimetableEntrySerializer(entries, many=True).data)
```

---

## 🔐 RBAC Summary

| Role | Can Generate | Can View |
|------|--------------|----------|
| **Admin/Registrar** | ✅ Entire organization | ✅ All timetables |
| **HOD** | ❌ No | ✅ Their department only |
| **Faculty** | ❌ No | ✅ Their classes only |
| **Student** | ❌ No | ✅ Their schedule only |

---

## 📊 Database Schema

```sql
-- Generation Job
CREATE TABLE generation_jobs (
    job_id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50),
    semester INTEGER,
    academic_year VARCHAR(20),
    status VARCHAR(20),  -- queued, running, completed, failed
    progress INTEGER,    -- 0-100
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Timetable (5 variants per job)
CREATE TABLE timetables (
    timetable_id SERIAL PRIMARY KEY,
    generation_job_id VARCHAR(50) REFERENCES generation_jobs(job_id),
    variant_name VARCHAR(50),  -- Balanced, Faculty-First, etc.
    quality_score DECIMAL(5,2),
    status VARCHAR(20),  -- draft, published
    created_at TIMESTAMP
);

-- Timetable Entries
CREATE TABLE timetable_entries (
    entry_id SERIAL PRIMARY KEY,
    timetable_id INTEGER REFERENCES timetables(timetable_id),
    course_id INTEGER REFERENCES courses(course_id),
    faculty_id INTEGER REFERENCES faculty(faculty_id),
    room_id INTEGER REFERENCES rooms(room_id),
    time_slot_id INTEGER REFERENCES time_slots(slot_id),
    day VARCHAR(20),
    start_time TIME,
    end_time TIME
);
```

---

## 🚀 API Endpoints

### Django (Port 8000)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/api/timetable/generate` | Admin | Start generation |
| GET | `/api/timetable/progress/{job_id}` | Admin | Get progress |
| GET | `/api/timetable/result/{job_id}` | Admin | Get result |
| GET | `/api/timetable/department/{dept_id}` | HOD | View dept timetable |
| GET | `/api/timetable/faculty/me` | Faculty | View personal timetable |
| GET | `/api/timetable/student/me` | Student | View personal schedule |

### FastAPI (Port 8001)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/generate_variants` | Run generation algorithm |
| GET | `/health` | Health check |

---

## 🎯 Implementation Checklist

### Backend (Django)
- [ ] Create `GenerationJob` model
- [ ] Create `Timetable` model
- [ ] Create `TimetableEntry` model
- [ ] Create generation endpoint
- [ ] Create progress endpoint
- [ ] Create callback endpoint
- [ ] Create HOD view endpoint
- [ ] Create faculty view endpoint
- [ ] Create student view endpoint
- [ ] Add RBAC permissions

### Backend (FastAPI)
- [ ] Keep existing variant generation
- [ ] Update progress to Redis
- [ ] Call Django callback on completion

### Frontend
- [ ] Admin: Generation page with progress bar
- [ ] HOD: Department timetable view
- [ ] Faculty: Personal timetable view
- [ ] Student: Personal schedule view

---

**This is the complete, simplified flow with NO unnecessary complexity!**
