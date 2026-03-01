"""
Timetable Generation Service
Core business logic for timetable generation orchestration
"""
import logging
import asyncio
from typing import Optional, Dict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class GenerationService:
    """
    Timetable generation service.
    
    Orchestrates the multi-stage generation process using Saga pattern.
    Handles hardware-adaptive execution and progress tracking.
    """
    
    def __init__(self, redis_client, hardware_profile):
        """
        Initialize generation service.
        
        Args:
            redis_client: Redis client for caching and progress tracking
            hardware_profile: Detected hardware profile for adaptive execution
        """
        self.redis = redis_client
        self.hardware_profile = hardware_profile
        logger.debug("Generation service initialized")
    
    async def generate_timetable(
        self,
        job_id: str,
        organization_id: str,
        semester: int,
        time_config: Optional[Dict] = None
    ):
        """
        Generate timetable asynchronously.
        
        This is the main entry point for timetable generation.
        It uses the Saga pattern to manage the multi-stage workflow.
        
        Args:
            job_id: Unique job identifier
            organization_id: Organization ID or name
            semester: Semester number
            time_config: Optional time configuration
        """
        logger.info(f"[JOB {job_id}] Starting generation for org={organization_id}, semester={semester}")
        
        try:
            # Store start time in Redis
            if self.redis:
                self.redis.set(
                    f"start_time:job:{job_id}",
                    datetime.now(timezone.utc).isoformat(),
                    ex=3600
                )
            
            # Import Saga pattern
            from core.patterns.saga import TimetableGenerationSaga
            
            # Create Saga with Redis client for database access
            saga = TimetableGenerationSaga(redis_client=self.redis)
            
            # Prepare request data
            request_data = {
                'organization_id': organization_id,
                'semester': semester,
                'time_config': time_config
            }
            
            # Execute Saga with 60-minute timeout (BHU full university = ~27 min observed)
            results = await asyncio.wait_for(
                saga.execute(job_id, request_data),
                timeout=3600  # 60 minutes
            )
            
            logger.info(f"[JOB {job_id}] ✅ Generation completed successfully")
            
            return results
            
        except asyncio.TimeoutError:
            # Remove from running jobs on timeout
            if self.redis:
                self.redis.delete(f"start_time:job:{job_id}")
            logger.error(f"[JOB {job_id}] ❌ Generation timed out")
            await self._handle_timeout(job_id)
            raise
            
        except asyncio.CancelledError:
            # Remove from running jobs on cancellation
            if self.redis:
                self.redis.delete(f"start_time:job:{job_id}")
            logger.warning(f"[JOB {job_id}] ⚠️  Generation cancelled by user")
            await self._handle_cancellation(job_id)
            raise
            
        except Exception as e:
            logger.error(f"[JOB {job_id}] ❌ Generation failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            await self._handle_error(job_id, e)
            raise
            
        finally:
            # Cleanup
            logger.debug(f"[JOB {job_id}] Cleaning up resources")
            await self._cleanup(job_id)
    
    async def _handle_timeout(self, job_id: str):
        """Handle job timeout — write failed status to Redis and DB so Django SSE terminates."""
        import time, json, os
        if self.redis:
            self.redis.delete(f"cancel:job:{job_id}")
            self.redis.delete(f"start_time:job:{job_id}")
            # Write failed status to progress key so Django SSE emits 'done' and stops
            try:
                key = f"progress:job:{job_id}"
                existing_raw = self.redis.get(key)
                existing = json.loads(existing_raw) if existing_raw else {}
                now = int(time.time())
                failed_data = {
                    'job_id': job_id,
                    'stage': 'failed',
                    'stage_progress': existing.get('stage_progress', 0.0),
                    'overall_progress': existing.get('overall_progress', 0.0),
                    'status': 'failed',
                    'eta_seconds': None,
                    'started_at': existing.get('started_at', now),
                    'last_updated': now,
                    'failed_at': now,
                    'metadata': {'error': 'Generation timed out (60-minute limit exceeded)'},
                }
                self.redis.setex(key, 7200, json.dumps(failed_data))
                logger.info(f"[JOB {job_id}] Wrote failed status to Redis")
            except Exception as e:
                logger.warning(f"[JOB {job_id}] Could not write failed status to Redis: {e}")
        # Also update the Django DB directly
        try:
            import psycopg2
            from datetime import datetime, timezone
            db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sih28')
            db_conn = psycopg2.connect(db_url, connect_timeout=5)
            db_conn.autocommit = False
            with db_conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE generation_jobs
                    SET status = 'failed',
                        error_message = 'Generation timed out (60-minute limit exceeded)',
                        updated_at = %s
                    WHERE id = %s AND status NOT IN ('completed', 'approved', 'cancelled')
                    """,
                    (datetime.now(timezone.utc), job_id)
                )
            db_conn.commit()
            db_conn.close()
            logger.info(f"[JOB {job_id}] Marked as failed in DB (timeout)")
        except Exception as db_err:
            logger.warning(f"[JOB {job_id}] Could not update DB on timeout: {db_err}")
    
    async def _handle_cancellation(self, job_id: str):
        """Handle asyncio.CancelledError path (external/forced task cancellation).

        This is distinct from the cooperative ``CancellationError`` path that
        saga.execute() handles internally (which calls ``tracker.mark_cancelled()``
        itself).  This method fires when the asyncio Task is cancelled externally
        — e.g. a server restart while a job is in-flight.  Without writing a
        terminal state here the progress key would stay ``'running'`` for 2 hours
        (its TTL), causing the frontend SSE loop to keep reconnecting.
        """
        if self.redis:
            try:
                import json as _json, time as _time
                now = int(_time.time())
                existing_raw = self.redis.get(f"progress:job:{job_id}")
                existing = _json.loads(existing_raw) if existing_raw else {}
                cancelled_data = {
                    'job_id':           job_id,
                    'stage':            'cancelled',
                    'stage_progress':   0.0,
                    'overall_progress': 0.0,
                    'status':           'cancelled',
                    'eta_seconds':      None,
                    'started_at':       existing.get('started_at', now),
                    'last_updated':     now,
                    'cancelled_at':     now,
                    'metadata':         {'error': 'Job cancelled externally (server shutdown?)'},
                }
                self.redis.setex(
                    f"progress:job:{job_id}", 7200, _json.dumps(cancelled_data)
                )
            except Exception:
                pass
            # Clean all ephemeral keys in one pipeline
            try:
                pipe = self.redis.pipeline(transaction=False)
                pipe.delete(f"cancel:job:{job_id}")
                pipe.delete(f"start_time:job:{job_id}")
                pipe.delete(f"state:job:{job_id}")
                pipe.execute()
            except Exception:
                pass
    
    async def _handle_error(self, job_id: str, error: Exception):
        """Handle job error — fallback DB write in case _compensate in saga.py failed."""
        if self.redis:
            self.redis.delete(f"cancel:job:{job_id}")
            self.redis.delete(f"start_time:job:{job_id}")
        # Fallback: ensure the Django DB row is marked failed so the API never
        # returns 'running' for this job on subsequent polls (which would cause
        # an infinite SSE-reconnect loop in the frontend).
        try:
            import os, psycopg2
            from datetime import datetime, timezone
            db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sih28')
            db_conn = psycopg2.connect(db_url, connect_timeout=5)
            db_conn.autocommit = False
            with db_conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE generation_jobs
                    SET status = 'failed',
                        error_message = %s,
                        updated_at = %s
                    WHERE id = %s AND status NOT IN ('completed', 'cancelled', 'approved')
                    """,
                    (str(error)[:500], datetime.now(timezone.utc), job_id)
                )
            db_conn.commit()
            db_conn.close()
            logger.info(f"[JOB {job_id}] Fallback: marked as failed in DB (_handle_error)")
        except Exception as db_err:
            logger.warning(f"[JOB {job_id}] Fallback DB write failed: {db_err}")
    
    async def _cleanup(self, job_id: str):
        """Clean up ephemeral Redis keys and process memory after any terminal state.

        Always called from the ``finally`` block in ``generate_timetable`` —
        runs whether the job succeeded, failed, or was cancelled.

        Keys intentionally KEPT (read by other consumers):
            ``progress:job:{job_id}``  — frontend SSE reads terminal status; TTL=7200s
            ``result:job:{job_id}``   — variants API reads scores/metrics; TTL=86400s

        Keys explicitly DELETED (ephemeral control-plane signals):
            ``cancel:job:{job_id}``   — cancellation flag
            ``start_time:job:{job_id}``— job wall-clock start (used for admin elapsed-time)
            ``state:job:{job_id}``    — CancellationToken state-machine key

        Previously only ``cancel:job:`` was deleted here, causing ``start_time``
        and ``state`` to linger for up to 1 hour and pollute admin dashboards.
        """
        try:
            if self.redis:
                # Single pipeline round-trip for all ephemeral key deletes
                pipe = self.redis.pipeline(transaction=False)
                pipe.delete(f"cancel:job:{job_id}")
                pipe.delete(f"start_time:job:{job_id}")
                pipe.delete(f"state:job:{job_id}")
                pipe.execute()
        except Exception as e:
            logger.warning(f"[JOB {job_id}] Redis cleanup error (non-fatal): {e}")

        # Force GC to reclaim large in-memory structures (courses, students,
        # solution dicts) that the saga held during execution.
        try:
            import gc
            gc.collect()
        except Exception:
            pass

        logger.debug(f"[JOB {job_id}] Cleanup complete")
