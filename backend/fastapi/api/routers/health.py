"""
Health Check and Status Router
Handles system health, status, and diagnostics endpoints
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import logging

from api.deps import get_redis_client, get_hardware_profile
from engine.hardware import HardwareProfile

router = APIRouter(prefix="/api", tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check(redis = Depends(get_redis_client)):
    """
    Enterprise health check endpoint.
    Returns service status, Redis connection, and system info.
    """
    try:
        # Check Redis
        redis_ok = False
        try:
            redis.ping()
            redis_ok = True
        except:
            pass
        
        health_status = {
            "service": "Enterprise Timetable Generation",
            "status": "healthy" if redis_ok else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "redis": "connected" if redis_ok else "disconnected",
            "version": "2.0.0"
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "service": "Enterprise Timetable Generation",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/status/{job_id}")
async def get_job_status(job_id: str, redis = Depends(get_redis_client)):
    """
    Get job status and progress.
    
    Args:
        job_id: Job identifier
        
    Returns:
        Job status metadata
    """
    try:
        return {
            "job_id": job_id,
            "status": "unknown",
            "message": "Progress tracking disabled"
        }
            
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "job_id": job_id,
            "status": "error",
            "error": str(e)
        }


@router.get("/hardware")
async def get_hardware_info(hardware: HardwareProfile = Depends(get_hardware_profile)):
    """
    Get detected hardware profile.
    Shows CPU, GPU, RAM, and optimal execution strategy.
    """
    return hardware.to_dict()


@router.post("/cancel/{job_id}")
async def cancel_job(job_id: str, redis = Depends(get_redis_client)):
    """
    Cancel a running job.
    
    Args:
        job_id: Job identifier to cancel
        
    Returns:
        Cancellation status
    """
    try:
        # Set cancellation flag in Redis
        redis.set(f"cancel:job:{job_id}", "true", ex=3600)
        
        logger.info(f"Cancellation requested for job {job_id}")
        
        return {
            "job_id": job_id,
            "status": "cancellation_requested",
            "message": "Job will be cancelled at next checkpoint"
        }
        
    except Exception as e:
        logger.error(f"Cancellation failed: {e}")
        return {
            "job_id": job_id,
            "status": "error",
            "error": str(e)
        }
