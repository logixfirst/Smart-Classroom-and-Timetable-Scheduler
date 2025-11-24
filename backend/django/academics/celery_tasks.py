"""
Production-Grade Celery Tasks for Timetable Generation
Enterprise Architecture: Async Task Queue with Progress Tracking
"""

from celery import shared_task
from django.conf import settings
import requests
import logging
from .models import GenerationJob
from django.utils import timezone
from core.tenant_limits import TenantLimits

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, soft_time_limit=1800)
def generate_timetable_task(self, job_id, org_id, academic_year, semester):
    """
    Main timetable generation task
    
    Architecture:
    1. Celery receives task from Django
    2. Calls FastAPI /api/generate_variants (non-blocking)
    3. FastAPI queues background task and returns immediately
    4. FastAPI updates progress to Redis
    5. Frontend polls Django which reads from Redis
    6. FastAPI calls Django callback when complete
    """
    job = None
    try:
        job = GenerationJob.objects.get(id=job_id)
        
        # Check hardware resources
        from core.hardware_detector import HardwareDetector
        if not HardwareDetector.can_handle_load():
            logger.warning(f"Insufficient resources, retrying job {job_id}")
            raise self.retry(countdown=60, max_retries=5)
        
        job.status = 'running'
        job.save()
        
        # Call FastAPI (non-blocking - FastAPI returns immediately)
        fastapi_url = getattr(settings, 'FASTAPI_URL', 'http://localhost:8001')
        
        logger.info(f"Calling FastAPI for job {job_id}")
        
        try:
            # Convert semester to int if possible, otherwise use 1
            try:
                semester_int = int(semester)
            except (ValueError, TypeError):
                # If semester is 'odd', 'even', or other string, map to number
                semester_map = {'odd': 1, 'even': 2}
                semester_int = semester_map.get(str(semester).lower(), 1)
            
            response = requests.post(
                f"{fastapi_url}/api/generate_variants",
                json={
                    'job_id': str(job_id),
                    'organization_id': org_id,
                    'department_id': None,
                    'batch_ids': [],
                    'semester': semester_int,
                    'academic_year': academic_year,
                },
                timeout=10  # FastAPI should respond in <1 second
            )
            
            if response.status_code == 200:
                logger.info(f"Job {job_id} queued in FastAPI")
                # FastAPI will update progress to Redis
                # FastAPI will call Django callback when complete
                return {'status': 'queued', 'job_id': job_id}
            else:
                raise Exception(f"FastAPI returned {response.status_code}: {response.text}")
                
        except requests.exceptions.Timeout:
            logger.error(f"FastAPI timeout for job {job_id}")
            raise Exception("FastAPI service timeout")
        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot connect to FastAPI for job {job_id}")
            raise Exception("FastAPI service unavailable")
            
    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}")
        if job:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
        
        # Decrement concurrent counter
        TenantLimits.decrement_concurrent(org_id)
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def fastapi_callback_task(job_id, status, variants=None, error=None):
    """
    Callback task called by FastAPI when generation completes
    
    This is called by FastAPI via Celery queue (not direct HTTP)
    """
    try:
        job = GenerationJob.objects.get(id=job_id)
        
        if status == 'completed':
            job.status = 'completed'
            job.progress = 100
            job.completed_at = timezone.now()
            
            if variants:
                job.timetable_data = {'variants': variants}
            
            logger.info(f"Job {job_id} completed successfully")
            
        elif status == 'failed':
            job.status = 'failed'
            job.error_message = error or 'Unknown error'
            logger.error(f"Job {job_id} failed: {error}")
        
        job.save()
        
        # Decrement concurrent counter
        org_id = job.organization.org_code if job.organization else 'unknown'
        TenantLimits.decrement_concurrent(org_id)
        
    except GenerationJob.DoesNotExist:
        logger.error(f"Job {job_id} not found in callback")
    except Exception as e:
        logger.error(f"Callback failed for job {job_id}: {e}")


@shared_task
def cleanup_old_jobs():
    """Periodic task to cleanup old jobs"""
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(days=30)
    
    deleted = GenerationJob.objects.filter(
        created_at__lt=cutoff,
        status__in=['completed', 'failed']
    ).delete()
    
    logger.info(f"Cleaned up {deleted[0]} old jobs")
    return deleted[0]
