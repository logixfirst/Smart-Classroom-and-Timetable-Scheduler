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
        self._progress_lock = asyncio.Lock()  # Thread-safe progress updates
        
        # User-friendly stage names (hide technical details)
        self.stage_display_names = {
            'load_data': 'Loading courses and students',
            'clustering': 'Analyzing course groups',
            'cpsat': 'Creating initial schedule',
            'ga': 'Optimizing quality',
            'rl': 'Resolving conflicts',
            'finalize': 'Finalizing timetable'
        }
        
        # Stage configuration with ABSOLUTE cumulative progress boundaries
        # Total time: ~10-12 minutes = 600-720s
        # Observed: load=5s, cluster=10s, cpsat=180s, ga=300s, rl=180s, final=5s
        # Each stage has start_progress, end_progress, and expected_time
        self.stage_config = {
            'load_data': {'start': 0, 'end': 5, 'expected_time': 5},       # 0% → 5%
            'clustering': {'start': 5, 'end': 10, 'expected_time': 10},    # 5% → 10%
            'cpsat': {'start': 10, 'end': 60, 'expected_time': 180},       # 10% → 60%
            'ga': {'start': 60, 'end': 85, 'expected_time': 300},          # 60% → 85%
            'rl': {'start': 85, 'end': 95, 'expected_time': 180},          # 85% → 95%
            'finalize': {'start': 95, 'end': 100, 'expected_time': 5}      # 95% → 100%
        }
        
        # Current stage tracking
        self.current_stage = 'load_data'
        self.stage_start_time = self.start_time
        self.stage_start_progress = 0.0
        
        # Work-based tracking (for measurable stages)
        self.stage_items_total = 0
        self.stage_items_done = 0
        
        # Initialize ETA tracking variables
        self._smoothed_eta = estimated_total_seconds
        self._last_eta_update = self.start_time
        self._last_eta_value = estimated_total_seconds
        self._last_update_time = self.start_time
        
        logger.info(f"[PROGRESS] Time-based virtual progress tracker initialized for {job_id} (ETA: {estimated_total_seconds}s)")
    
    def set_stage(self, stage_name: str, total_items: int = 0):
        """Set current stage with absolute boundaries - SMOOTH TRANSITION"""
        if stage_name in self.stage_config:
            stage_info = self.stage_config[stage_name]
            
            # Use absolute stage boundaries for consistency
            stage_start = stage_info['start']
            stage_end = stage_info['end']
            
            # SMOOTH TRANSITION: If we're already past the stage start, continue from current
            # Otherwise, smoothly move to stage start
            if self.last_progress >= stage_start:
                # Already at or past stage start - use current progress
                self.stage_start_progress = self.last_progress
            else:
                # Need to reach stage start - use absolute start
                self.stage_start_progress = stage_start
                # Don't jump backward, ensure we're at stage start
                if self.last_progress < stage_start:
                    self.last_progress = stage_start
            
            self.stage_end_progress = stage_end
            self.current_stage = stage_name
            self.stage_start_time = time.time()
            
            # Work-based tracking
            self.stage_items_total = total_items
            self.stage_items_done = 0
            
            # Get user-friendly name for logging
            display_name = self.stage_display_names.get(stage_name, stage_name)
            logger.info(f"[PROGRESS] Stage: {display_name} ({self.stage_start_progress:.1f}% → {stage_end}%, items: {total_items})")
    
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
        ENTERPRISE SMOOTH: Chrome/TensorFlow style - NEVER jumps, NEVER sticks
        Uses absolute stage boundaries (start→end) for consistent progress ranges
        """
        now = time.time()
        time_since_last = now - getattr(self, '_last_update_time', now)
        self._last_update_time = now
        
        # Get stage boundaries
        stage_info = self.stage_config.get(self.current_stage, {'start': 0, 'end': 100, 'expected_time': 5})
        stage_start = self.stage_start_progress  # Actual start (may be past config start)
        stage_end = stage_info['end']
        stage_range = stage_end - stage_start
        
        # Calculate target progress based on work/time
        if self.stage_items_total > 0:
            # Work-based: Calculate target from actual completion
            work_ratio = min(1.0, self.stage_items_done / self.stage_items_total)
            target_progress = stage_start + (work_ratio * stage_range)
        else:
            # Time-based: Asymptotic approach to stage end
            elapsed = now - self.stage_start_time
            expected = stage_info.get('expected_time', 5)
            
            if elapsed < expected:
                ratio = elapsed / expected
            else:
                # Slow down exponentially after expected time
                overtime = elapsed - expected
                ratio = 1.0 - (0.01 * (0.5 ** (overtime / expected)))
            
            target_progress = stage_start + (ratio * stage_range)
        
        # Cap target at stage end (never exceed stage boundary)
        target_progress = min(stage_end, target_progress)
        
        # SMOOTH INTERPOLATION: Move towards target at constant speed
        # Speed: 0.3% per 500ms = 0.6% per second (smoother, prevents jumps)
        max_step = 0.3 * (time_since_last / 0.5)
        
        if target_progress > self.last_progress:
            # Move towards target smoothly
            step = min(max_step, target_progress - self.last_progress)
            new_progress = self.last_progress + step
        else:
            # Always move forward (minimum 0.03% per 500ms = never stuck)
            new_progress = self.last_progress + (0.03 * (time_since_last / 0.5))
        
        # Cap at stage end (never exceed current stage)
        new_progress = min(stage_end, new_progress)
        
        # Cap at 98% until final completion
        new_progress = min(98.0, new_progress)
        self.last_progress = new_progress
        
        return self.last_progress
    
    def calculate_eta(self) -> tuple[int, str]:
        """
        FIXED ETA: Calculate based on global time and stage expectations
        Prevents resets between stages by using total expected time, not progress-based calculation
        """
        elapsed = time.time() - self.start_time
        
        # Calculate remaining time based on stage expectations (more stable than progress-based)
        remaining_time = 0
        current_stage_found = False
        
        for stage_name, config in self.stage_config.items():
            if not current_stage_found:
                if stage_name == self.current_stage:
                    current_stage_found = True
                    # Calculate remaining time for current stage
                    stage_elapsed = time.time() - self.stage_start_time
                    stage_expected = config['expected_time']
                    stage_remaining = max(1, stage_expected - stage_elapsed)
                    remaining_time += stage_remaining
                # else: stage already completed, skip
            else:
                # Add time for all future stages
                remaining_time += config['expected_time']
        
        # If progress > 90%, use progress-based calculation for final accuracy
        if self.last_progress > 90:
            # Near completion, switch to progress-based for accuracy
            if self.last_progress > 95:
                progress_based_eta = int(elapsed * (100 - self.last_progress) / self.last_progress)
                remaining_time = min(remaining_time, progress_based_eta)
        
        # Smooth ETA with exponential moving average (alpha=0.2 for more stability)
        if not hasattr(self, '_smoothed_eta'):
            self._smoothed_eta = remaining_time
            self._last_eta_update = time.time()
        else:
            # Update immediately on first call, then every 2 seconds
            time_since_update = time.time() - self._last_eta_update
            if time_since_update >= 1.5 or self._smoothed_eta == remaining_time:
                # Apply exponential smoothing (more responsive on startup)
                alpha = 0.3 if time_since_update < 10 else 0.2  # More responsive in first 10 seconds
                self._smoothed_eta = int((1 - alpha) * self._smoothed_eta + alpha * remaining_time)
                self._last_eta_update = time.time()
        
        # Clamp to reasonable range (1 second to 15 minutes)
        remaining = max(1, min(900, self._smoothed_eta))
        
        # Ensure ETA decreases over time (never increases)
        if hasattr(self, '_last_eta_value'):
            if remaining > self._last_eta_value + 5:  # Allow 5s tolerance for smoothing
                remaining = self._last_eta_value  # Don't let it jump up
        self._last_eta_value = remaining
        
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
                progress = round(progress_float)  # Round to nearest integer
            
            # Calculate ETA
            remaining_seconds, eta = self.calculate_eta()
            
            # Get user-friendly stage name
            stage_display = self.stage_display_names.get(self.current_stage, message)
            
            # Build progress data with user-friendly names
            progress_data = {
                'job_id': self.job_id,
                'progress': progress,
                'progress_percent': progress,
                'status': 'completed' if progress >= 100 else 'running',
                'stage': stage_display,  # User-friendly name
                'message': stage_display,  # User-friendly message
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
        """Update progress every 500ms for smooth real-time tracking"""
        try:
            update_count = 0
            while self.running:
                # CHECK CANCELLATION: Stop progress updates if job cancelled
                if await self._check_cancellation():
                    logger.info(f"[PROGRESS] Job {self.tracker.job_id} cancelled - stopping progress updates")
                    self.running = False
                    break
                
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
                
                # Log every 4 updates (every 2 seconds) for debugging
                if update_count % 4 == 0:
                    logger.info(f"[PROGRESS] {self.tracker.last_progress:.1f}% - {message}")
                
                await asyncio.sleep(0.5)  # Update every 500ms (2 updates/sec = smooth + efficient)
        except asyncio.CancelledError:
            logger.info(f"[PROGRESS] Progress task cancelled for {self.tracker.job_id}")
        except Exception as e:
            logger.error(f"[PROGRESS] Update loop error: {e}")
    
    async def _check_cancellation(self) -> bool:
        """Check if job has been cancelled via Redis"""
        try:
            if self.tracker.redis_client and self.tracker.job_id:
                cancel_flag = self.tracker.redis_client.get(f"cancel:job:{self.tracker.job_id}")
                return cancel_flag is not None and cancel_flag
        except Exception as e:
            logger.debug(f"[PROGRESS] Cancellation check failed: {e}")
        return False
