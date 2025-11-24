# Production Implementation Guide

## Best Practice Architecture

```
User → Django API → Celery Queue → Celery Worker → FastAPI → Redis → Frontend
```

## What's Implemented

### 1. Django (Port 8000)
- REST API endpoints
- User authentication & RBAC
- Database models (PostgreSQL)
- Celery task queueing

### 2. Celery Worker
- Async task processing
- Calls FastAPI for generation
- Hardware-aware resource management
- Automatic retries

### 3. FastAPI (Port 8001)
- Timetable generation algorithms
- Background task processing
- Progress tracking via Redis
- Callback to Django when complete

### 4. Redis
- Celery message broker
- Progress tracking storage
- Result caching

### 5. Frontend (Port 3000)
- React/Next.js UI
- Polls Django for progress
- Real-time updates

## How to Run

### Terminal 1 - Redis
```bash
# Windows (if not running)
redis-server
```

### Terminal 2 - Django
```bash
cd backend\django
python manage.py runserver
```

### Terminal 3 - Celery Worker
```bash
cd backend\django
celery -A erp worker --loglevel=info --pool=solo
```

### Terminal 4 - FastAPI
```bash
cd backend\fastapi
uvicorn main:app --reload --port 8001
```

### Terminal 5 - Frontend
```bash
cd frontend
npm run dev
```

## Current Status

**Working:**
- Django API ✅
- Celery task queueing ✅
- Hardware detection ✅
- Resource limits ✅
- Frontend UI ✅

**Issue:**
- FastAPI `/api/generate_variants` endpoint takes >5 seconds to respond
- Causes timeout in Celery task
- Background task import failing

## Solution

### Option 1: Fix FastAPI (Recommended)
Update `backend/fastapi/main.py` line 200-250 to use simple background task without complex imports.

### Option 2: Direct Generation (Current)
Celery worker runs generation directly without calling FastAPI.
Works but doesn't use FastAPI algorithms.

## Files Modified

1. `backend/django/academics/celery_tasks.py` - Production Celery tasks
2. `backend/django/core/hardware_detector.py` - Memory check fixed (95% threshold)
3. `backend/django/core/tenant_limits.py` - Resource validation
4. `backend/fastapi/api/generation.py` - Clean FastAPI endpoints (NEW)

## Next Steps

1. Restart all services
2. Test generation flow
3. If FastAPI still times out, use Option 2 (direct generation)
4. Later: Fix FastAPI background task imports
