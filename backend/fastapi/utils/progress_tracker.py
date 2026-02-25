"""
Enterprise Progress Tracker - Google/Meta Style
Single Responsibility: Track and persist generation progress in Redis

Rule: The worker owns the progress
"""
import time
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ProgressTracker:
    """
    Cooperative progress tracker for timetable generation.
    
    Principles:
    - Worker emits progress (FastAPI engine)
    - Control plane stores progress (Redis)
    - UI subscribes to progress (SSE via Django)
    
    Progress is weighted across stages:
    - Load Data: 5%
    - Clustering: 10%
    - CP-SAT: 60%
    - GA: 15%
    - RL: 10%
    """
    
    # Stage weight distribution (total = 100%)
    STAGE_WEIGHTS = {
        'loading': {'start': 0, 'end': 5},
        'clustering': {'start': 5, 'end': 15},
        'cpsat_solving': {'start': 15, 'end': 75},
        'ga_optimization': {'start': 75, 'end': 90},
        'rl_refinement': {'start': 90, 'end': 100}
    }
    
    def __init__(self, job_id: str, redis_client):
        """
        Initialize progress tracker.
        
        Args:
            job_id: Unique generation job identifier
            redis_client: Redis connection for progress storage
        """
        self.job_id = job_id
        self.redis = redis_client
        self.key = f"progress:job:{job_id}"
        self.start_time = time.time()
        self.current_stage = None
        self.stage_start_time = None
        
        # Moving average for ETA stability (enterprise improvement)
        self.progress_history = []  # List of (timestamp, progress) tuples
        self.max_history_size = 10  # Keep last 10 data points
        
        # Initialize progress in Redis
        self._initialize_progress()
    
    def _write_to_redis(self, data: dict) -> None:
        """Single Redis write point — non-fatal on connection errors."""
        try:
            self.redis.setex(self.key, 7200, json.dumps(data))
        except Exception as e:
            logger.warning(
                "[PROGRESS] Redis write failed — job continues, progress invisible",
                extra={"job_id": self.job_id, "error": str(e)}
            )

    def _initialize_progress(self):
        """Set initial progress state in Redis"""
        initial_data = {
            'job_id': self.job_id,
            'stage': 'initializing',
            'stage_progress': 0.0,
            'overall_progress': 0.0,
            'status': 'running',
            'eta_seconds': None,
            'started_at': int(self.start_time),
            'last_updated': int(time.time()),
            'metadata': {}
        }
        self._write_to_redis(initial_data)
        logger.debug(f"[PROGRESS] Initialized tracking for job {self.job_id}")
    
    def start_stage(self, stage: str, total_items: int = 0):
        """
        Mark the start of a new stage.
        
        Args:
            stage: Stage identifier (must match STAGE_WEIGHTS keys)
            total_items: Total items to process in this stage (for granular progress)
        """
        if stage not in self.STAGE_WEIGHTS:
            logger.warning(f"[PROGRESS] Unknown stage: {stage}")
            return
        
        self.current_stage = stage
        self.stage_start_time = time.time()
        
        stage_bounds = self.STAGE_WEIGHTS[stage]
        overall = float(stage_bounds['start'])  # Ensure float
        
        metadata = {}
        if total_items > 0:
            metadata['total_items'] = total_items
            metadata['completed_items'] = 0
        
        self.update(
            stage=stage,
            stage_progress=0.0,
            overall_progress=overall,
            meta=metadata
        )
        
        logger.debug(f"[PROGRESS] Started stage: {stage} (progress: {overall}%)")
    
    def update_stage_progress(self, completed_items: int, total_items: int):
        """
        Update progress within current stage based on completed items.
        
        ENTERPRISE IMPROVEMENT:
        - Uses float precision (no int() rounding)
        - Prevents artificial jumps (14.3% → 14.9% → 15.0%)
        - Frontend receives smooth continuous values
        
        Args:
            completed_items: Number of items completed
            total_items: Total items in stage
        """
        if not self.current_stage:
            logger.warning("[PROGRESS] No active stage to update")
            return
        
        stage_bounds = self.STAGE_WEIGHTS[self.current_stage]
        stage_range = stage_bounds['end'] - stage_bounds['start']
        
        # Calculate stage progress percentage (FLOAT precision, no int())
        stage_progress = (completed_items / total_items) * 100 if total_items > 0 else 0.0
        
        # Map to overall progress (FLOAT precision)
        overall_progress = stage_bounds['start'] + ((stage_progress / 100) * stage_range)
        
        self.update(
            stage=self.current_stage,
            stage_progress=stage_progress,
            overall_progress=overall_progress,
            meta={
                'completed_items': completed_items,
                'total_items': total_items
            }
        )
    
    def complete_stage(self):
        """Mark current stage as complete"""
        if not self.current_stage:
            return
        
        stage_bounds = self.STAGE_WEIGHTS[self.current_stage]
        overall = float(stage_bounds['end'])  # Ensure float
        
        self.update(
            stage=self.current_stage,
            stage_progress=100.0,
            overall_progress=overall
        )
        
        logger.debug(f"[PROGRESS] Completed stage: {self.current_stage} (progress: {overall}%)")
    
    def update(
        self,
        stage: str,
        overall_progress: float,
        stage_progress: float,
        meta: Optional[Dict[str, Any]] = None
    ):
        """
        Core progress update method - writes to Redis.
        
        ENTERPRISE IMPROVEMENTS:
        - Accepts float progress (not int) for smooth gradations
        - Tracks progress history for velocity-based ETA
        - Provides continuous values for frontend physics animation
        
        Args:
            stage: Current stage name
            overall_progress: Overall completion (0-100, float)
            stage_progress: Stage-specific progress (0-100, float)
            meta: Additional metadata (clusters, items, etc.)
        """
        try:
            # Clamp to valid range but preserve float precision
            clamped_stage = min(100.0, max(0.0, stage_progress))
            clamped_overall = min(100.0, max(0.0, overall_progress))
            
            # Track progress for moving average ETA calculation
            current_time = time.time()
            self._track_progress_point(current_time, clamped_overall)
            
            data = {
                'job_id': self.job_id,
                'stage': stage,
                'stage_progress': round(clamped_stage, 2),  # Round to 2 decimals for JSON
                'overall_progress': round(clamped_overall, 2),
                'status': 'running',
                'eta_seconds': self._estimate_eta_moving_average(),
                'started_at': int(self.start_time),
                'last_updated': int(current_time),
                'metadata': meta or {}
            }
            
            # Store in Redis with 2-hour TTL
            self._write_to_redis(data)
            
            logger.debug(
                f"[PROGRESS] {self.job_id}: {clamped_overall:.2f}% "
                f"(stage: {stage} - {clamped_stage:.2f}%)"
            )
            
        except Exception as e:
            logger.error(f"[PROGRESS] Failed to update: {e}")
    
    def _track_progress_point(self, timestamp: float, progress: float):
        """
        Track progress history for moving average velocity calculation.
        
        Maintains a sliding window of recent progress measurements
        to smooth out ETA calculations during irregular backend updates.
        
        Args:
            timestamp: Current time
            progress: Current progress percentage
        """
        self.progress_history.append((timestamp, progress))
        
        # Keep only last N points (sliding window)
        if len(self.progress_history) > self.max_history_size:
            self.progress_history.pop(0)
    
    def _estimate_eta_moving_average(self) -> Optional[int]:
        """
        Calculate ETA using moving average velocity (ENTERPRISE IMPROVEMENT).
        
        WHY MOVING AVERAGE:
        - Simple linear extrapolation is unstable during CP-SAT cluster spikes
        - Moving average smooths out velocity fluctuations
        - More stable ETA even when progress is irregular
        
        METHOD:
        1. Track last N progress points with timestamps
        2. Calculate average velocity across window
        3. Extrapolate remaining time using average velocity
        
        FALLBACK:
        - If insufficient data, use simple linear extrapolation
        
        Returns:
            Estimated seconds remaining, or None if insufficient data
        """
        # Need at least 2 points to calculate velocity
        if len(self.progress_history) < 2:
            return self._estimate_eta_simple()
        
        # Get first and last point in history
        first_time, first_progress = self.progress_history[0]
        last_time, last_progress = self.progress_history[-1]
        
        # Calculate time span and progress span
        time_span = last_time - first_time
        progress_span = last_progress - first_progress
        
        # Avoid division by zero
        if time_span <= 0 or progress_span <= 0:
            return self._estimate_eta_simple()
        
        # Calculate average velocity (percent per second)
        avg_velocity = progress_span / time_span
        
        # Calculate remaining progress
        remaining_progress = 100.0 - last_progress
        
        # Extrapolate ETA using average velocity
        if avg_velocity > 0:
            eta_seconds = int(remaining_progress / avg_velocity)
            return max(0, eta_seconds)
        
        return self._estimate_eta_simple()
    
    def _estimate_eta_simple(self) -> Optional[int]:
        """
        Simple linear extrapolation fallback.
        
        Formula: ETA = (Elapsed / Progress%) - Elapsed
        
        Returns:
            Estimated seconds remaining, or None if insufficient data
        """
        if not self.progress_history:
            return None
        
        # Get latest progress
        _, current_progress = self.progress_history[-1]
        
        if current_progress <= 0:
            return None
        
        elapsed = time.time() - self.start_time
        
        # Avoid ETA calculation in first 5 seconds (unstable)
        if elapsed < 5:
            return None
        
        # Linear extrapolation
        total_estimated = elapsed / (current_progress / 100)
        remaining = int(total_estimated - elapsed)
        
        return max(0, remaining)
    
    def _estimate_eta(self, overall_progress: float) -> Optional[int]:
        """
        DEPRECATED: Legacy method for backward compatibility.
        Use _estimate_eta_moving_average() instead.
        
        Calculate estimated time remaining using linear extrapolation.
        
        Formula: ETA = (Elapsed / Progress%) - Elapsed
        
        Args:
            overall_progress: Current progress percentage
            
        Returns:
            Estimated seconds remaining, or None if insufficient data
        """
        if overall_progress <= 0:
            return None
        
        elapsed = time.time() - self.start_time
        
        # Avoid ETA calculation in first 5 seconds (unstable)
        if elapsed < 5:
            return None
        
        # Linear extrapolation
        total_estimated = elapsed / (overall_progress / 100)
        remaining = int(total_estimated - elapsed)
        
        return max(0, remaining)
    
    def mark_completed(self):
        """Mark job as successfully completed"""
        now = int(time.time())
        data = {
            'job_id': self.job_id,
            'stage': 'completed',
            'stage_progress': 100.0,
            'overall_progress': 100.0,
            'status': 'completed',
            'eta_seconds': 0,
            'started_at': int(self.start_time),
            'last_updated': now,
            'completed_at': now,
            'metadata': {}
        }
        self._write_to_redis(data)
        logger.info(f"[PROGRESS] Job {self.job_id} marked as completed")

    def mark_failed(self, error_message: str):
        """
        Mark job as failed.

        IMPORTANT: error is stored in metadata.error so the frontend
        (progress.metadata?.error) can display it correctly.
        """
        now = int(time.time())
        data = {
            'job_id': self.job_id,
            'stage': 'failed',
            'stage_progress': 0.0,
            'overall_progress': 0.0,
            'status': 'failed',
            'eta_seconds': None,          # Required by frontend ProgressData interface
            'started_at': int(self.start_time),
            'last_updated': now,
            'failed_at': now,
            'metadata': {
                'error': error_message,   # Frontend reads progress.metadata?.error
            },
        }
        self._write_to_redis(data)
        logger.error(f"[PROGRESS] Job {self.job_id} marked as failed: {error_message}")

    def mark_cancelled(self):
        """Mark job as cancelled by user"""
        now = int(time.time())
        data = {
            'job_id': self.job_id,
            'stage': 'cancelled',
            'stage_progress': 0.0,
            'overall_progress': 0.0,
            'status': 'cancelled',
            'eta_seconds': None,          # Required by frontend ProgressData interface
            'started_at': int(self.start_time),
            'last_updated': now,
            'cancelled_at': now,
            'metadata': {}
        }
        self._write_to_redis(data)
        logger.info(f"[PROGRESS] Job {self.job_id} marked as cancelled")
