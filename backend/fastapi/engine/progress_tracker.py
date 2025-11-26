"""
Enterprise Progress Tracker - Google/Microsoft Style
Smooth, consistent progress based on overall time, not stage completion
"""
import time
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import json

logger = logging.getLogger(__name__)


class EnterpriseProgressTracker:
    """
    Enterprise-level progress tracking with smooth interpolation
    - Progress based on elapsed time vs estimated total time
    - Never goes backwards
    - Smooth acceleration/deceleration curves
    - Consistent ETA updates
    """
    
    def __init__(self, job_id: str, estimated_total_seconds: int, redis_client):
        self.job_id = job_id
        self.estimated_total_seconds = estimated_total_seconds
        self.redis_client = redis_client
        
        self.start_time = time.time()
        self.last_progress = 0
        self.last_update_time = self.start_time
        
        # Stage weights (for better accuracy)
        self.stage_weights = {
            'load_data': 0.05,          # 5%
            'clustering': 0.10,          # 10%
            'cpsat': 0.50,               # 50%
            'ga': 0.25,                  # 25%
            'rl': 0.08,                  # 8%
            'finalize': 0.02             # 2%
        }
        
        self.current_stage = 'load_data'
        self.stage_start_progress = 0
        
        # Smoothing parameters
        self.min_progress_increment = 0.5  # Minimum 0.5% per update
        self.max_progress_jump = 5.0       # Maximum 5% jump
        
        logger.info(f"[PROGRESS] Initialized tracker for {job_id}: estimated {estimated_total_seconds}s")
    
    def set_stage(self, stage_name: str):
        """Set current stage for better progress estimation"""
        if stage_name in self.stage_weights:
            # Calculate cumulative progress up to this stage
            stage_order = ['load_data', 'clustering', 'cpsat', 'ga', 'rl', 'finalize']
            if stage_name in stage_order:
                idx = stage_order.index(stage_name)
                self.stage_start_progress = sum(self.stage_weights[s] for s in stage_order[:idx]) * 100
                self.current_stage = stage_name
                logger.info(f"[PROGRESS] Stage changed to {stage_name} (base: {self.stage_start_progress:.1f}%)")
    
    def calculate_smooth_progress(self) -> int:
        """
        Calculate smooth progress based on:
        1. Elapsed time vs estimated time (primary)
        2. Current stage (secondary for accuracy)
        3. Smoothing to prevent jumps/stalls
        """
        now = time.time()
        elapsed = now - self.start_time
        
        # Primary: Time-based progress (0-95%)
        time_progress = min(95, (elapsed / self.estimated_total_seconds) * 100)
        
        # Secondary: Stage-based progress (use stage base as minimum)
        stage_progress = self.stage_start_progress
        
        # CRITICAL FIX: Use MAX of time-based and stage-based to prevent backward movement
        # This ensures progress always moves forward when stages complete
        blended_progress = max(time_progress, stage_progress)
        
        # Smoothing: Never go backwards, limit jumps
        if blended_progress < self.last_progress:
            # Force forward movement (minimum 1% increment)
            blended_progress = self.last_progress + 1.0
        elif blended_progress - self.last_progress > self.max_progress_jump:
            blended_progress = self.last_progress + self.max_progress_jump
        
        # Cap at 98% until explicitly completed
        smooth_progress = min(98, int(blended_progress))
        
        self.last_progress = smooth_progress
        self.last_update_time = now
        
        return smooth_progress
    
    def calculate_eta(self) -> tuple[int, str]:
        """Calculate remaining time and ETA"""
        now = time.time()
        elapsed = now - self.start_time
        
        # Use current progress to estimate remaining time
        if self.last_progress > 0:
            # Estimated total time based on current progress rate
            estimated_total = (elapsed / self.last_progress) * 100
            remaining = max(10, int(estimated_total - elapsed))
        else:
            remaining = self.estimated_total_seconds
        
        # Add 10% buffer for safety
        remaining = int(remaining * 1.1)
        
        eta = (datetime.now(timezone.utc) + timedelta(seconds=remaining)).isoformat()
        
        return remaining, eta
    
    async def update(self, message: str, force_progress: Optional[int] = None):
        """
        Update progress with smooth interpolation
        
        Args:
            message: Status message to display
            force_progress: Force specific progress (for 100% completion)
        """
        if not self.redis_client:
            return
        
        try:
            # Calculate smooth progress
            if force_progress is not None:
                progress = force_progress
                self.last_progress = progress
            else:
                progress = self.calculate_smooth_progress()
            
            # Calculate ETA
            remaining_seconds, eta = self.calculate_eta()
            
            # Build progress data
            progress_data = {
                'job_id': self.job_id,
                'progress': progress,
                'progress_percent': progress,
                'status': 'completed' if progress >= 100 else 'running',
                'stage': message,
                'message': message,
                'time_remaining_seconds': remaining_seconds if progress < 100 else 0,
                'eta_seconds': remaining_seconds if progress < 100 else 0,
                'eta': eta if progress < 100 else datetime.now(timezone.utc).isoformat(),
                'timestamp': datetime.now(timezone.utc).timestamp()
            }
            
            # Store in Redis
            self.redis_client.setex(
                f"progress:job:{self.job_id}",
                3600,
                json.dumps(progress_data)
            )
            
            # Publish for real-time updates
            self.redis_client.publish(
                f"progress:{self.job_id}",
                json.dumps(progress_data)
            )
            
            logger.debug(f"[PROGRESS] {self.job_id}: {progress}% - {message} (ETA: {remaining_seconds}s)")
            
        except Exception as e:
            logger.error(f"[PROGRESS] Update failed: {e}")
    
    async def complete(self, message: str = "Timetable generation completed"):
        """Mark job as 100% complete"""
        await self.update(message, force_progress=100)
        logger.info(f"[PROGRESS] {self.job_id}: Completed in {time.time() - self.start_time:.1f}s")
    
    async def fail(self, error_message: str):
        """Mark job as failed"""
        if not self.redis_client:
            return
        
        try:
            progress_data = {
                'job_id': self.job_id,
                'progress': 0,
                'status': 'failed',
                'stage': 'Failed',
                'message': error_message,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            self.redis_client.setex(
                f"progress:job:{self.job_id}",
                3600,
                json.dumps(progress_data)
            )
            
            logger.error(f"[PROGRESS] {self.job_id}: Failed - {error_message}")
            
        except Exception as e:
            logger.error(f"[PROGRESS] Fail update failed: {e}")


class ProgressUpdateTask:
    """Background task to update progress every 2 seconds"""
    
    def __init__(self, tracker: EnterpriseProgressTracker):
        self.tracker = tracker
        self.running = False
        self.task = None
    
    async def start(self):
        """Start background progress updates"""
        self.running = True
        self.task = asyncio.create_task(self._update_loop())
        logger.info(f"[PROGRESS] Started background updates for {self.tracker.job_id}")
    
    async def stop(self):
        """Stop background progress updates"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info(f"[PROGRESS] Stopped background updates for {self.tracker.job_id}")
    
    async def _update_loop(self):
        """Update progress every 2 seconds for smooth tracking"""
        try:
            while self.running:
                await self.tracker.update(f"Processing: {self.tracker.current_stage}")
                await asyncio.sleep(2)  # Update every 2 seconds
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[PROGRESS] Update loop error: {e}")
