"""
Timetable Generation Router
Handles main timetable generation requests
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
import logging
import uuid

from api.deps import get_redis_client, get_hardware_profile

router = APIRouter(prefix="/api", tags=["generation"])
logger = logging.getLogger(__name__)


class TimeConfig(BaseModel):
    """Time configuration model"""
    working_days: int = 6
    slots_per_day: int = 9
    start_time: str = "09:00"
    slot_duration_minutes: int = 60


class GenerationRequest(BaseModel):
    """Timetable generation request model"""
    organization_id: str
    semester: int
    time_config: Optional[TimeConfig] = None
    job_id: Optional[str] = None  # For Celery compatibility
    department_id: Optional[str] = None  # For Celery compatibility
    batch_ids: Optional[List[str]] = None  # For Celery compatibility
    academic_year: Optional[str] = None  # For Celery compatibility


class GenerationResponse(BaseModel):
    """Timetable generation response model"""
    job_id: str
    status: str
    message: str
    estimated_time_minutes: Optional[int] = None


@router.post("/generate", response_model=GenerationResponse)
@router.post("/generate_variants", response_model=GenerationResponse)  # Alias for Celery compatibility
async def generate_timetable(
    request: GenerationRequest,
    background_tasks: BackgroundTasks,
    redis = Depends(get_redis_client),
    hardware_profile = Depends(get_hardware_profile)
):
    """
    Generate timetable using adaptive multi-stage algorithm.
    
    This endpoint starts an asynchronous timetable generation job.
    Progress can be tracked via WebSocket at /ws/progress/{job_id}
    
    Args:
        request: Generation request with organization_id and semester
        background_tasks: FastAPI background tasks
        redis: Redis client for job tracking
        hardware_profile: Detected hardware profile
        
    Returns:
        Job ID and estimated completion time
    """
    try:
        # Generate unique job ID (use provided job_id from Celery if available)
        job_id = request.job_id or str(uuid.uuid4())
        
        logger.info(f"[GENERATION] New job {job_id} for org {request.organization_id}, semester {request.semester}")
        
        # Get estimated time based on hardware
        from engine.hardware import get_optimal_config
        optimal_config = get_optimal_config(hardware_profile)
        estimated_minutes = optimal_config.get('expected_time_minutes', 10)
        
        # Import generation service
        from core.services.generation_service import GenerationService
        
        service = GenerationService(redis, hardware_profile)
        
        # Start generation in background
        background_tasks.add_task(
            service.generate_timetable,
            job_id=job_id,
            organization_id=request.organization_id,
            semester=request.semester,
            time_config=request.time_config.dict() if request.time_config else None
        )
        
        return GenerationResponse(
            job_id=job_id,
            status="started",
            message="Timetable generation started",
            estimated_time_minutes=estimated_minutes
        )
        
    except Exception as e:
        logger.error(f"[GENERATION] Failed to start: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview")
async def preview_generation(
    organization_id: str,
    semester: int,
    redis = Depends(get_redis_client)
):
    """
    Preview generation parameters before starting.
    
    Returns data counts and estimated time without starting generation.
    """
    try:
        from utils.django_client import DjangoAPIClient
        from engine.hardware import get_hardware_profile, get_optimal_config
        
        django_client = DjangoAPIClient(redis_client=redis)
        
        # Resolve org_id
        org_id = django_client.resolve_org_id(organization_id)
        
        # Fetch data counts
        courses = await django_client.fetch_courses(org_id, semester)
        faculty = await django_client.fetch_faculty(org_id)
        rooms = await django_client.fetch_rooms(org_id)
        time_slots = await django_client.fetch_time_slots(org_id, None)
        students = await django_client.fetch_students(org_id)
        
        # Get hardware estimates
        hardware = get_hardware_profile()
        config = get_optimal_config(hardware)
        
        await django_client.close()
        
        return {
            "organization_id": org_id,
            "semester": semester,
            "data": {
                "courses": len(courses),
                "faculty": len(faculty),
                "rooms": len(rooms),
                "time_slots": len(time_slots),
                "students": len(students)
            },
            "estimation": {
                "time_minutes": config.get('expected_time_minutes', 10),
                "strategy": hardware.optimal_strategy.value,
                "hardware_tier": config.get('tier', 'unknown')
            }
        }
        
    except Exception as e:
        logger.error(f"[PREVIEW] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/variants/{job_id}")
async def get_job_variants(
    job_id: str,
    redis = Depends(get_redis_client)
):
    """
    Get generated timetable variants for a completed job.
    
    Args:
        job_id: Job identifier
        
    Returns:
        List of timetable variants
    """
    try:
        # Get job result from Redis
        result_key = f"result:job:{job_id}"
        result = redis.get(result_key)
        
        if not result:
            raise HTTPException(status_code=404, detail="Job not found or results expired")
        
        import json
        result_data = json.loads(result) if isinstance(result, (str, bytes)) else result
        
        return {
            "job_id": job_id,
            "status": "completed",
            "variants": result_data.get("variants", []),
            "timetable": result_data.get("timetable", {}),
            "metadata": result_data.get("metadata", {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VARIANTS] Error fetching variants for {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel/{job_id}")
async def cancel_generation(
    job_id: str,
    redis = Depends(get_redis_client)
):
    """
    Cancel a running timetable generation job.
    
    Industry-standard cooperative cancellation:
    - Cancellation is requested, not forced
    - Job stops at next safe point
    - Partial results are discarded
    
    Args:
        job_id: Job identifier to cancel
        
    Returns:
        Cancellation status
    """
    try:
        from core.cancellation import request_cancellation, CancellationReason
        
        # Request cancellation
        success = request_cancellation(
            job_id,
            redis,
            CancellationReason.USER_REQUESTED
        )
        
        if success:
            logger.info(f"[CANCEL] Cancellation requested for job {job_id}")
            return {
                "job_id": job_id,
                "status": "cancellation_requested",
                "message": "Job will stop at next safe point"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to request cancellation"
            )
            
    except Exception as e:
        logger.error(f"[CANCEL] Error cancelling job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
