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
        logger.info("Generation service initialized")
    
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
            
            # Execute Saga with 15-minute timeout
            results = await asyncio.wait_for(
                saga.execute(job_id, request_data),
                timeout=900  # 15 minutes
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
            logger.info(f"[JOB {job_id}] Cleaning up resources")
            await self._cleanup(job_id)
    
    async def _handle_timeout(self, job_id: str):
        """Handle job timeout"""
        if self.redis:
            import json
            timeout_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'failed',
                'stage': 'Timeout',
                'message': 'Generation timed out after 15 minutes',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.redis.setex(f"progress:job:{job_id}", 3600, json.dumps(timeout_data))
            self.redis.publish(f"progress:{job_id}", json.dumps(timeout_data))
            self.redis.delete(f"cancel:job:{job_id}")
            self.redis.delete(f"start_time:job:{job_id}")
    
    async def _handle_cancellation(self, job_id: str):
        """Handle job cancellation"""
        if self.redis:
            import json
            cancel_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'cancelled',
                'stage': 'Cancelled',
                'message': 'Generation cancelled by user',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.redis.setex(f"progress:job:{job_id}", 3600, json.dumps(cancel_data))
            self.redis.publish(f"progress:{job_id}", json.dumps(cancel_data))
            self.redis.delete(f"cancel:job:{job_id}")
            self.redis.delete(f"start_time:job:{job_id}")
    
    async def _handle_error(self, job_id: str, error: Exception):
        """Handle job error"""
        if self.redis:
            import json
            error_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'failed',
                'stage': 'Failed',
                'message': f'Generation failed: {str(error)}',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.redis.setex(f"progress:job:{job_id}", 3600, json.dumps(error_data))
            self.redis.publish(f"progress:{job_id}", json.dumps(error_data))
            self.redis.delete(f"cancel:job:{job_id}")
            self.redis.delete(f"start_time:job:{job_id}")
    
    async def _cleanup(self, job_id: str):
        """Cleanup resources after generation"""
        try:
            # Cleanup Redis flags
            if self.redis:
                self.redis.delete(f"cancel:job:{job_id}")
            
            # Force garbage collection
            import gc
            gc.collect()
            gc.collect()  # Double collect for thorough cleanup
            
            logger.debug(f"[JOB {job_id}] Cleanup complete")
            
        except Exception as e:
            logger.error(f"[JOB {job_id}] Cleanup error: {e}")
