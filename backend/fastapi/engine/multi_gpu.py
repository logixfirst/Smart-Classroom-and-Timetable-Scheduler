"""
GPU Detection and Management for Tensor GA
"""
import torch
import logging

logger = logging.getLogger(__name__)

class GPUManager:
    """Detect and manage GPU for tensor operations"""
    
    def __init__(self):
        self.has_gpu = False
        self.device = torch.device('cpu')
        self.gpu_name = None
        self.gpu_memory_gb = 0
        self._detect_gpu()
    
    def _detect_gpu(self):
        """Detect GPU and capabilities"""
        if not torch.cuda.is_available():
            logger.info("⚠️ No GPU available - using CPU")
            return
        
        try:
            self.device = torch.device('cuda:0')
            props = torch.cuda.get_device_properties(0)
            self.gpu_name = props.name
            self.gpu_memory_gb = props.total_memory / (1024**3)
            self.has_gpu = True
            
            logger.info(f"✅ GPU: {self.gpu_name} ({self.gpu_memory_gb:.1f}GB VRAM)")
        except Exception as e:
            logger.error(f"❌ GPU detection failed: {e}")
            self.device = torch.device('cpu')
    
    def get_optimal_population_size(self) -> int:
        """Calculate optimal population size based on VRAM"""
        if not self.has_gpu:
            return 100  # CPU fallback
        
        # Scale population with VRAM: 1GB = 1000 individuals
        return min(20000, int(self.gpu_memory_gb * 1000))

gpu_manager = GPUManager()
