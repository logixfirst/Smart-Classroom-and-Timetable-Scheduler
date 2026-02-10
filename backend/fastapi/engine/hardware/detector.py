"""
Hardware Detector - Main Orchestrator
Coordinates all hardware detection and builds complete profile
Following Google/Meta standards: Main orchestration logic only
"""
import logging
import psutil
import platform
import subprocess
import json
from typing import Dict, List, Optional, Tuple

from .profile import HardwareProfile, ExecutionStrategy, calculate_performance_multipliers
from .gpu_detector import detect_all_gpus
from .cloud_detector import detect_cloud_and_distributed

logger = logging.getLogger(__name__)


class HardwareDetector:
    """
    Comprehensive hardware detection and strategy selection
    Orchestrates detection from specialized modules
    """
    
    def __init__(self):
        self.profile: Optional[HardwareProfile] = None
        self._cache_file = "hardware_profile.json"
        
    def detect_hardware(self, force_refresh: bool = False) -> HardwareProfile:
        """
        Detect all available hardware and determine optimal strategy
        Main entry point for hardware detection
        """
        logger.info("Detecting hardware...")
        
        # Detect CPU
        cpu_info = self._detect_cpu()
        
        # Detect Memory
        memory_info = self._detect_memory()
        
        # Detect GPU (using gpu_detector module)
        gpu_info = detect_all_gpus()
        
        # Detect Storage
        storage_info = self._detect_storage()
        
        # Detect Network
        network_info = self._detect_network()
        
        # Detect Cloud/Distributed (using cloud_detector module)
        cloud_info = detect_cloud_and_distributed()
        
        # Calculate performance multipliers
        multipliers = calculate_performance_multipliers(cpu_info, gpu_info, memory_info)
        
        # Determine optimal strategy
        strategy, fallbacks = self._determine_strategy(
            cpu_info, gpu_info, memory_info, cloud_info
        )
        
        # Build hardware profile
        self.profile = HardwareProfile(
            cpu_cores=cpu_info['cores'],
            cpu_threads=cpu_info['threads'],
            cpu_frequency=cpu_info['frequency'],
            cpu_architecture=cpu_info['architecture'],
            total_ram_gb=memory_info['total_gb'],
            available_ram_gb=memory_info['available_gb'],
            has_nvidia_gpu=gpu_info['has_nvidia'],
            has_amd_gpu=gpu_info['has_amd'],
            gpu_memory_gb=gpu_info['memory_gb'],
            cuda_version=gpu_info['cuda_version'],
            opencl_available=gpu_info['opencl_available'],
            storage_type=storage_info['type'],
            storage_speed_mbps=storage_info['speed_mbps'],
            network_bandwidth_mbps=network_info['bandwidth_mbps'],
            is_cloud_instance=cloud_info['is_cloud'],
            cloud_provider=cloud_info['provider'],
            distributed_nodes=cloud_info['nodes'],
            optimal_strategy=strategy,
            fallback_strategies=fallbacks,
            cpu_multiplier=multipliers['cpu'],
            gpu_multiplier=multipliers['gpu'],
            memory_multiplier=multipliers['memory']
        )
        
        logger.info(f"Hardware detection complete. Strategy: {strategy.value}")
        logger.info(f"CPU: {cpu_info['cores']} cores, {memory_info['total_gb']:.1f}GB RAM")
        if gpu_info['has_nvidia'] or gpu_info['has_amd']:
            logger.info(f"GPU: {gpu_info['memory_gb']:.1f}GB VRAM")
        
        return self.profile
    
    def _detect_cpu(self) -> Dict:
        """Detect CPU information"""
        try:
            cpu_count = psutil.cpu_count(logical=False)  # Physical cores
            cpu_threads = psutil.cpu_count(logical=True)  # Logical cores
            cpu_freq = psutil.cpu_freq()
            
            return {
                'cores': cpu_count,
                'threads': cpu_threads,
                'frequency': cpu_freq.max if cpu_freq else 2400.0,
                'architecture': platform.machine()
            }
        except Exception as e:
            logger.warning(f"CPU detection failed: {e}")
            return {
                'cores': 4,
                'threads': 8,
                'frequency': 2400.0,
                'architecture': 'unknown'
            }
    
    def _detect_memory(self) -> Dict:
        """Detect memory information with real-time refresh"""
        try:
            memory = psutil.virtual_memory()
            total_gb = round(memory.total / (1024**3), 2)
            available_gb = round(memory.available / (1024**3), 2)
            logger.info(f"Memory detected: {total_gb}GB total, {available_gb}GB available")
            return {
                'total_gb': total_gb,
                'available_gb': available_gb
            }
        except Exception as e:
            logger.warning(f"Memory detection failed: {e}")
            return {
                'total_gb': 8.0,
                'available_gb': 4.0
            }
    
    def _detect_storage(self) -> Dict:
        """Detect storage information"""
        try:
            disk_usage = psutil.disk_usage('.')
            storage_type = "HDD"  # Default
            
            # Windows: Check if SSD
            if platform.system() == "Windows":
                try:
                    result = subprocess.run(
                        ['powershell', '-Command', 'Get-PhysicalDisk | Select-Object MediaType'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if "SSD" in result.stdout:
                        storage_type = "SSD"
                except:
                    pass
            
            # Linux: Check rotational
            elif platform.system() == "Linux":
                try:
                    with open('/sys/block/sda/queue/rotational', 'r') as f:
                        if f.read().strip() == '0':
                            storage_type = "SSD"
                except:
                    pass
            
            # Estimate speed
            speed_mbps = 150.0 if storage_type == "HDD" else 500.0
            
            return {
                'type': storage_type,
                'speed_mbps': speed_mbps,
                'free_gb': disk_usage.free / (1024**3)
            }
        except Exception as e:
            logger.warning(f"Storage detection failed: {e}")
            return {
                'type': 'HDD',
                'speed_mbps': 150.0,
                'free_gb': 10.0
            }
    
    def _detect_network(self) -> Dict:
        """Detect network information"""
        try:
            bandwidth_mbps = 100.0  # Default
            
            # Windows: Get adapter speed
            if platform.system() == "Windows":
                try:
                    result = subprocess.run(
                        ['powershell', '-Command', 'Get-NetAdapter | Select-Object LinkSpeed'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    for line in result.stdout.split('\n'):
                        if 'Gbps' in line:
                            bandwidth_mbps = float(line.split()[0]) * 1000
                            break
                        elif 'Mbps' in line:
                            bandwidth_mbps = float(line.split()[0])
                            break
                except:
                    pass
            
            return {'bandwidth_mbps': bandwidth_mbps}
        except Exception as e:
            logger.warning(f"Network detection failed: {e}")
            return {'bandwidth_mbps': 100.0}
    
    def _determine_strategy(
        self,
        cpu_info: Dict,
        gpu_info: Dict,
        memory_info: Dict,
        cloud_info: Dict
    ) -> Tuple[ExecutionStrategy, List[ExecutionStrategy]]:
        """
        Determine optimal execution strategy based on hardware
        
        DESIGN FREEZE: Force CPU-only for production correctness
        - No GPU (nondeterministic, race conditions, minimal benefit)
        - No distributed (complexity not justified)
        - CPU-only = deterministic, testable, production-safe
        """
        
        strategies = []
        
        # DESIGN FREEZE: Always use CPU-only strategies
        # Multi-core CPU (preferred for performance)
        if cpu_info['cores'] >= 8 and memory_info['total_gb'] >= 16:
            strategies.append(ExecutionStrategy.CPU_MULTI)
        elif cpu_info['cores'] >= 4:
            strategies.append(ExecutionStrategy.CPU_MULTI)
        
        # Single-core fallback (always available)
        strategies.append(ExecutionStrategy.CPU_SINGLE)
        
        optimal = strategies[0] if strategies else ExecutionStrategy.CPU_SINGLE
        fallbacks = strategies[1:] if len(strategies) > 1 else [ExecutionStrategy.CPU_SINGLE]
        
        logger.info(f"[DESIGN FREEZE] CPU-only mode enforced: {optimal.value}")
        logger.info(f"[DESIGN FREEZE] GPU detected but DISABLED (production correctness)")
        
        return optimal, fallbacks
    
    def _load_from_cache(self) -> bool:
        """Load hardware profile from cache"""
        try:
            with open(self._cache_file, 'r') as f:
                data = json.load(f)
            
            self.profile = HardwareProfile.from_dict(data)
            logger.info("Hardware profile loaded from cache")
            return True
            
        except Exception as e:
            logger.debug(f"Failed to load cache: {e}")
            return False
    
    def _save_to_cache(self):
        """Save hardware profile to cache"""
        try:
            with open(self._cache_file, 'w') as f:
                json.dump(self.profile.to_dict(), f, indent=2)
            logger.debug("Hardware profile saved to cache")
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")
