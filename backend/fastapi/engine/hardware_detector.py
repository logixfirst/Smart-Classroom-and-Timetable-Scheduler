"""
Hardware Detection and Adaptive Configuration System
Detects available hardware and configures optimal execution strategy
"""
import logging
import psutil
import platform
import subprocess
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ExecutionStrategy(Enum):
    """Available execution strategies based on hardware"""
    CPU_SINGLE = "cpu_single"           # Basic CPU, single-threaded
    CPU_MULTI = "cpu_multi"             # Multi-core CPU, parallel processing
    GPU_CUDA = "gpu_cuda"               # NVIDIA GPU with CUDA
    GPU_OPENCL = "gpu_opencl"           # AMD/Intel GPU with OpenCL
    DISTRIBUTED_LOCAL = "distributed_local"  # Local cluster/multiple machines
    CLOUD_DISTRIBUTED = "cloud_distributed"  # Cloud-based distributed computing
    HYBRID = "hybrid"                   # Combination of multiple strategies

@dataclass
class HardwareProfile:
    """Complete hardware profile for optimization"""
    # CPU Information
    cpu_cores: int
    cpu_threads: int
    cpu_frequency: float
    cpu_architecture: str
    
    # Memory Information
    total_ram_gb: float
    available_ram_gb: float
    
    # GPU Information
    has_nvidia_gpu: bool
    has_amd_gpu: bool
    gpu_memory_gb: float
    cuda_version: Optional[str]
    opencl_available: bool
    
    # Storage Information
    storage_type: str  # SSD, HDD, NVMe
    storage_speed_mbps: float
    
    # Network Information
    network_bandwidth_mbps: float
    
    # Cloud/Distributed Information
    is_cloud_instance: bool
    cloud_provider: Optional[str]
    distributed_nodes: List[str]
    
    # Recommended Strategy
    optimal_strategy: ExecutionStrategy
    fallback_strategies: List[ExecutionStrategy]
    
    # Performance Multipliers
    cpu_multiplier: float
    gpu_multiplier: float
    memory_multiplier: float
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            'cpu_cores': self.cpu_cores,
            'cpu_threads': self.cpu_threads,
            'cpu_frequency': self.cpu_frequency,
            'cpu_architecture': self.cpu_architecture,
            'total_ram_gb': self.total_ram_gb,
            'available_ram_gb': self.available_ram_gb,
            'has_nvidia_gpu': self.has_nvidia_gpu,
            'has_amd_gpu': self.has_amd_gpu,
            'gpu_memory_gb': self.gpu_memory_gb,
            'cuda_version': self.cuda_version,
            'opencl_available': self.opencl_available,
            'storage_type': self.storage_type,
            'storage_speed_mbps': self.storage_speed_mbps,
            'network_bandwidth_mbps': self.network_bandwidth_mbps,
            'is_cloud_instance': self.is_cloud_instance,
            'cloud_provider': self.cloud_provider,
            'distributed_nodes': self.distributed_nodes,
            'optimal_strategy': self.optimal_strategy.value,
            'fallback_strategies': [s.value for s in self.fallback_strategies],
            'cpu_multiplier': self.cpu_multiplier,
            'gpu_multiplier': self.gpu_multiplier,
            'memory_multiplier': self.memory_multiplier
        }

class HardwareDetector:
    """Comprehensive hardware detection and strategy selection"""
    
    def __init__(self):
        self.profile: Optional[HardwareProfile] = None
        self._cache_file = "hardware_profile.json"
        
    def detect_hardware(self, force_refresh: bool = False) -> HardwareProfile:
        """Detect all available hardware and determine optimal strategy"""
        
        logger.info("Detecting hardware (no cache)...")
        
        # Detect CPU
        cpu_info = self._detect_cpu()
        
        # Detect Memory
        memory_info = self._detect_memory()
        
        # Detect GPU
        gpu_info = self._detect_gpu()
        
        # Detect Storage
        storage_info = self._detect_storage()
        
        # Detect Network
        network_info = self._detect_network()
        
        # Detect Cloud/Distributed
        cloud_info = self._detect_cloud_distributed()
        
        # Calculate performance multipliers
        multipliers = self._calculate_multipliers(cpu_info, gpu_info, memory_info)
        
        # Determine optimal strategy
        strategy, fallbacks = self._determine_strategy(cpu_info, gpu_info, memory_info, cloud_info)
        
        # Create hardware profile
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
    
    def _detect_gpu(self) -> Dict:
        """Detect GPU information"""
        gpu_info = {
            'has_nvidia': False,
            'has_amd': False,
            'memory_gb': 0.0,
            'cuda_version': None,
            'opencl_available': False
        }
        
        # Check for NVIDIA GPU via nvidia-smi (most reliable)
        try:
            result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader'],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0 and result.stdout:
                lines = result.stdout.strip().split('\n')
                if lines:
                    parts = lines[0].split(',')
                    gpu_name = parts[0].strip()
                    memory_mb = int(parts[1].strip().split()[0])
                    gpu_info['has_nvidia'] = True
                    gpu_info['memory_gb'] = memory_mb / 1024
                    logger.info(f"✅ NVIDIA GPU: {gpu_name} ({gpu_info['memory_gb']:.1f}GB)")
        except:
            pass
        
        # Fallback to PyTorch
        if not gpu_info['has_nvidia']:
            try:
                import torch
                if torch.cuda.is_available():
                    gpu_info['has_nvidia'] = True
                    gpu_info['memory_gb'] = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                    gpu_info['cuda_version'] = torch.version.cuda
                    logger.info(f"✅ GPU via PyTorch: {torch.cuda.get_device_name(0)}")
            except:
                pass
        
        # Check for AMD GPU and OpenCL
        try:
            import pyopencl as cl
            platforms = cl.get_platforms()
            for platform in platforms:
                devices = platform.get_devices()
                for device in devices:
                    if device.type == cl.device_type.GPU:
                        gpu_info['opencl_available'] = True
                        if 'AMD' in device.vendor.upper():
                            gpu_info['has_amd'] = True
                            gpu_info['memory_gb'] = max(gpu_info['memory_gb'], 
                                                      device.global_mem_size / (1024**3))
                        logger.info(f"OpenCL GPU detected: {device.name}")
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"OpenCL GPU detection failed: {e}")
        
        return gpu_info
    
    def _detect_storage(self) -> Dict:
        """Detect storage information"""
        try:
            # Get disk usage for current directory
            disk_usage = psutil.disk_usage('.')
            
            # Try to determine storage type
            storage_type = "HDD"  # Default assumption
            
            # On Windows, check if it's SSD
            if platform.system() == "Windows":
                try:
                    result = subprocess.run(
                        ['powershell', '-Command', 'Get-PhysicalDisk | Select-Object MediaType'],
                        capture_output=True, text=True, timeout=5
                    )
                    if "SSD" in result.stdout:
                        storage_type = "SSD"
                except:
                    pass
            
            # On Linux, check rotational
            elif platform.system() == "Linux":
                try:
                    with open('/sys/block/sda/queue/rotational', 'r') as f:
                        if f.read().strip() == '0':
                            storage_type = "SSD"
                except:
                    pass
            
            # Estimate speed based on type
            speed_mbps = 150.0 if storage_type == "HDD" else 500.0  # Conservative estimates
            
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
            # Get network interface statistics
            net_io = psutil.net_io_counters()
            
            # Estimate bandwidth (this is very rough)
            bandwidth_mbps = 100.0  # Default assumption: 100 Mbps
            
            # Try to get more accurate info on Windows
            if platform.system() == "Windows":
                try:
                    result = subprocess.run(
                        ['powershell', '-Command', 'Get-NetAdapter | Select-Object LinkSpeed'],
                        capture_output=True, text=True, timeout=5
                    )
                    # Parse LinkSpeed if available
                    for line in result.stdout.split('\n'):
                        if 'Gbps' in line:
                            bandwidth_mbps = float(line.split()[0]) * 1000
                            break
                        elif 'Mbps' in line:
                            bandwidth_mbps = float(line.split()[0])
                            break
                except:
                    pass
            
            return {
                'bandwidth_mbps': bandwidth_mbps
            }
        except Exception as e:
            logger.warning(f"Network detection failed: {e}")
            return {
                'bandwidth_mbps': 100.0
            }
    
    def _detect_cloud_distributed(self) -> Dict:
        """Detect cloud and distributed computing environment"""
        cloud_info = {
            'is_cloud': False,
            'provider': None,
            'nodes': []
        }
        
        # Check for cloud providers
        try:
            # AWS
            try:
                result = subprocess.run(['curl', '-s', '--max-time', '2', 
                                       'http://169.254.169.254/latest/meta-data/instance-id'],
                                     capture_output=True, text=True, timeout=3)
                if result.returncode == 0 and result.stdout:
                    cloud_info['is_cloud'] = True
                    cloud_info['provider'] = 'AWS'
            except:
                pass
            
            # Google Cloud
            try:
                result = subprocess.run(['curl', '-s', '--max-time', '2',
                                       'http://metadata.google.internal/computeMetadata/v1/instance/id',
                                       '-H', 'Metadata-Flavor: Google'],
                                     capture_output=True, text=True, timeout=3)
                if result.returncode == 0 and result.stdout:
                    cloud_info['is_cloud'] = True
                    cloud_info['provider'] = 'GCP'
            except:
                pass
            
            # Azure
            try:
                result = subprocess.run(['curl', '-s', '--max-time', '2',
                                       'http://169.254.169.254/metadata/instance?api-version=2021-02-01',
                                       '-H', 'Metadata: true'],
                                     capture_output=True, text=True, timeout=3)
                if result.returncode == 0 and result.stdout:
                    cloud_info['is_cloud'] = True
                    cloud_info['provider'] = 'Azure'
            except:
                pass
            
        except Exception as e:
            logger.debug(f"Cloud detection failed: {e}")
        
        # Check for distributed nodes (Kubernetes, Docker Swarm, etc.)
        try:
            # Check for Kubernetes
            if 'KUBERNETES_SERVICE_HOST' in os.environ:
                cloud_info['nodes'].append('kubernetes')
            
            # Check for Docker Swarm
            result = subprocess.run(['docker', 'node', 'ls'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                cloud_info['nodes'].extend(['docker_swarm'])
        except:
            pass
        
        return cloud_info
    
    def _calculate_multipliers(self, cpu_info: Dict, gpu_info: Dict, memory_info: Dict) -> Dict:
        """Calculate performance multipliers based on hardware"""
        
        # CPU multiplier based on cores and frequency
        base_cpu_score = 4 * 2400  # 4 cores at 2.4GHz baseline
        actual_cpu_score = cpu_info['cores'] * cpu_info['frequency']
        cpu_multiplier = min(actual_cpu_score / base_cpu_score, 4.0)  # Cap at 4x
        
        # GPU multiplier
        gpu_multiplier = 1.0
        if gpu_info['has_nvidia'] and gpu_info['memory_gb'] >= 4:
            gpu_multiplier = min(2.0 + (gpu_info['memory_gb'] / 8.0), 8.0)  # 2x to 8x
        elif gpu_info['has_amd'] and gpu_info['memory_gb'] >= 4:
            gpu_multiplier = min(1.5 + (gpu_info['memory_gb'] / 8.0), 4.0)  # 1.5x to 4x
        
        # Memory multiplier
        base_memory = 8.0  # 8GB baseline
        memory_multiplier = min(memory_info['total_gb'] / base_memory, 4.0)  # Cap at 4x
        
        return {
            'cpu': cpu_multiplier,
            'gpu': gpu_multiplier,
            'memory': memory_multiplier
        }
    
    def _determine_strategy(self, cpu_info: Dict, gpu_info: Dict, 
                          memory_info: Dict, cloud_info: Dict) -> Tuple[ExecutionStrategy, List[ExecutionStrategy]]:
        """Determine optimal execution strategy based on hardware"""
        
        strategies = []
        
        # Cloud distributed (highest priority if available)
        if cloud_info['is_cloud'] and len(cloud_info['nodes']) > 0:
            strategies.append(ExecutionStrategy.CLOUD_DISTRIBUTED)
        
        # GPU acceleration (high priority)
        if gpu_info['has_nvidia'] and gpu_info['memory_gb'] >= 4:
            strategies.append(ExecutionStrategy.GPU_CUDA)
        elif gpu_info['opencl_available'] and gpu_info['memory_gb'] >= 4:
            strategies.append(ExecutionStrategy.GPU_OPENCL)
        
        # Distributed local (if multiple nodes detected)
        if len(cloud_info['nodes']) > 0:
            strategies.append(ExecutionStrategy.DISTRIBUTED_LOCAL)
        
        # Multi-core CPU (if sufficient cores)
        if cpu_info['cores'] >= 8 and memory_info['total_gb'] >= 16:
            strategies.append(ExecutionStrategy.CPU_MULTI)
        elif cpu_info['cores'] >= 4:
            strategies.append(ExecutionStrategy.CPU_MULTI)
        
        # Single-core fallback
        strategies.append(ExecutionStrategy.CPU_SINGLE)
        
        # Hybrid strategy for high-end systems
        if (gpu_info['has_nvidia'] and cpu_info['cores'] >= 8 and 
            memory_info['total_gb'] >= 32):
            strategies.insert(0, ExecutionStrategy.HYBRID)
        
        optimal = strategies[0] if strategies else ExecutionStrategy.CPU_SINGLE
        fallbacks = strategies[1:] if len(strategies) > 1 else [ExecutionStrategy.CPU_SINGLE]
        
        return optimal, fallbacks
    
    def _load_from_cache(self) -> bool:
        """Load hardware profile from cache"""
        try:
            with open(self._cache_file, 'r') as f:
                data = json.load(f)
                
            # Convert back to HardwareProfile
            self.profile = HardwareProfile(
                cpu_cores=data['cpu_cores'],
                cpu_threads=data['cpu_threads'],
                cpu_frequency=data['cpu_frequency'],
                cpu_architecture=data['cpu_architecture'],
                total_ram_gb=data['total_ram_gb'],
                available_ram_gb=data['available_ram_gb'],
                has_nvidia_gpu=data['has_nvidia_gpu'],
                has_amd_gpu=data['has_amd_gpu'],
                gpu_memory_gb=data['gpu_memory_gb'],
                cuda_version=data['cuda_version'],
                opencl_available=data['opencl_available'],
                storage_type=data['storage_type'],
                storage_speed_mbps=data['storage_speed_mbps'],
                network_bandwidth_mbps=data['network_bandwidth_mbps'],
                is_cloud_instance=data['is_cloud_instance'],
                cloud_provider=data['cloud_provider'],
                distributed_nodes=data['distributed_nodes'],
                optimal_strategy=ExecutionStrategy(data['optimal_strategy']),
                fallback_strategies=[ExecutionStrategy(s) for s in data['fallback_strategies']],
                cpu_multiplier=data['cpu_multiplier'],
                gpu_multiplier=data['gpu_multiplier'],
                memory_multiplier=data['memory_multiplier']
            )
            
            logger.info("Hardware profile loaded from cache")
            return True
            
        except Exception as e:
            logger.debug(f"Failed to load hardware profile from cache: {e}")
            return False
    
    def _save_to_cache(self):
        """Save hardware profile to cache"""
        try:
            with open(self._cache_file, 'w') as f:
                json.dump(self.profile.to_dict(), f, indent=2)
            logger.debug("Hardware profile saved to cache")
        except Exception as e:
            logger.warning(f"Failed to save hardware profile to cache: {e}")

# Global hardware detector instance
hardware_detector = HardwareDetector()

def get_hardware_profile(force_refresh: bool = False) -> HardwareProfile:
    """Get current hardware profile"""
    return hardware_detector.detect_hardware(force_refresh)

def get_optimal_config(profile: HardwareProfile) -> Dict:
    """Get optimal configuration based on hardware profile"""
    
    # Adaptive parallelization based on CPU cores and RAM
    cpu_cores = profile.cpu_cores
    available_ram = profile.available_ram_gb
    
    # Stage 1: Graph construction workers
    graph_workers = min(cpu_cores, 8)
    
    # Stage 2A: Cluster parallelization
    if available_ram > 6.0:
        cluster_workers = min(cpu_cores - 2, 12)  # Leave 2 cores free
        cpsat_workers = 4
    elif available_ram > 4.0:
        cluster_workers = min(cpu_cores // 2, 6)
        cpsat_workers = 2
    else:
        cluster_workers = 1
        cpsat_workers = 1
    
    # Stage 2B: Island Model GA
    island_workers = min(8, max(4, cpu_cores // 2))
    
    # Stage 3: Conflict detection workers
    conflict_workers = min(8, cpu_cores)
    
    config = {
        # Stage 1: Louvain Clustering
        'graph_construction_workers': graph_workers,
        'louvain_runs': 3 if cpu_cores < 8 else 5,
        
        # Stage 2A: CP-SAT
        'cpsat_timeout': 5,  # Fast mode
        'cpsat_workers': cpsat_workers,
        'cluster_parallel_workers': cluster_workers,
        
        # Stage 2B: GA
        'ga_island_workers': island_workers,
        'ga_population_per_island': 50,
        'ga_generations': 50,
        'ga_migration_interval': 10,
        
        # Stage 3: RL
        'rl_iterations': 100,
        'conflict_detection_workers': conflict_workers,
        
        # GPU
        'use_gpu': profile.has_nvidia_gpu and profile.gpu_memory_gb >= 4,
        'gpu_fitness_threshold': 200,  # Use GPU if population >= 200
        
        # Memory
        'memory_limit_gb': min(available_ram * 0.8, 16.0),
        'parallel_processes': cluster_workers,
        'use_distributed': False
    }
    
    # Adjust based on strategy
    if profile.optimal_strategy == ExecutionStrategy.GPU_CUDA:
        config.update({
            'use_gpu': True,
            'gpu_memory_gb': profile.gpu_memory_gb,
            'ga_population': int(15 * profile.gpu_multiplier),
            'ga_generations': int(25 * 1.5),  # GPU can handle more generations
            'cpsat_timeout': int(30 * 1.5)
        })
    
    elif profile.optimal_strategy == ExecutionStrategy.CPU_MULTI:
        config.update({
            'cpsat_workers': min(profile.cpu_cores, 8),
            'parallel_processes': min(profile.cpu_cores // 2, 4),
            'ga_population': int(15 * profile.cpu_multiplier),
            'memory_limit_gb': min(profile.available_ram_gb * 0.8, 16.0)
        })
    
    elif profile.optimal_strategy == ExecutionStrategy.CLOUD_DISTRIBUTED:
        config.update({
            'use_distributed': True,
            'distributed_nodes': len(profile.distributed_nodes),
            'cpsat_workers': min(profile.cpu_cores * 2, 16),
            'ga_population': int(15 * profile.cpu_multiplier * 2),
            'memory_limit_gb': min(profile.available_ram_gb * 0.9, 32.0)
        })
    
    elif profile.optimal_strategy == ExecutionStrategy.HYBRID:
        config.update({
            'use_gpu': True,
            'gpu_memory_gb': profile.gpu_memory_gb,
            'cpsat_workers': min(profile.cpu_cores, 8),
            'parallel_processes': min(profile.cpu_cores // 2, 4),
            'ga_population': int(15 * max(profile.cpu_multiplier, profile.gpu_multiplier)),
            'memory_limit_gb': min(profile.available_ram_gb * 0.8, 24.0)
        })
    
    return config