"""
Multi-GPU Detection and Management
Future: Island Model with each island on separate GPU for 4-8x speedup
"""
import torch
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class MultiGPUManager:
    """Detect and manage multiple GPUs for parallel island evolution"""
    
    def __init__(self):
        self.num_gpus = 0
        self.gpus = []  # List of GPU info dicts
        self.has_multi_gpu = False
        self._detect_all_gpus()
    
    def _detect_all_gpus(self):
        """Detect ALL available GPUs"""
        if not torch.cuda.is_available():
            logger.info("[WARN] No GPU available - using CPU")
            return
        
        try:
            self.num_gpus = torch.cuda.device_count()
            
            for gpu_id in range(self.num_gpus):
                props = torch.cuda.get_device_properties(gpu_id)
                gpu_info = {
                    'id': gpu_id,
                    'name': props.name,
                    'memory_gb': props.total_memory / (1024**3),
                    'device': torch.device(f'cuda:{gpu_id}')
                }
                self.gpus.append(gpu_info)
                logger.info(f"[OK] GPU {gpu_id}: {gpu_info['name']} ({gpu_info['memory_gb']:.1f}GB VRAM)")
            
            self.has_multi_gpu = self.num_gpus > 1
            
            if self.has_multi_gpu:
                logger.info(f"[OK] Multi-GPU detected: {self.num_gpus} GPUs available for parallel island evolution")
            
        except Exception as e:
            logger.error(f"[ERROR] GPU detection failed: {e}")
            self.num_gpus = 0
    
    def get_optimal_island_config(self) -> Dict:
        """Get optimal island model configuration for multi-GPU"""
        if not self.has_multi_gpu:
            return {'num_islands': 1, 'use_multi_gpu': False}
        
        # Each GPU gets one island for maximum parallelism
        return {
            'num_islands': self.num_gpus,
            'use_multi_gpu': True,
            'population_per_island': self._get_population_per_gpu(),
            'total_population': self._get_population_per_gpu() * self.num_gpus
        }
    
    def _get_population_per_gpu(self) -> int:
        """Calculate optimal population size per GPU based on VRAM"""
        if not self.gpus:
            return 100
        
        # Use smallest GPU's VRAM as baseline
        min_vram = min(gpu['memory_gb'] for gpu in self.gpus)
        # 1GB VRAM = 1000 individuals
        return min(5000, int(min_vram * 1000))
    
    def get_device(self, island_id: int = 0) -> torch.device:
        """Get device for specific island (round-robin GPU assignment)"""
        if not self.gpus:
            return torch.device('cpu')
        
        gpu_id = island_id % self.num_gpus
        return self.gpus[gpu_id]['device']

# Global instance
multi_gpu_manager = MultiGPUManager()
