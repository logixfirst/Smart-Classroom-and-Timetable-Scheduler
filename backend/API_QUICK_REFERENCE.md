# 🚀 Timetable API - Quick Reference

## 📍 Base URLs

- **Django**: `http://localhost:8000/api`
- **FastAPI**: `http://localhost:8001/api`

---

## 🔐 Authentication

All endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

Get token:
```bash
POST /api/auth/login/
Body: {"username": "user", "password": "pass"}
```

---

## 📋 Complete API List

### 1. Generation (Admin Only)

```bash
# Start generation
POST /api/generation-jobs/generate/
Body: {
  "department_id": "CSE",
  "batch_id": "2024-CSE-A",
  "semester": 3,
  "academic_year": "2024-25"
}

# Check progress
GET /api/generation-jobs/{job_id}/progress/

# Get status
GET /api/generation-jobs/{job_id}/status/

# Approve/Reject
POST /api/generation-jobs/{job_id}/approve/
Body: {"action": "approve", "comments": "Looks good"}

# Get result
GET /api/generation-jobs/{job_id}/result/
```

### 2. View Timetable (RBAC)

```bash
# HOD views department (Admin/HOD only)
GET /api/timetable/department/{dept_id}/

# Faculty views personal timetable (Faculty only)
GET /api/timetable/faculty/me/

# Student views personal schedule (Student only)
GET /api/timetable/student/me/
```

### 3. FastAPI (Internal)

```bash
# Generate variants (called by Django)
POST http://localhost:8001/api/generate_variants
Body: {
  "job_id": "tt_abc123",
  "organization_id": "BHU",
  "semester": 3,
  "academic_year": "2024-25"
}

# Health check
GET http://localhost:8001/health

# Get variants
GET http://localhost:8001/api/variants/{job_id}
```

---

## 🎯 User Flows

### Admin Flow
```
1. Login → POST /api/auth/login/
2. Generate → POST /api/generation-jobs/generate/
3. Poll progress → GET /api/generation-jobs/{id}/progress/
4. View result → GET /api/generation-jobs/{id}/result/
5. Approve → POST /api/generation-jobs/{id}/approve/
```

### HOD Flow
```
1. Login → POST /api/auth/login/
2. View department → GET /api/timetable/department/CSE/
```

### Faculty Flow
```
1. Login → POST /api/auth/login/
2. View classes → GET /api/timetable/faculty/me/
```

### Student Flow
```
1. Login → POST /api/auth/login/
2. View schedule → GET /api/timetable/student/me/
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🔑 Role Permissions

| Endpoint | Admin | HOD | Faculty | Student |
|----------|-------|-----|---------|---------|
| Generate timetable | ✅ | ❌ | ❌ | ❌ |
| Approve timetable | ✅ | ❌ | ❌ | ❌ |
| View all departments | ✅ | ❌ | ❌ | ❌ |
| View own department | ✅ | ✅ | ❌ | ❌ |
| View personal timetable | ❌ | ✅ | ✅ | ❌ |
| View personal schedule | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 Quick Test Commands

```bash
# Set your token
TOKEN="your_jwt_token_here"

# Test HOD endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/timetable/department/CSE/

# Test Faculty endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/timetable/faculty/me/

# Test Student endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/timetable/student/me/

# Start generation
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"department_id":"CSE","batch_id":"2024-CSE-A","semester":3,"academic_year":"2024-25"}' \
  http://localhost:8000/api/generation-jobs/generate/
```

---

## 📝 Notes

- All timestamps in ISO 8601 format
- All IDs are UUIDs
- Progress is 0-100 integer
- Status: queued, running, completed, failed, approved, rejected
- Timetables inactive until approved
- Redis caches progress for 1 hour
- Results cached for 24 hours

---

**Quick Start**: Copy this file and keep it handy for API testing!
