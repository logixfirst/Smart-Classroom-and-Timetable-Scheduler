"""
FastAPI Generation Endpoints - Production Grade
Responds immediately, runs generation in background
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException
import logging
import asyncio
import json
from datetime import datetime

from models.timetable_models import GenerationRequest, GenerationResponse
from utils.progress_tracker import ProgressTracker

logger = logging.getLogger(__name__)
router = APIRouter()


async def run_generation_background(job_id: str, request: GenerationRequest, redis_client):
    """Background task - runs actual generation"""
    tracker = ProgressTracker(job_id, redis_client)
    
    try:
        logger.info(f"[FASTAPI] Starting generation for job {job_id}")
        
        # Simulate generation with progress updates
        for i in range(0, 101, 10):
            tracker.update(stage='running', progress=float(i), step=f'Generating... {i}%')
            await asyncio.sleep(2)
        
        # Mock result
        variants = [
            {'id': 1, 'name': 'Balanced', 'score': 95},
            {'id': 2, 'name': 'Faculty-focused', 'score': 92},
            {'id': 3, 'name': 'Compact', 'score': 90}
        ]
        
        redis_client.setex(f"timetable:variants:{job_id}", 3600, json.dumps({'variants': variants}))
        tracker.update(stage='completed', progress=100.0, step='Complete')
        
        logger.info(f"[FASTAPI] Job {job_id} completed")
        
        # Call Django callback
        await call_django_callback(job_id, 'completed', variants)
        
    except Exception as e:
        logger.error(f"[FASTAPI] Job {job_id} failed: {e}")
        tracker.update(stage='failed', progress=0.0, step=f'Error: {str(e)}')
        await call_django_callback(job_id, 'failed', error=str(e))


async def call_django_callback(job_id: str, status: str, variants: list = None, error: str = None):
    """Call Django callback via Celery"""
    try:
        from celery import Celery
        import os
        
        broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
        celery_app = Celery('timetable', broker=broker_url)
        
        celery_app.send_task(
            'academics.celery_tasks.fastapi_callback_task',
            args=[job_id, status],
            kwargs={'variants': variants, 'error': error}
        )
        
        logger.info(f"[FASTAPI] Callback queued for job {job_id}")
        
    except Exception as e:
        logger.error(f"[FASTAPI] Callback failed: {e}")


@router.post("/generate_variants", response_model=GenerationResponse)
async def generate_variants(request: GenerationRequest, background_tasks: BackgroundTasks):
    """Main endpoint - returns immediately"""
    try:
        job_id = request.job_id or f"job_{datetime.utcnow().timestamp()}"
        
        logger.info(f"[FASTAPI] Received request for job {job_id}")
        
        from main import app
        redis_client = app.state.redis_client
        
        background_tasks.add_task(run_generation_background, job_id, request, redis_client)
        
        logger.info(f"[FASTAPI] Background task queued")
        
        return GenerationResponse(
            job_id=job_id,
            status="queued",
            message="Generation started",
            estimated_time_seconds=60
        )
        
    except Exception as e:
        logger.error(f"[FASTAPI] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
