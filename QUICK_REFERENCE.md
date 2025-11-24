# 🚀 QUICK REFERENCE GUIDE - SIH28

## 📍 KEY URLS

### **Frontend** (Port 3000)
- Dashboard: `http://localhost:3000/admin/dashboard`
- Academic Pages:
  - Courses: `/admin/academic/courses`
  - Departments: `/admin/academic/departments`
  - Rooms: `/admin/academic/rooms`
  - Buildings: `/admin/academic/buildings`
  - Schools: `/admin/academic/schools`
  - Programs: `/admin/academic/programs`
  - Batches: `/admin/academic/batches`
- Timetables:
  - List: `/admin/timetables`
  - New: `/admin/timetables/new`
  - Status: `/admin/timetables/status/[jobId]`
  - Review: `/admin/timetables/[id]/review`

### **Backend APIs**
- Django: `http://localhost:8000/api/`
- FastAPI: `http://localhost:8001/api/`
- WebSocket: `ws://localhost:8001/ws/progress/[jobId]`

---

## 🔑 KEY COMPONENTS

### **Frontend**
```
src/
├── app/admin/
│   ├── academic/          # Academic data management
│   │   ├── courses/
│   │   ├── departments/
│   │   ├── rooms/
│   │   ├── buildings/
│   │   ├── schools/
│   │   ├── programs/
│   │   └── batches/
│   └── timetables/        # Timetable generation
│       ├── new/           # Generation form
│       ├── status/[jobId]/ # Progress tracking ✅ NEW
│       └── [id]/review/   # Review & approve
├── components/
│   └── ui/
│       └── ProgressTracker.tsx  # Real-time progress
└── lib/
    └── api.ts             # API client
```

### **Backend**
```
backend/
├── django/
│   └── academics/
│       ├── models.py      # Database models
│       ├── views.py       # API endpoints
│       ├── serializers.py # Data serialization
│       ├── urls.py        # URL routing
│       └── generation_views.py  # Timetable generation
└── fastapi/
    ├── main.py            # FastAPI app
    ├── engine/
    │   ├── orchestrator.py      # Main scheduler
    │   ├── stage2_hybrid.py     # CP-SAT + GA
    │   └── context_engine.py    # Context analysis
    └── tasks/
        └── timetable_tasks.py   # Celery tasks
```

---

## 🛠️ COMMON COMMANDS

### **Start Development Servers**

```bash
# Frontend (Terminal 1)
cd frontend
npm run dev

# Django Backend (Terminal 2)
cd backend/django
python manage.py runserver

# FastAPI Service (Terminal 3)
cd backend/fastapi
uvicorn main:app --reload --port 8001

# Redis (Terminal 4)
redis-server
```

### **Database Operations**

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Make migrations
python manage.py makemigrations
```

### **Testing**

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend/django
python manage.py test
```

---

## 🐛 DEBUGGING TIPS

### **Frontend Issues**

1. **Page not loading data**
   - Check browser console for errors
   - Verify API endpoint in Network tab
   - Check if backend is running

2. **TypeScript errors**
   - Run `npm run type-check`
   - Check interface definitions
   - Verify API response structure

3. **Styling issues**
   - Check Tailwind classes
   - Verify dark mode classes
   - Check responsive breakpoints

### **Backend Issues**

1. **API returning 500**
   - Check Django logs in terminal
   - Verify model field names
   - Check serializer definitions

2. **API returning 404**
   - Verify URL pattern in `urls.py`
   - Check ViewSet registration
   - Verify endpoint spelling

3. **Slow queries**
   - Add `.select_related()` for foreign keys
   - Add `.prefetch_related()` for many-to-many
   - Check database indexes

---

## 📊 API QUICK REFERENCE

### **Academic Data**

```http
# Get all courses
GET /api/courses/

# Get all departments
GET /api/departments/

# Get all rooms
GET /api/rooms/

# Get all buildings
GET /api/buildings/

# Get all schools
GET /api/schools/

# Get all programs
GET /api/programs/

# Get all batches
GET /api/batches/
```

### **Timetable Generation**

```http
# Start generation
POST /api/timetable/generate/
Body: {
  "academic_year": "2024-2025",
  "semester": "odd",
  "university_id": "uuid"
}

# Get status
GET /api/timetable/status/{job_id}/

# Get progress
GET /api/timetable/progress/{job_id}/

# Get result
GET /api/timetable/result/{job_id}/

# Approve/Reject
POST /api/timetable/approve/{job_id}/
Body: {
  "action": "approve",
  "comments": "Looks good"
}
```

---

## 🎨 UI COMPONENT PATTERNS

### **Loading State**
```tsx
{isLoading && (
  <div className="flex items-center justify-center py-8">
    <div className="loading-spinner w-6 h-6 mr-2"></div>
    <span className="text-gray-600 dark:text-gray-400">Loading...</span>
  </div>
)}
```

### **Empty State**
```tsx
{!isLoading && items.length === 0 && (
  <div className="text-center py-12">
    <p className="text-gray-600 dark:text-gray-400">No items found</p>
  </div>
)}
```

### **Table Loading Overlay**
```tsx
{isTableLoading && (
  <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
      <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
    </div>
  </div>
)}
```

---

## 🔐 AUTHENTICATION

### **Login Flow**
1. User enters credentials
2. Django validates and returns JWT tokens
3. Tokens stored in HttpOnly cookies
4. Frontend includes cookies in all requests

### **Protected Routes**
- All `/admin/*` routes require authentication
- Role-based access control (RBAC)
- Automatic redirect to login if not authenticated

---

## 📈 PERFORMANCE TIPS

### **Frontend**
- Use `React.memo()` for expensive components
- Implement virtual scrolling for large lists
- Lazy load images and heavy components
- Use `useMemo()` and `useCallback()` appropriately

### **Backend**
- Use `.select_related()` for foreign keys
- Use `.prefetch_related()` for many-to-many
- Add database indexes on frequently queried fields
- Use Redis caching for expensive queries
- Implement pagination (100 items per page)

---

## 🚨 COMMON ERRORS & FIXES

### **Error: "Property 'results' does not exist"**
**Fix**: Add proper TypeScript interface with `results?: T[]`

### **Error: "JSON object must be str, bytes or bytearray"**
**Fix**: Exclude problematic JSON fields from serializer

### **Error: "FieldDoesNotExist"**
**Fix**: Remove non-existent fields from `.only()` clause

### **Error: "404 Not Found"**
**Fix**: Add ViewSet to `urls.py` router registration

### **Error: "CORS policy blocked"**
**Fix**: Add origin to `CORS_ORIGINS` in Django settings

---

## 📞 SUPPORT

### **Documentation**
- Main Analysis: `TIMETABLE_GENERATION_ANALYSIS.md`
- Fixes Summary: `FIXES_COMPLETED.md`
- This Guide: `QUICK_REFERENCE.md`

### **Logs**
- Frontend: Browser console
- Django: Terminal output
- FastAPI: Terminal output
- Redis: `redis-cli MONITOR`

---

**Last Updated**: November 25, 2024
