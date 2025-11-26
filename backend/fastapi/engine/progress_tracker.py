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
    Time-based Virtual Progress Smoothing (Chrome/TensorFlow/Steam style)
    - Smooth progress updates every 100ms regardless of algorithm state
    - Based on expected stage durations, not internal algorithm steps
    - Never stuck, never jumps backward
    - Works perfectly with blocking algorithms (CP-SAT, GA, RL)
    """
    
    def __init__(self, job_id: str, estimated_total_seconds: int, redis_client):
        self.job_id = job_id
        self.redis_client = redis_client
        
        # Time-based tracking
        self.start_time = time.time()
        self.last_progress = 0.0
        
        # Stage configuration with expected durations (seconds)
        # Weights: load=5%, cluster=10%, cpsat=50%, ga=25%, rl=8%, final=2%
        self.stage_config = {
            'load_data': {'weight': 5, 'expected_time': 2},     # 0% → 5%
            'clustering': {'weight': 10, 'expected_time': 3},   # 5% → 15%
            'cpsat': {'weight': 50, 'expected_time': 10},       # 15% → 65%
            'ga': {'weight': 25, 'expected_time': 10},          # 65% → 90%
            'rl': {'weight': 8, 'expected_time': 3},            # 90% → 98%
            'finalize': {'weight': 2, 'expected_time': 2}       # 98% → 100%
        }
        
        # Current stage tracking
        self.current_stage = 'load_data'
        self.stage_start_time = self.start_time
        self.stage_start_progress = 0.0
        
        # Work-based tracking (for measurable stages)
        self.stage_items_total = 0
        self.stage_items_done = 0
        
        logger.info(f"[PROGRESS] Time-based virtual progress tracker initialized for {job_id}")
    
    def set_stage(self, stage_name: str, total_items: int = 0):
        """Set current stage with optional work tracking - NO JUMP"""
        if stage_name in self.stage_config:
            # Calculate expected stage start progress
            stage_order = ['load_data', 'clustering', 'cpsat', 'ga', 'rl', 'finalize']
            if stage_name in stage_order:
                idx = stage_order.index(stage_name)
                expected_start = sum(self.stage_config[s]['weight'] for s in stage_order[:idx])
            else:
                expected_start = 0
            
            # CRITICAL: Use current progress as start if it's higher (no backward jump)
            self.stage_start_progress = max(expected_start, self.last_progress)
            
            self.current_stage = stage_name
            self.stage_start_time = time.time()
            
            # Work-based tracking
            self.stage_items_total = total_items
            self.stage_items_done = 0
            
            if total_items > 0:
                logger.info(f"[PROGRESS] Stage: {stage_name} (start: {self.stage_start_progress:.1f}%, items: {total_items})")
            else:
                logger.info(f"[PROGRESS] Stage: {stage_name} (start: {self.stage_start_progress:.1f}%, time-based)")
    
    def update_work_progress(self, items_done: int):
        """Update work-based progress (for CP-SAT clusters, GA generations, RL episodes)"""
        self.stage_items_done = items_done
    
    def mark_stage_complete(self):
        """Mark current stage as completed - NO JUMP, just log"""
        # Don't force jump - let work-based or time-based progress naturally reach end
        logger.info(f"[PROGRESS] Stage {self.current_stage} completed at {self.last_progress:.1f}%")
        
        # Reset work tracking for next stage
        self.stage_items_total = 0
        self.stage_items_done = 0
    
    def calculate_smooth_progress(self) -> float:
        """
        HYBRID Progress Tracking - FIXED sticking and jumping
        - Use ACTUAL work completion when available
        - Fall back to time-based smoothing
        - ALWAYS increment (never stick)
        """
        stage_config = self.stage_config.get(self.current_stage, {'weight': 0, 'expected_time': 1})
        stage_weight = stage_config['weight']
        
        # HYBRID: Use actual work if available, otherwise use time
        if self.stage_items_total > 0:
            # Work-based progress (CP-SAT clusters, GA generations, RL episodes)
            work_completion = min(1.0, self.stage_items_done / self.stage_items_total)
            stage_progress = work_completion * stage_weight
        else:
            # Time-based progress (for stages without measurable work)
            now = time.time()
            stage_elapsed = now - self.stage_start_time
            stage_expected_time = stage_config['expected_time']
            
            raw_progress = stage_elapsed / stage_expected_time
            
            # Smooth asymptotic approach
            if raw_progress < 1.0:
                smooth_progress = raw_progress
            else:
                # Slow down but keep moving
                overtime = raw_progress - 1.0
                smooth_progress = 0.99 - 0.99 * (0.5 ** overtime)
            
            stage_progress = smooth_progress * stage_weight
        
        # Map to overall progress
        current_progress = self.stage_start_progress + stage_progress
        
        # CRITICAL FIX: ALWAYS increment, never stick
        now = time.time()
        time_since_last_update = now - getattr(self, '_last_update_time', now)
        self._last_update_time = now
        
        # Minimum increment based on time (0.05% per 100ms = smooth)
        min_increment = 0.05 * (time_since_last_update / 0.1)
        
        if current_progress <= self.last_progress:
            # Force increment if stuck
            current_progress = self.last_progress + min_increment
        elif current_progress - self.last_progress < min_increment:
            # Ensure minimum increment
            current_progress = self.last_progress + min_increment
        
        # Cap at 98% until explicitly completed
        current_progress = min(98.0, current_progress)
        
        # Update last_progress
        self.last_progress = current_progress
        
        return self.last_progress
    
    def calculate_eta(self) -> tuple[int, str]:
        """Adaptive ETA based on actual progress rate"""
        elapsed = time.time() - self.start_time
        
        # Use actual progress rate for accurate ETA
        if self.last_progress > 1:
            # Calculate time per percent based on actual progress
            time_per_percent = elapsed / self.last_progress
            remaining_percent = 100 - self.last_progress
            remaining = int(time_per_percent * remaining_percent)
        else:
            # Early stage: use expected total time
            remaining = 30
        
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
            # Calculate smooth progress (float for smooth updates)
            if force_progress is not None:
                progress = force_progress
                self.last_progress = float(progress)
            else:
                progress_float = self.calculate_smooth_progress()
                progress = int(progress_float)  # Convert to int for display
            
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
        """Update progress every 100ms for smooth real-time tracking"""
        try:
            update_count = 0
            while self.running:
                # Build message with work progress if available
                stage_name = self.tracker.current_stage.replace('_', ' ').title()
                
                if self.tracker.stage_items_total > 0:
                    # Show work progress
                    message = f"{stage_name}: {self.tracker.stage_items_done}/{self.tracker.stage_items_total}"
                else:
                    # Generic message
                    message = f"Processing: {stage_name}"
                
                await self.tracker.update(message)
                update_count += 1
                
                # Log every 10 updates (every 1 second) for debugging
                if update_count % 10 == 0:
                    logger.debug(f"[PROGRESS] {self.tracker.last_progress:.1f}% - {message}")
                
                await asyncio.sleep(0.1)  # Update every 100ms for ultra-smooth progress
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[PROGRESS] Update loop error: {e}")
