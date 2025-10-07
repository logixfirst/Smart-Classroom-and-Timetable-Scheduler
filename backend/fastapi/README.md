# FastAPI Timetable Generation Service

This service handles computationally intensive timetable generation algorithms.

## Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Service

```bash
# Development mode with auto-reload
uvicorn main:app --reload --port 8001

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8001
```

## API Endpoints

### Health Check
- `GET /` - Service info
- `GET /health` - Health check with Redis status

### Generation
- `POST /api/generate/{job_id}` - Start timetable generation
- `GET /api/progress/{job_id}` - Get real-time progress
- `GET /api/result/{job_id}` - Get generation result

## Environment Variables

Create a `.env` file:
```
REDIS_URL=rediss://default:...@your-redis-host:6379
```
