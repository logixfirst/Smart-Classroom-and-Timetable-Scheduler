"""Hardware-Adaptive Engine Package"""
from .hardware_detector import HardwareDetector, get_hardware_profile
from .adaptive_executor import AdaptiveExecutor, get_adaptive_executor
from .stage1_clustering import LouvainClusterer
from .stage2_cpsat import AdaptiveCPSATSolver
from .stage2_ga import GeneticAlgorithmOptimizer
from .stage3_rl import RLConflictResolver, ContextAwareRLAgent

__all__ = [
    'HardwareDetector', 'get_hardware_profile',
    'AdaptiveExecutor', 'get_adaptive_executor',
    'LouvainClusterer',
    'AdaptiveCPSATSolver',
    'GeneticAlgorithmOptimizer',
    'RLConflictResolver', 'ContextAwareRLAgent'
]
