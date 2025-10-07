"""
FastAPI Timetable Generation Service
Handles computationally intensive timetable generation algorithms
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
import redis
import json
import asyncio
import logging
from datetime import datetime
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Timetable Generation Engine",
    description="AI-powered timetable generation service",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_client = redis.from_url(REDIS_URL, decode_responses=True)


# Pydantic Models
class GenerationRequest(BaseModel):
    job_id: str
    department_id: str
    batch_id: str
    semester: int
    academic_year: str
    created_at: str


class ProgressUpdate(BaseModel):
    job_id: str
    progress: int
    status: str
    message: Optional[str] = None


# Health Check (only for /ai/health via nginx proxy)
@app.get("/health")
async def root():
    return {
        "service": "Timetable Generation Engine",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/detailed")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_client.ping()
        return {
            "status": "healthy",
            "redis": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


# Progress tracking
async def update_progress(job_id: str, progress: int, status: str = "running"):
    """Update job progress in Redis"""
    try:
        cache_key = f'generation_progress:{job_id}'
        redis_client.setex(cache_key, 3600, progress)  # Expire in 1 hour
        
        status_key = f'generation_status:{job_id}'
        redis_client.setex(status_key, 3600, status)
        
        logger.info(f"Job {job_id}: {progress}% - {status}")
    except Exception as e:
        logger.error(f"Error updating progress: {e}")


# Timetable Generation Algorithm (Placeholder)
async def generate_timetable_algorithm(request: GenerationRequest):
    """
    Main timetable generation algorithm
    This is a placeholder - implement your actual algorithm here
    """
    job_id = request.job_id
    
    try:
        # Update status to running
        await update_progress(job_id, 0, "running")
        
        # Step 1: Fetch data (10%)
        await asyncio.sleep(2)
        await update_progress(job_id, 10, "running")
        logger.info(f"Fetching data for {request.department_id}, semester {request.semester}")
        
        # Step 2: Initialize constraints (20%)
        await asyncio.sleep(2)
        await update_progress(job_id, 20, "running")
        logger.info("Initializing constraints")
        
        # Step 3: Generate initial schedule (40%)
        await asyncio.sleep(3)
        await update_progress(job_id, 40, "running")
        logger.info("Generating initial schedule")
        
        # Step 4: Optimize schedule (70%)
        await asyncio.sleep(3)
        await update_progress(job_id, 70, "running")
        logger.info("Optimizing schedule")
        
        # Step 5: Validate and finalize (90%)
        await asyncio.sleep(2)
        await update_progress(job_id, 90, "running")
        logger.info("Validating schedule")
        
        # Step 6: Save to database (100%)
        await asyncio.sleep(1)
        await update_progress(job_id, 100, "completed")
        logger.info(f"Timetable generation completed for job {job_id}")
        
        # Store result in Redis
        result_key = f'generation_result:{job_id}'
        result_data = {
            "job_id": job_id,
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "timetable_data": {
                "message": "Timetable generated successfully",
                "slots_created": 25,  # Placeholder
                "conflicts_resolved": 3  # Placeholder
            }
        }
        redis_client.setex(result_key, 3600, json.dumps(result_data))
        
        return {"success": True, "message": "Generation completed"}
        
    except Exception as e:
        logger.error(f"Error in generation: {e}")
        await update_progress(job_id, 0, "failed")
        raise


@app.post("/api/generate/{job_id}")
async def start_generation(job_id: str, request: GenerationRequest, background_tasks: BackgroundTasks):
    """
    Start timetable generation for a job
    POST /api/generate/{job_id}
    """
    try:
        logger.info(f"Starting generation for job {job_id}")
        
        # Validate request
        if request.job_id != job_id:
            raise HTTPException(status_code=400, detail="Job ID mismatch")
        
        # Start generation in background
        background_tasks.add_task(generate_timetable_algorithm, request)
        
        return {
            "success": True,
            "message": "Timetable generation started",
            "job_id": job_id,
            "status": "queued"
        }
        
    except Exception as e:
        logger.error(f"Error starting generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/progress/{job_id}")
async def get_progress(job_id: str):
    """
    Get real-time progress for a job
    GET /api/progress/{job_id}
    """
    try:
        progress_key = f'generation_progress:{job_id}'
        status_key = f'generation_status:{job_id}'
        
        progress = redis_client.get(progress_key)
        status = redis_client.get(status_key)
        
        if progress is None:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "success": True,
            "job_id": job_id,
            "progress": int(progress),
            "status": status or "unknown",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/result/{job_id}")
async def get_result(job_id: str):
    """
    Get generation result
    GET /api/result/{job_id}
    """
    try:
        result_key = f'generation_result:{job_id}'
        result = redis_client.get(result_key)
        
        if result is None:
            raise HTTPException(status_code=404, detail="Result not found")
        
        return {
            "success": True,
            "result": json.loads(result)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
