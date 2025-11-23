# 🚀 Quick Start Guide - SIH28 Timetable System

## ⚡ 5-Minute Setup

### Prerequisites Check
```bash
node --version  # Should be 18+
python --version  # Should be 3.11+
```

### 1. Start Backend Services

**Terminal 1 - Django:**
```bash
cd backend\django
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

**Terminal 2 - FastAPI:**
```bash
cd backend\fastapi
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 2. Start Frontend

**Terminal 3 - Next.js:**
```bash
cd frontend
npm install
npm run dev
```

### 3. Access Application

- **Frontend:** http://localhost:3000
- **Django API:** http://localhost:8000/api
- **FastAPI Docs:** http://localhost:8001/docs

---

## 🎯 Test the System

### Step 1: Create Test Data (Django Admin)
```bash
cd backend\django
python manage.py createsuperuser
# Visit: http://localhost:8000/admin
```

### Step 2: Generate Timetable
1. Login to frontend: http://localhost:3000
2. Navigate to: **Admin → Timetables → New**
3. Select semester and academic year
4. Click "Generate Timetable"
5. Watch real-time progress
6. Review generated variants

### Step 3: Approve Timetable
1. Select best variant
2. Click "Approve Timetable"
3. View published timetable

---

## 🔧 Environment Variables

### Backend Django (.env)
```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:pass@localhost:5432/sih28
REDIS_URL=redis://localhost:6379/0
FASTAPI_AI_SERVICE_URL=http://localhost:8001
```

### Backend FastAPI (.env)
```env
REDIS_URL=redis://localhost:6379/0
DJANGO_API_BASE_URL=http://localhost:8000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000/api
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001
```

---

## 📊 System Architecture

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌───▼────────┐
│   Django    │  │  FastAPI   │
│  (Port 8000)│  │ (Port 8001)│
└──────┬──────┘  └───┬────────┘
       │             │
       ├─────────────┤
       │             │
┌──────▼──────┐  ┌──▼─────────┐
│ PostgreSQL  │  │   Redis    │
│  (Neon DB)  │  │  (Upstash) │
└─────────────┘  └────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Issue: Redis Connection Failed
```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Or use cloud Redis (Upstash)
# Update REDIS_URL in .env files
```

### Issue: Database Migration Error
```bash
cd backend\django
python manage.py makemigrations
python manage.py migrate --run-syncdb
```

### Issue: Module Not Found
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

---

## 📝 API Testing

### Test Generation Endpoint
```bash
curl -X POST http://localhost:8000/api/timetable/generate/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "semester": 1,
    "academic_year": "2024-25",
    "num_variants": 5
  }'
```

### Check Progress
```bash
curl http://localhost:8000/api/generation-jobs/{JOB_ID}/progress/
```

### Get Variants
```bash
curl http://localhost:8000/api/timetable/variants/?job_id={JOB_ID}
```

---

## 🎓 Key Features to Test

### 1. NEP 2020 Enrollment
- ✅ Student-based enrollment (not batch-based)
- ✅ Cross-department electives
- ✅ Flexible course selection

### 2. Multi-Variant Generation
- ✅ 5 optimized variants
- ✅ Different optimization priorities
- ✅ Side-by-side comparison

### 3. Real-Time Progress
- ✅ Progress bar (0-100%)
- ✅ Phase updates
- ✅ ETA calculation

### 4. Approval Workflow
- ✅ Select variant
- ✅ Approve/Reject
- ✅ Comments system

---

## 📚 Next Steps

1. **Add Sample Data:**
   - Create departments, subjects, faculty
   - Add student enrollments
   - Configure time slots

2. **Test Generation:**
   - Generate timetable for small dataset
   - Verify conflict detection
   - Check optimization scores

3. **Review & Approve:**
   - Compare variants
   - Select best option
   - Approve and publish

4. **Export & Share:**
   - Export to PDF
   - Share with faculty
   - Publish to student portal

---

## 🆘 Need Help?

- **Documentation:** See README.md
- **API Docs:** http://localhost:8000/api/docs/
- **FastAPI Docs:** http://localhost:8001/docs
- **Issues:** GitHub Issues

---

**Status:** ✅ System Ready
**Version:** 2.0.0
**Last Updated:** 2024
