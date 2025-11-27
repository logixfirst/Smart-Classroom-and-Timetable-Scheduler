"""
Enterprise Memory Management System
Implements Google Chrome + Linux Kernel memory strategies
"""
import gc
import os
import logging
import psutil
import threading
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class MemoryPressure(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class MemoryBudget:
    total_gb: float
    reserved_for_os_gb: float = 2.0
    max_usage_percent: float = 75.0
    
    @property
    def available_gb(self) -> float:
        return max(0.5, self.total_gb - self.reserved_for_os_gb)
    
    @property
    def budget_gb(self) -> float:
        return self.available_gb * 0.7


class StreamingPopulation:
    """Lazy evaluation population - generates individuals on-the-fly"""
    
    def __init__(self, initial_solution: Dict, size: int, perturbation_fn):
        self.initial_solution = initial_solution
        self.size = size
        self.perturbation_fn = perturbation_fn
        self._best_solution = initial_solution.copy()
        self._best_fitness = -float('inf')
    
    def __len__(self):
        return self.size
    
    def __iter__(self):
        yield self.initial_solution
        for i in range(self.size - 1):
            individual = self.perturbation_fn(self.initial_solution)
            yield individual
    
    def evaluate_streaming(self, fitness_fn) -> List[tuple]:
        results = []
        for i, individual in enumerate(self):
            fitness = fitness_fn(individual)
            results.append((individual, fitness))
            
            if fitness > self._best_fitness:
                self._best_fitness = fitness
                self._best_solution = individual.copy()
            
            if i % 5 == 0:
                gc.collect(generation=0)
        
        return results
    
    @property
    def best_solution(self):
        return self._best_solution


class BoundedCache:
    """Fixed-size LRU cache"""
    
    def __init__(self, max_size: int = 50):
        self.max_size = max_size
        self._cache = {}
        self._access_order = []
    
    def get(self, key):
        if key in self._cache:
            self._access_order.remove(key)
            self._access_order.append(key)
            return self._cache[key]
        return None
    
    def set(self, key, value):
        if key in self._cache:
            self._access_order.remove(key)
            self._access_order.append(key)
            self._cache[key] = value
        else:
            if len(self._cache) >= self.max_size:
                lru_key = self._access_order.pop(0)
                del self._cache[lru_key]
            self._cache[key] = value
            self._access_order.append(key)
    
    def clear(self):
        self._cache.clear()
        self._access_order.clear()
    
    def __len__(self):
        return len(self._cache)


class MemoryMonitor:
    """Background memory pressure monitor"""
    
    def __init__(self, check_interval: float = 1.0):
        self.check_interval = check_interval
        self.running = False
        self._thread = None
        self._callbacks = []
        self._last_pressure = MemoryPressure.LOW
    
    def register_callback(self, pressure: MemoryPressure, callback):
        self._callbacks.append((pressure, callback))
    
    def get_pressure(self) -> MemoryPressure:
        mem = psutil.virtual_memory()
        percent = mem.percent
        
        if percent > 85:
            return MemoryPressure.CRITICAL
        elif percent > 75:
            return MemoryPressure.HIGH
        elif percent > 60:
            return MemoryPressure.MEDIUM
        else:
            return MemoryPressure.LOW
    
    def start(self):
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info("[MONITOR] Memory pressure monitor started")
    
    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=2.0)
    
    def _monitor_loop(self):
        while self.running:
            try:
                pressure = self.get_pressure()
                if pressure != self._last_pressure:
                    logger.warning(f"[MONITOR] Memory pressure: {self._last_pressure.value} -> {pressure.value}")
                    self._trigger_callbacks(pressure)
                    self._last_pressure = pressure
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"[MONITOR] Error: {e}")
    
    def _trigger_callbacks(self, pressure: MemoryPressure):
        for callback_pressure, callback in self._callbacks:
            if pressure.value == callback_pressure.value:
                try:
                    callback()
                except Exception as e:
                    logger.error(f"[MONITOR] Callback error: {e}")


class MemoryManager:
    """Master memory manager"""
    
    def __init__(self):
        self.budget = self._calculate_budget()
        self.monitor = MemoryMonitor()
        self._register_pressure_handlers()
        self.cleanup_count = 0
        self.total_freed_mb = 0.0
        logger.info(f"[MEMORY] Budget: {self.budget.budget_gb:.1f}GB (of {self.budget.total_gb:.1f}GB total)")
    
    def _calculate_budget(self) -> MemoryBudget:
        mem = psutil.virtual_memory()
        total_gb = mem.total / (1024**3)
        return MemoryBudget(total_gb=total_gb)
    
    def _register_pressure_handlers(self):
        self.monitor.register_callback(MemoryPressure.HIGH, lambda: self.cleanup(level='aggressive'))
        self.monitor.register_callback(MemoryPressure.CRITICAL, lambda: self.cleanup(level='emergency'))
    
    def start_monitoring(self):
        self.monitor.start()
    
    def stop_monitoring(self):
        self.monitor.stop()
    
    def cleanup(self, level: str = 'normal'):
        before = self._get_usage()
        
        if level == 'normal':
            gc.collect(generation=0)
        elif level == 'aggressive':
            for i in range(2):
                gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except:
                pass
        elif level == 'emergency':
            for i in range(3):
                gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    torch.cuda.synchronize()
            except:
                pass
            logger.critical(f"[MEMORY] EMERGENCY CLEANUP at {before['percent']:.1f}%")
        
        after = self._get_usage()
        freed_mb = before['rss_mb'] - after['rss_mb']
        self.cleanup_count += 1
        self.total_freed_mb += max(0, freed_mb)
        
        logger.info(f"[MEMORY] Cleanup ({level}): {before['rss_mb']:.0f}MB -> {after['rss_mb']:.0f}MB (freed {freed_mb:.0f}MB)")
        return {
            'before': before,
            'after': after,
            'freed_mb': freed_mb
        }
    
    def _get_usage(self) -> dict:
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        return {
            'rss_mb': mem_info.rss / (1024 * 1024),
            'percent': process.memory_percent()
        }
    
    def get_max_population_size(self, bytes_per_individual: int = 20 * 1024 * 1024) -> int:
        budget_bytes = self.budget.budget_gb * 1024 * 1024 * 1024
        max_pop = int(budget_bytes / bytes_per_individual)
        max_pop = max(3, min(max_pop, 50))
        logger.info(f"[MEMORY] Max population: {max_pop} (budget: {self.budget.budget_gb:.1f}GB)")
        return max_pop


# Global instance
memory_manager = MemoryManager()
