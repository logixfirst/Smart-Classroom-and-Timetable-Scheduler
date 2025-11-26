"""
Continuous Resource Monitor - Detects memory pressure and triggers emergency actions
"""
import psutil
import logging
import asyncio
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class ResourceMonitor:
    """Monitor system resources and trigger progressive emergency actions"""
    
    def __init__(self):
        self.monitoring = False
        self.progressive_callbacks: dict = {}  # threshold -> callback
        self.triggered_thresholds: set = set()  # Track which thresholds already triggered
    
    async def start_monitoring(self, job_id: str, interval: int = 30):
        """Start continuous monitoring with progressive thresholds"""
        self.monitoring = True
        logger.info(f"[MONITOR] Started progressive resource monitoring for job {job_id}")
        
        while self.monitoring:
            try:
                mem = psutil.virtual_memory()
                
                # Check all thresholds in descending order
                for threshold in sorted(self.progressive_callbacks.keys(), reverse=True):
                    if mem.percent > threshold and threshold not in self.triggered_thresholds:
                        logger.warning(f"[MONITOR] Memory threshold {threshold}% exceeded: {mem.percent}%")
                        callback = self.progressive_callbacks[threshold]
                        await callback()
                        self.triggered_thresholds.add(threshold)
                        
                        # If critical threshold (95%), stop monitoring
                        if threshold >= 95:
                            self.monitoring = False
                            break
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"[MONITOR] Error: {e}")
                break
        
        logger.info(f"[MONITOR] Stopped monitoring for job {job_id}")
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False
    
    def set_progressive_callbacks(self, callbacks: dict):
        """Set progressive callbacks: {threshold: callback}"""
        self.progressive_callbacks = callbacks
        logger.info(f"[MONITOR] Progressive thresholds set: {list(callbacks.keys())}%")
    
    def set_emergency_callback(self, callback: Callable):
        """Legacy: Set callback for 85% memory"""
        self.progressive_callbacks[85] = callback
    
    def set_critical_callback(self, callback: Callable):
        """Legacy: Set callback for 95% memory"""
        self.progressive_callbacks[95] = callback
