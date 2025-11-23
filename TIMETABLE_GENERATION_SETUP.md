# Timetable Generation Setup - Complete Guide

## Overview

Simplified timetable generation form that requires only **2 fields**:
- Academic Year (e.g., "2024-2025")
- Semester (odd/even)

Everything else is auto-handled by the system.

---

## Frontend Setup

### 1. Form Location
**File**: `frontend/src/app/admin/timetables/new/page.tsx`

**Route**: `/admin/timetables/new`

**Note**: Uses existing project components and styling (card, form-group, input-primary, btn-primary)

### 2. Form Fields

```typescript
{
  academic_year: "2024-2025",  // Dropdown with predefined years
  semester: "odd"              // Radio buttons: odd/even
}
```

### 3. API Call

```typescript
POST http://localhost:8000/api/timetable/generate/

Body:
{
  "academic_year": "2024-2025",
  "semester": "odd",
  "university_id": 1  // Auto-filled from logged-in user
}
```

### 4. Styling

Uses existing project styles:
- `card` - Card container
- `card-header` - Card header section
- `card-title` - Card title text
- `card-description` - Card description text
- `form-group` - Form field wrapper
- `form-label` - Form field label
- `input-primary` - Input/select field
- `btn-primary` - Primary button

---

## Backend Setup

### 1. API Endpoint

**File**: `backend/django/academics/generation_views.py`

**Endpoint**: `POST /api/timetable/generate/`

**Method**: `generate_timetable()`

### 2. Request Handling

```python
# Receives
{
    "academic_year": "2024-2025",
    "semester": "odd",
    "university_id": 1
}

# Auto-fills
- generation_type = "full"
- scope = "university"
- department = None (all 127 departments)
- batch = None (all batches)
```

### 3. Response

```python
{
    "success": True,
    "message": "Timetable generation started for all 127 departments",
    "job_id": "abc123-def456",
    "estimated_time": "8-11 minutes",
    "job": {
        "job_id": "abc123-def456",
        "status": "queued",
        "progress": 0,
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

### 4. Job Queue

**Redis Queue**: `generation_queue:{job_id}`

**Job Data**:
```python
{
    "job_id": "abc123-def456",
    "university_id": 1,
    "semester": "odd",
    "academic_year": "2024-2025",
    "generation_type": "full",
    "scope": "university",
    "created_at": "2024-01-15T10:30:00Z"
}
```

### 5. FastAPI Integration

**Endpoint**: `POST http://localhost:8001/api/v1/optimize`

**Payload**: Same as job_data above

**Processing**:
1. FastAPI receives job from Django
2. Calls `variant_generator.py` (adaptive optimizer)
3. Uses `orchestrator.py` (hierarchical scheduler)
4. Generates timetable for all 127 departments
5. Updates progress in Redis
6. Returns result to Django

---

## Database Changes

### GenerationJob Model

**Updated Fields**:
```python
department = None  # Nullable for university-wide
batch = None       # Nullable for university-wide
semester = "odd"   # String instead of integer
```

**Migration Required**: Yes (if department/batch are not nullable)

---

## What Gets Auto-Handled

### 1. From User Context
- ✅ `university_id` - From logged-in admin's organization
- ✅ `user_id` - From request.user

### 2. From System Defaults
- ✅ `generation_type` = "full"
- ✅ `scope` = "university"
- ✅ `working_days` = ["monday", "tuesday", "wednesday", "thursday", "friday"]
- ✅ `slots_per_day` = 8
- ✅ `start_time` = "09:00"
- ✅ `lunch_break` = slot 4

### 3. From Database
- ✅ All 127 departments
- ✅ All courses and subjects
- ✅ All faculty assignments
- ✅ All student enrollments (25,000+)
- ✅ All classroom availability
- ✅ Faculty preferences
- ✅ NEP 2020 interdisciplinary mappings

### 4. From Engine
- ✅ Resource detection (CPU cores, GPU, Celery workers)
- ✅ Strategy selection (hierarchical by default)
- ✅ Conflict resolution (zero conflicts guaranteed)
- ✅ NEP 2020 compliance

---

## Testing

### 1. Frontend Test

```bash
cd frontend
npm run dev
```

Navigate to: `http://localhost:3000/admin/timetables/generate`

### 2. Backend Test

```bash
curl -X POST http://localhost:8000/api/timetable/generate/ \
  -H "Content-Type: application/json" \
  -d '{
    "academic_year": "2024-2025",
    "semester": "odd",
    "university_id": 1
  }'
```

### 3. Expected Response

```json
{
  "success": true,
  "message": "Timetable generation started for all 127 departments",
  "job_id": "abc123-def456",
  "estimated_time": "8-11 minutes"
}
```

---

## Progress Tracking

### 1. Check Status

```bash
GET /api/timetable/status/{job_id}/
```

### 2. Real-time Progress

```bash
GET /api/timetable/progress/{job_id}/
```

### 3. Get Result

```bash
GET /api/timetable/result/{job_id}/
```

---

## Error Handling

### Frontend Errors

1. **No university_id**: "User organization not found"
2. **Network error**: "Failed to generate timetable"
3. **API error**: Shows error message from backend

### Backend Errors

1. **Missing fields**: "academic_year and semester are required"
2. **No university_id**: "university_id not found"
3. **Database error**: "Error creating generation job"
4. **FastAPI unavailable**: Job queued in Redis, will be picked up later

---

## Files Modified/Created

### Frontend
- ✅ Modified: `frontend/src/app/admin/timetables/new/page.tsx` (simplified from complex NEP2020TimetableForm)
- ✅ Removed: Complex enrollment loading and fixed slots features
- ✅ Uses: Existing UI components (card, form-group, input-primary, btn-primary)

### Backend
- ✅ Modified: `backend/django/academics/generation_views.py`
- ✅ Modified: `backend/django/academics/serializers.py`

### Documentation
- ✅ Created: `TIMETABLE_GENERATION_SETUP.md`

---

## Next Steps

1. **Test the form**: Navigate to `/admin/timetables/generate`
2. **Submit generation**: Select year and semester, click Generate
3. **Track progress**: Redirects to `/admin/timetables/status/{job_id}`
4. **View result**: After completion, view generated timetable

---

## Summary

**Admin sends**:
```json
{
  "academic_year": "2024-2025",
  "semester": "odd"
}
```

**System generates**:
- ✅ Timetable for all 127 departments
- ✅ Zero conflicts (faculty, student, room)
- ✅ NEP 2020 compliant
- ✅ 8-11 minutes processing time

**That's it!** Just 2 fields, everything else is automatic.
