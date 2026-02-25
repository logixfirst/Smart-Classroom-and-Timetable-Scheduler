"""
Hardware Configuration - Optimal Settings per Hardware Profile
Determines execution parameters based on detected hardware
"""
import os as _os
from typing import Dict, Any
from .profile import HardwareProfile, ExecutionStrategy
import logging

logger = logging.getLogger(__name__)

# OPT1: Auto-scale parallel cluster execution to available CPU cores.
#
# Strategy: maximise cluster-level parallelism, not per-solver parallelism.
# Each CP-SAT instance gets 1 worker thread; run as many clusters simultaneously
# as there are physical cores. This beats 2 clusters × 3 workers because:
#   - CP-SAT scales sub-linearly with workers (2 workers ≠ 2× speedup)
#   - 2 independent clusters always give exactly 2× wall-clock speedup
#
# saga.py computes: workers_per_cluster = max(1, physical_cores // PARALLEL_CLUSTERS)
# At PARALLEL_CLUSTERS=6 on 6-core machine → 1 worker each → 6× speedup vs old sequential.
# Capped at 6 to bound peak memory (each active cluster holds ~50-100 MB model data).
PARALLEL_CLUSTERS = min(6, max(2, (_os.cpu_count() or 4)))


def get_optimal_config(hardware_profile: HardwareProfile) -> Dict[str, Any]:
    """
    Get optimal execution configuration based on hardware profile.
    
    DESIGN FREEZE: CPU-only, no GPU usage
    - use_gpu: Always False (per DESIGN FREEZE)
    - use_distributed: False (Celery disabled)
    - CPU parameters tuned for performance
    
    Args:
        hardware_profile: Detected hardware profile
        
    Returns:
        Configuration dictionary with optimal settings
    """
    config = {
        # DESIGN FREEZE: GPU disabled for production correctness
        'use_gpu': False,
        'gpu_available': False,
        
        # DESIGN FREEZE: Distributed execution disabled
        'use_distributed': False,
        'celery_available': False,
        
        # CPU configuration (based on detected hardware)
        'cpu_cores': hardware_profile.cpu_cores,
        'cpu_threads': hardware_profile.cpu_threads,
        'ram_gb': hardware_profile.total_ram_gb,
        
        # Execution strategy
        'strategy': hardware_profile.optimal_strategy.value,
        
        # Performance tuning (CPU-only)
        'max_workers': min(hardware_profile.cpu_threads, 8),  # Cap at 8 workers
        'batch_size': _calculate_batch_size(hardware_profile),
        'memory_limit_mb': _calculate_memory_limit(hardware_profile),
        
        # Algorithm parameters (based on hardware)
        'cpsat_timeout': _calculate_cpsat_timeout(hardware_profile),
        'ga_population_size': _calculate_ga_population(hardware_profile),
        'ga_generations': _calculate_ga_generations(hardware_profile),

        # OPT1: Parallel cluster execution
        'parallel_clusters': PARALLEL_CLUSTERS,
        
        # Cloud/environment info
        'is_cloud': hardware_profile.is_cloud_instance,
        'cloud_provider': hardware_profile.cloud_provider,
    }
    
    logger.info(
        f"[Config] Strategy: {config['strategy']}, "
        f"Workers: {config['max_workers']}, "
        f"CPU: {config['cpu_cores']}c/{config['cpu_threads']}t, "
        f"RAM: {config['ram_gb']:.1f}GB"
    )
    
    return config


def _calculate_batch_size(profile: HardwareProfile) -> int:
    """Calculate optimal batch size for processing"""
    # Scale with CPU cores
    if profile.cpu_cores >= 16:
        return 100
    elif profile.cpu_cores >= 8:
        return 50
    elif profile.cpu_cores >= 4:
        return 25
    else:
        return 10


def _calculate_memory_limit(profile: HardwareProfile) -> int:
    """Calculate memory limit in MB (leave 25% for system)"""
    usable_ram = profile.total_ram_gb * 0.75  # Use max 75% of RAM
    return int(usable_ram * 1024)  # Convert to MB


def _calculate_cpsat_timeout(profile: HardwareProfile) -> int:
    """Calculate CP-SAT solver timeout in seconds"""
    # Faster CPUs get shorter timeout (more efficient)
    if profile.cpu_cores >= 16:
        return 30  # High-end: aggressive timeout
    elif profile.cpu_cores >= 8:
        return 45  # Mid-range: moderate timeout
    elif profile.cpu_cores >= 4:
        return 60  # Low-end: generous timeout
    else:
        return 90  # Very constrained: extended timeout


def _calculate_ga_population(profile: HardwareProfile) -> int:
    """Calculate optimal GA population size"""
    # Scale with CPU threads (GA is CPU-bound)
    # DESIGN FREEZE: Cap at 20 per best practices
    if profile.cpu_threads >= 16:
        return 20
    elif profile.cpu_threads >= 8:
        return 15
    elif profile.cpu_threads >= 4:
        return 12
    else:
        return 10


def _calculate_ga_generations(profile: HardwareProfile) -> int:
    """Calculate optimal GA generations"""
    # DESIGN FREEZE: Cap at 25 for production
    if profile.cpu_threads >= 16:
        return 25  # High-end: max generations
    elif profile.cpu_threads >= 8:
        return 20
    elif profile.cpu_threads >= 4:
        return 15
    else:
        return 12


# Presets for common hardware configurations
PRESET_LOW_END = {
    'max_workers': 2,
    'batch_size': 10,
    'cpsat_timeout': 90,
    'ga_population_size': 10,
    'ga_generations': 12,
}

PRESET_MID_RANGE = {
    'max_workers': 4,
    'batch_size': 25,
    'cpsat_timeout': 60,
    'ga_population_size': 15,
    'ga_generations': 20,
}

PRESET_HIGH_END = {
    'max_workers': 8,
    'batch_size': 50,
    'cpsat_timeout': 30,
    'ga_population_size': 20,
    'ga_generations': 25,
}
