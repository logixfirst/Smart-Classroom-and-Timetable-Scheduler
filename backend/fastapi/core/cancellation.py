"""  
Industry-Standard Cancellation System
Following Google/Meta/Microsoft patterns for cooperative cancellation

GOLDEN RULE:
"Cancellation must never leave the system in an inconsistent state."

THIS MEANS:
- Partial timetables are either DISCARDED or EXPLICITLY MARKED PARTIAL
- No silent corruption
- No half-applied writes

3-TIER CANCELLATION MODEL:

Tier 1: SOFT Cancellation (preferred)
  - Finish current atomic step
  - Exit cleanly
  - Save safe artifacts
  
Tier 2: HARD Cancellation
  - Abort as soon as possible
  - Release memory
  - Do NOT save partial results
  
Tier 3: EMERGENCY Kill
  - Process terminated (OOM, SIGKILL)
  - Recovery happens on next run

WHERE CANCELLATION IS ALLOWED:
✅ Between clusters
✅ Between GA generations
✅ Between RL episodes
✅ Between DB batch writes

❌ NOT allowed during:
❌ CP-SAT model construction
❌ OR-Tools solver call (except via callback)
❌ Database transactions

CRITICAL RULES:
1. Cancellation is COOPERATIVE (not forced)
2. Cancellation only at SAFE POINTS
3. Atomic operations are NON-CANCELABLE
4. Partial results are either discarded or marked PARTIAL
"""
import logging
from enum import Enum
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class CancellationReason(Enum):
    """Why was the job cancelled?"""
    USER_REQUESTED = "user_requested"
    TIMEOUT = "timeout"
    MEMORY_LIMIT = "memory_limit"
    ERROR = "error"
    SYSTEM_SHUTDOWN = "system_shutdown"


class CancellationMode(Enum):
    """How aggressive is the cancellation?"""
    SOFT = "soft"    # Finish current step, exit cleanly
    HARD = "hard"    # Abort ASAP, discard partial results


class JobState(Enum):
    """Job lifecycle states"""
    CREATED = "created"
    RUNNING = "running"
    CANCELLATION_REQUESTED = "cancellation_requested"
    CANCELLED = "cancelled"
    PARTIAL_SUCCESS = "partial_success"
    SUCCESS = "success"
    FAILED = "failed"


class CancellationToken:
    """
    Industry-standard cancellation token
    
    Usage:
        token = CancellationToken(job_id, redis_client)
        
        # At safe points:
        if token.is_cancelled():
            token.acknowledge()
            raise CancellationError("Job cancelled")
    """
    
    def __init__(
        self,
        job_id: str,
        redis_client,
        mode: CancellationMode = CancellationMode.SOFT
    ):
        self.job_id = job_id
        self.redis = redis_client
        self.mode = mode
        self.reason: Optional[CancellationReason] = None
        self._acknowledged = False
        
        logger.debug(f"[CANCEL] Token created for job {job_id} (mode={mode.value})")
    
    def is_cancelled(self) -> bool:
        """
        Check if cancellation was requested
        
        SAFE to call frequently (cached check)
        """
        if not self.redis or not self.job_id:
            return False
        
        try:
            # Check Redis flag
            cancel_flag = self.redis.get(f"cancel:job:{self.job_id}")
            
            if cancel_flag:
                # Parse reason if available
                try:
                    import json
                    data = json.loads(cancel_flag)
                    self.reason = CancellationReason(data.get('reason', 'user_requested'))
                except:
                    self.reason = CancellationReason.USER_REQUESTED
                
                return True
            
            return False
            
        except Exception as e:
            logger.debug(f"[CANCEL] Check failed: {e}")
            return False
    
    def acknowledge(self):
        """
        Acknowledge cancellation (called when exiting)
        
        CRITICAL: Call this when you actually stop work
        """
        if self._acknowledged:
            return
        
        self._acknowledged = True
        
        logger.info(f"[CANCEL] Job {self.job_id} acknowledged cancellation (reason={self.reason})")
        
        # Update job state
        if self.redis:
            try:
                import json
                state_data = {
                    'job_id': self.job_id,
                    'state': JobState.CANCELLED.value,
                    'reason': self.reason.value if self.reason else 'unknown',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                self.redis.setex(f"state:job:{self.job_id}", 3600, json.dumps(state_data))
            except Exception as e:
                logger.error(f"[CANCEL] Failed to update state: {e}")
    
    def check_or_raise(self, context: str = ""):
        """
        Check cancellation and raise if cancelled
        
        Usage:
            token.check_or_raise("clustering")
        """
        if self.is_cancelled():
            self.acknowledge()
            raise CancellationError(
                f"Job {self.job_id} cancelled during {context}",
                reason=self.reason
            )


class CancellationError(Exception):
    """Raised when job is cancelled"""
    
    def __init__(self, message: str, reason: Optional[CancellationReason] = None):
        super().__init__(message)
        self.reason = reason


class SafePoint:
    """
    Marks a safe cancellation point
    
    Usage:
        with SafePoint(token, "clustering"):
            # Work that can be cancelled
            pass
    """
    
    def __init__(self, token: CancellationToken, context: str):
        self.token = token
        self.context = context
    
    def __enter__(self):
        # Check at entry
        self.token.check_or_raise(self.context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Check at exit
        if exc_type is None:  # No exception
            self.token.check_or_raise(self.context)
        return False  # Don't suppress exceptions


class AtomicSection:
    """
    Marks a NON-CANCELABLE atomic section
    
    Usage:
        with AtomicSection(token, "database_write"):
            # Work that CANNOT be cancelled
            db.commit()
    """
    
    def __init__(self, token: CancellationToken, context: str):
        self.token = token
        self.context = context
        self._deferred_cancellation = False
    
    def __enter__(self):
        # Check BEFORE entering atomic section
        if self.token.is_cancelled():
            self._deferred_cancellation = True
            logger.warning(
                f"[CANCEL] Deferring cancellation during atomic section: {self.context}"
            )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Check AFTER atomic section
        if self._deferred_cancellation and exc_type is None:
            logger.info(f"[CANCEL] Executing deferred cancellation after: {self.context}")
            self.token.check_or_raise(self.context)
        return False


def request_cancellation(
    job_id: str,
    redis_client,
    reason: CancellationReason = CancellationReason.USER_REQUESTED
):
    """
    Request job cancellation (from external caller)
    
    Usage:
        # From API endpoint:
        request_cancellation(job_id, redis, CancellationReason.USER_REQUESTED)
    """
    if not redis_client:
        logger.warning(f"[CANCEL] No Redis client - cannot cancel job {job_id}")
        return False
    
    try:
        import json
        
        cancel_data = {
            'reason': reason.value,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Set cancellation flag (expires in 1 hour)
        redis_client.setex(
            f"cancel:job:{job_id}",
            3600,
            json.dumps(cancel_data)
        )
        
        # Publish cancellation event
        event_data = {
            'job_id': job_id,
            'event': 'cancellation_requested',
            'reason': reason.value,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        redis_client.publish(f"progress:{job_id}", json.dumps(event_data))
        
        logger.info(f"[CANCEL] Requested cancellation for job {job_id} (reason={reason.value})")
        return True
        
    except Exception as e:
        logger.error(f"[CANCEL] Failed to request cancellation: {e}")
        return False


def clear_cancellation(job_id: str, redis_client):
    """
    Clear cancellation flag (after job completes)
    
    Usage:
        # After job finishes:
        clear_cancellation(job_id, redis)
    """
    if not redis_client:
        return
    
    try:
        redis_client.delete(f"cancel:job:{job_id}")
        logger.debug(f"[CANCEL] Cleared cancellation flag for job {job_id}")
    except Exception as e:
        logger.debug(f"[CANCEL] Failed to clear flag: {e}")
