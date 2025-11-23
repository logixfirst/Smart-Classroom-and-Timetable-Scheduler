"""
NEP 2020 Timetable Generation - Backend API Documentation
=========================================================

This document describes the new backend APIs for NEP 2020-compliant timetable generation.

## New Endpoints

### 1. Enrollment Cache Management (Redis)

#### Check Cache
```
GET /api/v1/timetable/enrollment-cache/?cache_key={key}

Response:
{
    "exists": true/false,
    "data": { ... },  // If exists
    "cache_key": "timetable:org123:CSE:sem3:2024-25"
}
```

#### Store in Cache
```
POST /api/v1/timetable/enrollment-cache/

Body:
{
    "cache_key": "timetable:org123:CSE:sem3:2024-25",
    "department_id": "CSE",
    "semester": 3,
    "academic_year": "2024-25",
    "timestamp": "2024-11-18T10:30:00Z",
    "students": [...],
    "enrollments": [...],
    "subjects": [...],
    "faculty": [...],
    "classrooms": [...],
    "cross_department_enrollments": [...]
}

Response:
{
    "success": true,
    "message": "Data cached successfully",
    "cache_key": "...",
    "expires_in": "24 hours"
}
```

#### Update Cache
```
PUT /api/v1/timetable/enrollment-cache/

Body: Same as POST

Response: Same as POST
```

#### Clear Cache
```
DELETE /api/v1/timetable/enrollment-cache/?cache_key={key}

Response:
{
    "success": true,
    "message": "Cache cleared successfully"
}
```

---

### 2. Student Enrollments

```
GET /api/v1/students/enrollments/
    ?department_id=CSE
    &semester=3
    &academic_year=2024-25

Response:
{
    "students": [
        {
            "student_id": "CS2023001",
            "student_roll_no": "CS2023001",
            "student_name": "Raj Kumar",
            "department_id": "CSE",
            "current_semester": 3,
            "batch_id": "CS-2023-A"
        },
        ...
    ],
    "enrollments": [
        {
            "enrollment_id": "enr_123",
            "student_id": "CS2023001",
            "student_name": "Raj Kumar",
            "student_roll_no": "CS2023001",
            "subject_id": "CS301",
            "subject_code": "CS301",
            "subject_name": "Data Structures",
            "department_id": "CSE",
            "is_core": true,
            "is_elective": false
        },
        {
            "enrollment_id": "enr_124",
            "student_id": "CS2023001",
            "student_name": "Raj Kumar",
            "student_roll_no": "CS2023001",
            "subject_id": "PSY101",
            "subject_code": "PSY101",
            "subject_name": "Introduction to Psychology",
            "department_id": "HUM",  // Cross-department!
            "is_core": false,
            "is_elective": true
        },
        ...
    ],
    "total_students": 150,
    "total_enrollments": 900
}
```

**Purpose:** Fetches all students enrolled in department's subjects (core + taking as electives)

---

### 3. Timetable Enrollment Summary

```
GET /api/v1/timetable/enrollments/
    ?department_id=CSE
    &semester=3
    &academic_year=2024-25
    &include_cross_dept=true

Response:
{
    "enrollments": [ ... ],  // Same as above
    "summary": [
        {
            "subject_id": "CS301",
            "subject_code": "CS301",
            "subject_name": "Data Structures",
            "subject_type": "theory",
            "department_id": "CSE",
            "department_name": "Computer Science & Engineering",
            "enrolled_students_count": 120,
            "student_ids": ["CS2023001", "CS2023002", ...],
            "is_cross_department": false
        },
        {
            "subject_id": "CS302",
            "subject_code": "CS302",
            "subject_name": "Database Management Systems",
            "subject_type": "theory",
            "department_id": "CSE",
            "department_name": "Computer Science & Engineering",
            "enrolled_students_count": 135,
            "student_ids": ["CS2023001", "ME2023045", ...],  // ME student taking CS elective!
            "is_cross_department": true  // Has students from other departments
        },
        ...
    ],
    "cross_department_summary": [
        {
            "from_department": "ME",
            "student_count": 15,
            "subjects": ["CS302", "CS305"]
        },
        {
            "from_department": "ECE",
            "student_count": 8,
            "subjects": ["CS302"]
        }
    ],
    "total_subjects": 10,
    "total_enrollments": 900
}
```

**Purpose:** Aggregates enrollments by subject with cross-department tracking

---

### 4. Faculty by Enrollment

```
GET /api/v1/faculty/by-enrollment/
    ?department_id=CSE
    &semester=3

Response:
[
    {
        "faculty_id": "FAC001",
        "faculty_name": "Dr. Sharma",
        "department_id": "CSE",
        "department_name": "Computer Science & Engineering",
        "max_workload_per_week": 20,
        "specialization": "Algorithms"
    },
    {
        "faculty_id": "FAC045",
        "faculty_name": "Dr. Verma",
        "department_id": "HUM",  // Cross-department faculty!
        "department_name": "Humanities",
        "max_workload_per_week": 18,
        "specialization": "Psychology"
    },
    ...
]
```

**Purpose:** Fetches all faculty teaching subjects in this department/semester (including cross-department)

---

### 5. Updated Generation Endpoint

```
POST /api/v1/timetable/generate/

Body (NEP 2020 - Student Enrollment Based):
{
    "department_id": "CSE",
    "semester": 3,
    "academic_year": "2024-25",
    "organization_id": "org_123",
    "num_variants": 5,

    // NEW: Student enrollments
    "student_enrollments": [
        {
            "student_id": "CS2023001",
            "subject_id": "CS301",
            "is_core": true,
            "is_elective": false
        },
        {
            "student_id": "CS2023001",
            "subject_id": "PSY101",
            "is_core": false,
            "is_elective": true
        },
        ...
    ],

    // NEW: Subject summaries with enrolled student lists
    "subjects": [
        {
            "subject_id": "CS301",
            "subject_code": "CS301",
            "subject_type": "theory",
            "department_id": "CSE",
            "enrolled_student_ids": ["CS2023001", "CS2023002", ...],
            "is_cross_department": false
        },
        {
            "subject_id": "CS302",
            "subject_code": "CS302",
            "subject_type": "theory",
            "department_id": "CSE",
            "enrolled_student_ids": ["CS2023001", "ME2023045", ...],
            "is_cross_department": true
        },
        ...
    ],

    // NEW: Redis cache key (optional - for FastAPI to fetch full data)
    "redis_cache_key": "timetable:org123:CSE:sem3:2024-25",

    // Optional: Fixed slots
    "fixed_slots": [
        {
            "subject_id": "CS301",
            "faculty_id": "FAC001",
            "day": 0,
            "start_time": "09:00",
            "end_time": "10:00"
        }
    ]
}

Body (Legacy - Batch Based - Still Supported):
{
    "department_id": "CSE",
    "batch_ids": ["CS-2023-A", "CS-2023-B"],
    "semester": 3,
    "academic_year": "2024-25",
    "organization_id": "org_123",
    "num_variants": 5
}

Response:
{
    "success": true,
    "message": "Timetable generation started",
    "job_id": "tt_abc123def456",
    "workflow_id": 789,
    "status": "queued",
    "estimated_time": "5-10 minutes",
    "websocket_url": "ws://localhost:8001/ws/progress/tt_abc123def456",
    "status_url": "/api/timetable/status/tt_abc123def456/"
}
```

---

## How Frontend Uses These APIs

### Step 1: User Selects Department + Semester
```javascript
// User selects: Department = CSE, Semester = 3, Year = 2024-25
```

### Step 2: Check Redis Cache
```javascript
const cacheKey = `timetable:${orgId}:${deptId}:sem${sem}:${year}`
const response = await fetch(`/api/v1/timetable/enrollment-cache/?cache_key=${cacheKey}`)

if (response.data.exists) {
    // ⚡ FAST: Data in cache
    loadDataFromCache(response.data.data)
} else {
    // 📊 Fetch from database
    fetchFromDatabase()
}
```

### Step 3: Fetch from Database (if not cached)
```javascript
const [students, enrollments, faculty, classrooms] = await Promise.all([
    fetch('/api/v1/students/enrollments/?...'),
    fetch('/api/v1/timetable/enrollments/?...'),
    fetch('/api/v1/faculty/by-enrollment/?...'),
    fetch('/api/v1/classrooms/?...')
])

// Store in Redis for future use
await fetch('/api/v1/timetable/enrollment-cache/', {
    method: 'POST',
    body: JSON.stringify({ cache_key, ...allData })
})
```

### Step 4: Admin Modifies Data (Optional)
```javascript
// Admin changes something in the form
const updatedData = { ...cachedData, modified_at: new Date() }

// Update Redis cache
await fetch('/api/v1/timetable/enrollment-cache/', {
    method: 'PUT',
    body: JSON.stringify(updatedData)
})
```

### Step 5: Generate Timetable
```javascript
await fetch('/api/v1/timetable/generate/', {
    method: 'POST',
    body: JSON.stringify({
        department_id: 'CSE',
        semester: 3,
        student_enrollments: [...],
        subjects: [...],
        redis_cache_key: cacheKey  // FastAPI can fetch full data from Redis
    })
})
```

---

## Cross-Department Conflict Resolution

### How It Works:

**Example Scenario:**
- Raj (CS student): Enrolled in CS301 (DBMS) + PSY101 (Psychology elective)
- Priya (ME student): Enrolled in ME301 (Thermodynamics) + CS301 (DBMS elective)

**Stage 1: Constraint Graph Building**
```python
# In FastAPI stage1_clustering.py
courses = [
    {"course_id": "CS301", "student_ids": ["raj", "priya"]},  # DBMS
    {"course_id": "ME301", "student_ids": ["priya"]},         # Thermodynamics
    {"course_id": "PSY101", "student_ids": ["raj"]}           # Psychology
]

# Calculate edge weights
students_CS301 = {"raj", "priya"}
students_ME301 = {"priya"}
overlap = len(students_CS301 & students_ME301)  # 1 (Priya!)

# High edge weight → These courses CANNOT be at same time
edge_weight = alpha_student * (overlap / max_enrollment)
```

**Result:** CS301 and ME301 get high edge weight → Louvain clusters them separately → Scheduled at different times → No conflict for Priya!

---

## Database Requirements

### SubjectEnrollment Model (Already Exists!)
```python
class SubjectEnrollment(models.Model):
    enrollment_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, null=True)
    academic_year = models.CharField(max_length=10)
    semester = models.IntegerField()
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
```

**You already have this model!** ✅ No database changes needed.

---

## Testing

### Test 1: Cache Management
```bash
# Check cache (should not exist)
curl "http://localhost:8000/api/v1/timetable/enrollment-cache/?cache_key=test123"

# Store data
curl -X POST http://localhost:8000/api/v1/timetable/enrollment-cache/ \
  -H "Content-Type: application/json" \
  -d '{"cache_key":"test123","data":"hello"}'

# Check cache (should exist now)
curl "http://localhost:8000/api/v1/timetable/enrollment-cache/?cache_key=test123"
```

### Test 2: Fetch Enrollments
```bash
curl "http://localhost:8000/api/v1/students/enrollments/?department_id=CSE&semester=3&academic_year=2024-25"
```

### Test 3: Generate Timetable (NEP 2020)
```bash
curl -X POST http://localhost:8000/api/v1/timetable/generate/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "department_id": "CSE",
    "semester": 3,
    "academic_year": "2024-25",
    "organization_id": "org_123",
    "student_enrollments": [...],
    "subjects": [...]
  }'
```

---

## Summary

✅ **5 New APIs Created:**
1. EnrollmentCacheViewSet - Redis cache management
2. StudentEnrollmentViewSet - Fetch student enrollments
3. TimetableEnrollmentViewSet - Subject enrollment summaries
4. FacultyByEnrollmentViewSet - Cross-department faculty
5. Updated GenerationJobCreateSerializer - NEP 2020 support

✅ **Backward Compatible:** Legacy batch-based generation still works

✅ **Cross-Department Support:** Tracks students taking electives from other departments

✅ **Redis Caching:** Fast repeated access, admin can modify cached data

✅ **Production Ready:** Error handling, logging, validation

---

## Next Steps

1. ✅ Backend APIs implemented
2. ✅ Frontend form created
3. ⏳ Test with real data
4. ⏳ Deploy to staging
5. ⏳ Monitor performance
