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


@shared_task(bind=True, max_retries=2, soft_time_limit=3600)
def generate_timetable_task(self, job_id, org_id, academic_year, semester):
    """
    ENTERPRISE ARCHITECTURE - Async Task Queue
    
    Flow:
    1. Django creates job → queues this Celery task → returns to frontend
    2. Celery calls FastAPI (fire-and-forget) → FastAPI returns immediately
    3. FastAPI runs generation in background → updates Redis every 5s
    4. Frontend polls Django → Django reads Redis → returns to frontend
    5. FastAPI completes → calls Celery callback → updates database
    
    This task completes in <5 seconds, actual generation runs in FastAPI background
    """
    job = None
    try:
        job = GenerationJob.objects.get(id=job_id)
        
        # Check hardware resources
        from core.hardware_detector import HardwareDetector
        if not HardwareDetector.can_handle_load():
            logger.warning(f"Insufficient resources, retrying job {job_id}")
            raise self.retry(countdown=60, max_retries=3)
        
        # Update job status
        job.status = 'queued'
        job.save()
        
        # Initialize Redis progress immediately
        from django.core.cache import cache
        cache.set(
            f"progress:job:{job_id}",
            {
                'job_id': str(job_id),
                'status': 'queued',
                'progress': 0,
                'stage': 'queued',
                'message': 'Job queued, waiting for FastAPI...',
            },
            timeout=7200  # 2 hours
        )
        
        # Call FastAPI (fire-and-forget - FastAPI returns immediately)
        fastapi_url = getattr(settings, 'FASTAPI_URL', 'http://localhost:8001')
        
        logger.info(f"[CELERY] Calling FastAPI for job {job_id}")
        
        try:
            # Convert semester to int
            try:
                semester_int = int(semester)
            except (ValueError, TypeError):
                semester_map = {'odd': 1, 'even': 2, 'ODD': 1, 'EVEN': 2}
                semester_int = semester_map.get(str(semester), 1)
            
            # CRITICAL FIX: Extract time_config from job data
            time_config = None
            if job.timetable_data and isinstance(job.timetable_data, dict):
                time_config = job.timetable_data.get('time_config')
            
            # Build request payload
            payload = {
                'job_id': str(job_id),
                'organization_id': org_id,
                'department_id': None,
                'batch_ids': [],
                'semester': semester_int,
                'academic_year': academic_year,
            }
            
            # Add time_config if available
            if time_config:
                payload['time_config'] = time_config
                logger.info(f"[CELERY] Sending time_config to FastAPI: {time_config}")
            else:
                logger.warning(f"[CELERY] No time_config found in job data for {job_id}")
            
            response = requests.post(
                f"{fastapi_url}/api/generate_variants",
                json=payload,
                timeout=5  # FastAPI MUST respond in <5s (just queues the job)
            )
            
            if response.status_code == 200:
                logger.info(f"[CELERY] Job {job_id} queued in FastAPI successfully")
                # FastAPI is now running generation in background
                # FastAPI will update Redis with progress
                # FastAPI will call fastapi_callback_task when done
                return {'status': 'queued', 'job_id': job_id}
            else:
                raise Exception(f"FastAPI returned {response.status_code}: {response.text}")
                
        except requests.exceptions.Timeout:
            logger.error(f"[CELERY] FastAPI timeout for job {job_id}")
            raise Exception("FastAPI took too long to respond (>5s). Service may be overloaded.")
        except requests.exceptions.ConnectionError:
            logger.error(f"[CELERY] Cannot connect to FastAPI for job {job_id}")
            raise Exception("FastAPI service unavailable. Check if FastAPI is running.")
            
    except Exception as e:
        logger.error(f"[CELERY] Job {job_id} failed: {str(e)}")
        if job:
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
            
            # Update Redis so frontend knows it failed
            from django.core.cache import cache
            cache.set(
                f"progress:job:{job_id}",
                {
                    'job_id': str(job_id),
                    'status': 'failed',
                    'progress': 0,
                    'stage': 'failed',
                    'message': str(e),
                    'error': str(e)
                },
                timeout=7200
            )
        
        # Decrement concurrent counter
        TenantLimits.decrement_concurrent(org_id)
        
        return {'status': 'failed', 'error': str(e)}


@shared_task
def fastapi_callback_task(job_id, status, variants=None, error=None):
    """
    ENTERPRISE CALLBACK - Called by FastAPI when generation completes
    
    FastAPI sends Celery task (async, reliable) instead of HTTP callback
    This ensures callback is never lost even if Django is temporarily down
    """
    try:
        job = GenerationJob.objects.get(id=job_id)
        
        if status == 'cancelled':
            job.status = 'cancelled'
            job.error_message = 'Cancelled by user'
            job.completed_at = timezone.now()
            logger.info(f"[CALLBACK] Job {job_id} cancelled")
            
            # Update Redis
            from django.core.cache import cache
            cache.set(
                f"progress:job:{job_id}",
                {
                    'job_id': str(job_id),
                    'status': 'cancelled',
                    'progress': 0,
                    'stage': 'cancelled',
                    'message': 'Generation cancelled by user',
                },
                timeout=7200
            )
        
        elif status == 'completed':
            job.status = 'completed'
            job.progress = 100
            job.completed_at = timezone.now()
            
            if variants:
                job.timetable_data = {'variants': variants}
            
            logger.info(f"[CALLBACK] Job {job_id} completed successfully with {len(variants) if variants else 0} variants")
            
            # Update Redis with final status
            from django.core.cache import cache
            cache.set(
                f"progress:job:{job_id}",
                {
                    'job_id': str(job_id),
                    'status': 'completed',
                    'progress': 100,
                    'stage': 'completed',
                    'message': 'Generation completed successfully',
                },
                timeout=7200
            )
            
        elif status == 'failed':
            job.status = 'failed'
            job.error_message = error or 'Generation failed - check logs'
            job.completed_at = timezone.now()
            logger.error(f"[CALLBACK] Job {job_id} failed: {error or 'No error message'}")
            
            # Update Redis with failed status
            from django.core.cache import cache
            cache.set(
                f"progress:job:{job_id}",
                {
                    'job_id': str(job_id),
                    'status': 'failed',
                    'progress': 0,
                    'stage': 'failed',
                    'message': error or 'Generation failed',
                    'error': error or 'Generation failed'
                },
                timeout=7200
            )
        
        job.save()
        
        # Cleanup temporary Redis keys
        from django.core.cache import cache
        cache.delete(f"generation_queue:{job_id}")
        cache.delete(f"cancel:job:{job_id}")  # Cleanup cancel flag
        
        # Decrement concurrent counter
        org_id = job.organization.org_code if job.organization else 'unknown'
        TenantLimits.decrement_concurrent(org_id)
        
        logger.info(f"[CALLBACK] Job {job_id} finalized, concurrent counter decremented")
        
    except GenerationJob.DoesNotExist:
        logger.error(f"[CALLBACK] Job {job_id} not found in database")
    except Exception as e:
        logger.error(f"[CALLBACK] Callback failed for job {job_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())


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
