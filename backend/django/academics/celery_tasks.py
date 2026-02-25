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
        
        # NOTE: job.status is already 'running' (set by generate view before queuing
        # the Celery task). Do NOT overwrite it with 'queued' here — that creates a
        # race condition where the SSE DB fallback streams status='queued' for up to
        # 34 seconds while FastAPI is already receiving and processing the job.
        
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
                # Increased from 5s: FastAPI queues the job in a background task,
                # but on first call (cold start) or under load it may take up to 30s
                # to return 200.  A Timeout here does NOT mean FastAPI missed the
                # request — it may already be processing it.  See the Timeout handler
                # below which intentionally avoids marking the job as failed.
                timeout=30,
            )
            
            if response.status_code == 200:
                logger.info(f"[CELERY] Job {job_id} queued in FastAPI successfully")
                # FastAPI is now running generation in background.
                # It will update Redis with progress and call fastapi_callback_task
                # when done.
                if job:
                    job.status = 'running'
                    job.save(update_fields=['status'])
                return {'status': 'queued', 'job_id': job_id}
            else:
                raise Exception(f"FastAPI returned {response.status_code}: {response.text}")
                
        except requests.exceptions.Timeout:
            # FastAPI did not respond within 30 s, but it may have already received
            # the POST and started the generation pipeline (the response just got
            # delayed).  Do NOT mark the job as failed — leave it in 'running' state
            # so the FastAPI → Celery callback can finalise it when it completes.
            logger.warning(
                f"[CELERY] FastAPI POST timed out for job {job_id} (30 s). "
                f"Generation may still be running inside FastAPI — leaving job "
                f"status as 'running' so the completion callback can update it."
            )
            if job:
                job.status = 'running'
                job.error_message = None
                job.save(update_fields=['status', 'error_message'])
            return {'status': 'timeout_but_may_be_running', 'job_id': job_id}

        except requests.exceptions.ConnectionError:
            # ConnectionError can fire if FastAPI accepted the POST but the HTTP
            # transport was reset before it sent the response back (e.g. server
            # briefly crashed and restarted, or the OS forcibly closed the socket).
            # In that case FastAPI may already be running the generation saga and
            # writing progress to Redis.  Mirror the Timeout handling: leave the
            # job as 'running' so the FastAPI → Celery completion callback can
            # correctly update it, rather than prematurely marking it failed.
            logger.warning(
                f"[CELERY] FastAPI connection reset for job {job_id}. "
                f"Generation may already be running inside FastAPI — leaving job "
                f"status as 'running' so the completion callback can update it."
            )
            if job:
                job.status = 'running'
                job.error_message = None
                job.save(update_fields=['status', 'error_message'])
            return {'status': 'connection_reset_but_may_be_running', 'job_id': job_id}
            
    except Exception as e:
        logger.error(f"[CELERY] Job {job_id} failed: {str(e)}")
        if job:
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
        
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
        
        elif status == 'completed':
            job.status = 'completed'
            job.progress = 100
            job.completed_at = timezone.now()
            
            if variants:
                job.timetable_data = {'variants': variants}
            
            logger.info(f"[CALLBACK] Job {job_id} completed successfully with {len(variants) if variants else 0} variants")
            
        elif status == 'failed':
            job.status = 'failed'
            job.error_message = error or 'Generation failed - check logs'
            job.completed_at = timezone.now()
            logger.error(f"[CALLBACK] Job {job_id} failed: {error or 'No error message'}")
        
        job.save()
        
        # Cleanup temporary Redis keys
        from django.core.cache import cache
        cache.delete(f"generation_queue:{job_id}")
        cache.delete(f"cancel:job:{job_id}")  # Cleanup cancel flag
        
        logger.info(f"[CALLBACK] Job {job_id} finalized")
        
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

@shared_task
def cleanup_tokens_task(grace_days: int = 1) -> dict:
    """
    Celery wrapper around the cleanup_tokens management command logic.

    Deletes OutstandingToken rows (and their cascade-deleted BlacklistedToken
    entries) that expired more than *grace_days* days ago.

    Called automatically by Celery beat (CELERY_BEAT_SCHEDULE in settings.py).
    Can also be enqueued manually: cleanup_tokens_task.delay(grace_days=2)
    """
    from datetime import timedelta
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

    cutoff = timezone.now() - timedelta(days=grace_days)
    deleted, _ = OutstandingToken.objects.filter(expires_at__lt=cutoff).delete()
    logger.info(
        "cleanup_tokens_task completed",
        extra={"deleted": deleted, "cutoff": cutoff.isoformat(), "grace_days": grace_days},
    )
    return {"deleted": deleted, "cutoff": cutoff.isoformat()}