# 🚀 QUICK STARTUP GUIDE

## Prerequisites Installed
- ✅ Python 3.11+
- ✅ Node.js 18+
- ✅ Redis (for Celery & WebSocket)
- ✅ PostgreSQL (for Django)

---

## 🔧 STARTUP SEQUENCE

### 1. Start Redis (Required for WebSocket & Celery)
```bash
# Windows (if installed via Chocolatey)
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Start Django Backend (Port 8000)
```bash
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

cd django
python manage.py runserver
```

**Expected Output**:
```
Starting development server at http://127.0.0.1:8000/
```

### 3. Start FastAPI Service (Port 8001)
```bash
cd backend
.venv\Scripts\activate  # Windows

cd fastapi
uvicorn main:app --port 8001 --reload
```

**Expected Output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete
```

### 4. Start Celery Workers (Optional but Recommended)
```bash
cd backend/django
celery -A celery_config worker --loglevel=info --pool=solo
```

**Note**: Use `--pool=solo` on Windows. On Linux/macOS, omit this flag.

### 5. Start Frontend (Port 3000)
```bash
cd frontend
npm run dev
```

**Expected Output**:
```
- Local:   http://localhost:3000
- Ready in 2.5s
```

---

## ✅ VERIFY EVERYTHING IS WORKING

### 1. Check Django API
```bash
curl http://localhost:8000/api/health
# Expected: {"status": "healthy"}
```

### 2. Check FastAPI
```bash
curl http://localhost:8001/health
# Expected: {"service": "Timetable Generation Engine", "status": "healthy"}
```

### 3. Check Redis
```bash
redis-cli ping
# Expected: PONG
```

### 4. Check Frontend
Open browser: `http://localhost:3000`

---

## 🐛 TROUBLESHOOTING

### Error: "ImportError: cannot import name 'TimetableOrchestrator'"
**Fixed!** The import has been corrected to `HierarchicalScheduler`.

### Error: "Redis connection refused"
**Solution**: Start Redis server first
```bash
redis-server
```

### Error: "Port 8000 already in use"
**Solution**: Kill existing process
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:8000 | xargs kill -9
```

### Error: "Celery not connecting"
**Solution**: Check Redis is running and CELERY_BROKER_URL is correct
```bash
# In .env
CELERY_BROKER_URL=redis://localhost:6379/0
```

### Error: "WebSocket connection failed"
**Solution**: 
1. Check FastAPI is running on port 8001
2. Check Redis is running
3. Add to frontend `.env.local`:
```env
NEXT_PUBLIC_FASTAPI_WS_URL=ws://localhost:8001
```

---

## 🧪 TEST THE NEW FEATURES

### 1. Test Cancel Functionality
1. Start generation: `POST http://localhost:8000/api/timetable/generate/`
2. Get job_id from response
3. Cancel it: `POST http://localhost:8000/api/generation-jobs/{job_id}/cancel/`
4. Verify status changes to 'cancelled'

### 2. Test WebSocket
1. Open browser console
2. Run:
```javascript
const ws = new WebSocket('ws://localhost:8001/ws/progress/test_job_123')
ws.onmessage = (e) => console.log(JSON.parse(e.data))
```
3. Should see connection established

### 3. Test Variant Comparison
1. Complete a generation
2. Navigate to: `http://localhost:3000/admin/timetables/compare/{job_id}`
3. Should see 3-5 variants with metrics

### 4. Test GPU Acceleration
```python
import torch
print(torch.cuda.is_available())  # Should print True if GPU available
```

---

## 📝 ENVIRONMENT VARIABLES

### Frontend `.env.local`
```env
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000/api
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001
NEXT_PUBLIC_FASTAPI_WS_URL=ws://localhost:8001
```

### Backend `.env`
```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/sih28

# FastAPI
FASTAPI_AI_SERVICE_URL=http://localhost:8001
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

---

## 🎯 QUICK COMMANDS

### Start Everything (Windows)
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Django
cd backend && .venv\Scripts\activate && cd django && python manage.py runserver

# Terminal 3: FastAPI
cd backend && .venv\Scripts\activate && cd fastapi && uvicorn main:app --port 8001 --reload

# Terminal 4: Celery (Optional)
cd backend\django && celery -A celery_config worker --loglevel=info --pool=solo

# Terminal 5: Frontend
cd frontend && npm run dev
```

### Stop Everything
```bash
# Press Ctrl+C in each terminal
```

---

## 🔥 COMMON ISSUES & FIXES

| Issue | Solution |
|-------|----------|
| Import errors | Run `pip install -r requirements.txt` |
| Module not found | Check you're in correct directory |
| Port already in use | Kill process or use different port |
| Redis not connecting | Start redis-server first |
| WebSocket fails | Check FastAPI is running |
| Celery not working | Check Redis is running |
| GPU not detected | Install PyTorch with CUDA |

---

## ✅ SUCCESS CHECKLIST

- [ ] Redis running on port 6379
- [ ] Django running on port 8000
- [ ] FastAPI running on port 8001
- [ ] Celery workers running (optional)
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can access http://localhost:8000/api/health
- [ ] Can access http://localhost:8001/health
- [ ] WebSocket connects successfully
- [ ] Cancel button appears during generation
- [ ] Variant comparison page loads

---

## 🎉 YOU'RE READY!

All 4 critical features are now implemented:
1. ✅ Cancel Functionality
2. ✅ WebSocket Real-time Updates
3. ✅ Variant Comparison UI
4. ✅ GPU Acceleration

Navigate to `http://localhost:3000` and start using the platform!
