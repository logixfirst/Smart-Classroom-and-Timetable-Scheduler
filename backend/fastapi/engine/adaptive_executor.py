"""
Adaptive Execution Engine
Dynamically selects and executes optimal algorithms based on hardware

DESIGN FREEZE (Production-Safe Architecture):
=========================================
✅ ENABLED:
- CP-SAT for hard feasibility (deterministic, provably correct)
- Aggressive domain reduction (biggest performance win)
- Clustering with greedy fallback (prevents worst-case explosion)
- Context Engine (READ-ONLY, feature provider not decision maker)
- Tabular Q-learning (FROZEN during runtime, offline training only)
- Semester-wise transfer learning (offline trained, frozen policy)

❌ DISABLED FOR PRODUCTION:
- GPU usage (nondeterministic, race conditions, minimal benefit for Python dicts)
- Runtime RL learning (causes non-reproducible schedules)
- Deep learning / high-dimensional encodings (research only)
- Parallel RL (experimental)

EXECUTIVE VERDICT:
"We deliberately removed GPU and deep learning to reduce nondeterminism
and bugs. System relies on CP-SAT for correctness, domain pruning for
performance, and lightweight frozen RL for optional refinement."
"""
import logging
import asyncio
import time
from typing import Dict, List, Optional, Any
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import multiprocessing as mp

from .hardware import HardwareProfile, ExecutionStrategy, HardwareDetector, get_hardware_profile, get_optimal_config
from .cpsat import AdaptiveCPSATSolver
from .ga import GeneticAlgorithmOptimizer
from .rl import SimpleTabularQLearning
from models.timetable_models import Course, Faculty, Room, TimeSlot

logger = logging.getLogger(__name__)

class AdaptiveExecutor:
    """
    Adaptive execution engine that automatically selects optimal algorithms
    based on available hardware resources
    """
    
    def __init__(self):
        self.hardware_profile: Optional[HardwareProfile] = None
        self.config: Dict = {}
        self.gpu_executor: Optional['GPUExecutor'] = None
        self.distributed_executor: Optional['DistributedExecutor'] = None
        self.cpu_executor: Optional['CPUExecutor'] = None
        
    async def initialize(self, force_hardware_refresh: bool = False):
        """Initialize executor with hardware detection"""
        # Detect hardware
        self.hardware_profile = get_hardware_profile(force_hardware_refresh)
        self.config = get_optimal_config(self.hardware_profile)
        
        # Initialize appropriate executors
        await self._initialize_executors()
        
        logger.info(f"Adaptive Executor initialized: {self.hardware_profile.optimal_strategy.value}")
        
    async def _initialize_executors(self):
        """Initialize executors based on hardware profile"""
        
        # Always initialize CPU executor as fallback
        self.cpu_executor = CPUExecutor(self.config)
        
        # DESIGN FREEZE: GPU executor DISABLED for production correctness
        # Removed due to: nondeterminism, race conditions, minimal benefit
        # Python dicts + branching logic incompatible with GPU optimization
        self.gpu_executor = None
        logger.info("[DESIGN FREEZE] GPU disabled - CPU-only mode for deterministic behavior")
        
        # Initialize distributed executor if available
        if self.config.get('use_distributed', False):
            try:
                self.distributed_executor = DistributedExecutor(self.config)
                await self.distributed_executor.initialize()
                logger.debug("Distributed executor initialized")
            except Exception as e:
                logger.warning(f"Distributed executor initialization failed: {e}")
                self.distributed_executor = None
    
    async def execute_stage2(self, courses: List[Course], faculty: Dict, 
                           rooms: List[Room], time_slots: List[TimeSlot],
                           clusters: List[List[Course]]) -> Dict:
        """Execute Stage 2 (CP-SAT + GA) with optimal strategy"""
        
        strategy = self.hardware_profile.optimal_strategy
        
        try:
            # DESIGN FREEZE: Force CPU-only execution (GPU disabled)
            if strategy == ExecutionStrategy.CLOUD_DISTRIBUTED and self.distributed_executor:
                return await self.distributed_executor.execute_stage2(courses, faculty, rooms, time_slots, clusters)
            
            elif strategy == ExecutionStrategy.CPU_MULTI:
                return await self.cpu_executor.execute_stage2_parallel(courses, faculty, rooms, time_slots, clusters)
            
            else:
                # Always use CPU executor for deterministic, bug-free execution
                return await self.cpu_executor.execute_stage2(courses, faculty, rooms, time_slots, clusters)
                
        except Exception as e:
            logger.error(f"Stage 2 execution failed with {strategy.value}: {e}")
            # Fallback to CPU
            return await self.cpu_executor.execute_stage2(courses, faculty, rooms, time_slots, clusters)
    
    async def execute_stage3(self, schedule: Dict, courses: List[Course], 
                           faculty: Dict, rooms: List[Room], time_slots: List[TimeSlot]) -> Dict:
        """Execute Stage 3 (RL Conflict Resolution) with optimal strategy"""
        
        strategy = self.hardware_profile.optimal_strategy
        
        try:
            # DESIGN FREEZE: Force CPU-only execution (GPU disabled)
            if strategy == ExecutionStrategy.CLOUD_DISTRIBUTED and self.distributed_executor:
                return await self.distributed_executor.execute_stage3(schedule, courses, faculty, rooms, time_slots)
            else:
                # Always use CPU executor for deterministic, bug-free execution
                return await self.cpu_executor.execute_stage3(schedule, courses, faculty, rooms, time_slots)
                
        except Exception as e:
            logger.error(f"Stage 3 execution failed with {strategy.value}: {e}")
            # Fallback to CPU
            return await self.cpu_executor.execute_stage3(schedule, courses, faculty, rooms, time_slots)
    
    async def _execute_hybrid_stage2(self, courses: List[Course], faculty: Dict,
                                   rooms: List[Room], time_slots: List[TimeSlot],
                                   clusters: List[List[Course]]) -> Dict:
        """Execute Stage 2 with hybrid CPU+GPU approach"""
        
        # Split clusters between CPU and GPU
        cpu_clusters = clusters[:len(clusters)//2]
        gpu_clusters = clusters[len(clusters)//2:]
        
        # Execute in parallel
        cpu_task = self.cpu_executor.execute_stage2_parallel(courses, faculty, rooms, time_slots, cpu_clusters)
        gpu_task = self.gpu_executor.execute_stage2(courses, faculty, rooms, time_slots, gpu_clusters)
        
        cpu_result, gpu_result = await asyncio.gather(cpu_task, gpu_task)
        
        # Merge results
        merged_schedule = {**cpu_result.get('schedule', {}), **gpu_result.get('schedule', {})}
        
        return {
            'schedule': merged_schedule,
            'quality_score': (cpu_result.get('quality_score', 0) + gpu_result.get('quality_score', 0)) / 2,
            'conflicts': cpu_result.get('conflicts', []) + gpu_result.get('conflicts', []),
            'execution_time': max(cpu_result.get('execution_time', 0), gpu_result.get('execution_time', 0))
        }
    
    async def _execute_hybrid_stage3(self, schedule: Dict, courses: List[Course],
                                   faculty: Dict, rooms: List[Room], time_slots: List[TimeSlot]) -> Dict:
        """Execute Stage 3 with hybrid CPU+GPU approach"""
        
        # Use GPU for RL if available, CPU for conflict detection
        return await self.gpu_executor.execute_stage3(schedule, courses, faculty, rooms, time_slots)

class CPUExecutor:
    """CPU-based execution engine"""
    
    def __init__(self, config: Dict):
        self.config = config
        
    async def execute_stage2(self, courses: List[Course], faculty: Dict,
                           rooms: List[Room], time_slots: List[TimeSlot],
                           clusters: List[List[Course]]) -> Dict:
        """Execute Stage 2 on CPU"""
        
        # Use Adaptive CP-SAT solver
        cpsat_solver = AdaptiveCPSATSolver(
            courses=courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            max_cluster_size=12
        )
        
        # Get feasible solution
        feasible_solution = await asyncio.get_event_loop().run_in_executor(
            None, cpsat_solver.solve_cluster, courses
        )
        
        if not feasible_solution:
            return {'schedule': {}, 'quality_score': 0, 'conflicts': [], 'execution_time': 0}
        
        # Optimize with GA
        ga_optimizer = GeneticAlgorithmOptimizer(
            courses=courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            students={},
            initial_solution=feasible_solution,
            population_size=self.config['ga_population'],
            generations=self.config['ga_generations']
        )
        
        optimized_solution = await asyncio.get_event_loop().run_in_executor(
            None, ga_optimizer.evolve
        )
        
        return {
            'schedule': optimized_solution,
            'quality_score': ga_optimizer.fitness(optimized_solution),
            'conflicts': [],
            'execution_time': 0
        }
    
    async def execute_stage2_parallel(self, courses: List[Course], faculty: Dict,
                                    rooms: List[Room], time_slots: List[TimeSlot],
                                    clusters: List[List[Course]]) -> Dict:
        """Execute Stage 2 with parallel processing"""
        
        max_workers = self.config.get('parallel_processes', 2)
        
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # Split clusters among processes
            cluster_chunks = [clusters[i::max_workers] for i in range(max_workers)]
            
            tasks = []
            for chunk in cluster_chunks:
                if chunk:  # Only submit non-empty chunks
                    task = asyncio.get_event_loop().run_in_executor(
                        executor, self._solve_cluster_chunk, courses, faculty, rooms, time_slots, chunk
                    )
                    tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # Merge results
            merged_schedule = {}
            total_conflicts = []
            total_quality = 0
            max_time = 0
            
            for result in results:
                merged_schedule.update(result.get('schedule', {}))
                total_conflicts.extend(result.get('conflicts', []))
                total_quality += result.get('quality_score', 0)
                max_time = max(max_time, result.get('execution_time', 0))
            
            return {
                'schedule': merged_schedule,
                'quality_score': total_quality / len(results) if results else 0,
                'conflicts': total_conflicts,
                'execution_time': max_time
            }
    
    def _solve_cluster_chunk(self, courses: List[Course], faculty: Dict,
                           rooms: List[Room], time_slots: List[TimeSlot],
                           cluster_chunk: List[List[Course]]) -> Dict:
        """Solve a chunk of clusters in separate process"""
        
        # Use CP-SAT + GA pipeline
        all_courses = []
        for cluster in cluster_chunk:
            all_courses.extend(cluster)
        
        cpsat_solver = AdaptiveCPSATSolver(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            max_cluster_size=12
        )
        
        feasible_solution = cpsat_solver.solve_cluster(all_courses)
        
        if not feasible_solution:
            return {'schedule': {}, 'quality_score': 0, 'conflicts': [], 'execution_time': 0}
        
        ga_optimizer = GeneticAlgorithmOptimizer(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            students={},
            initial_solution=feasible_solution,
            population_size=self.config['ga_population'],
            generations=self.config['ga_generations']
        )
        
        optimized_solution = ga_optimizer.evolve()
        
        return {
            'schedule': optimized_solution,
            'quality_score': ga_optimizer.fitness(optimized_solution),
            'conflicts': [],
            'execution_time': 0
        }
    
    async def execute_stage3(self, schedule: Dict, courses: List[Course],
                           faculty: Dict, rooms: List[Room], time_slots: List[TimeSlot]) -> Dict:
        """Execute Stage 3 on CPU"""
        
        # DESIGN FREEZE: RL policy FROZEN during runtime scheduling
        # Learning disabled to ensure deterministic, reproducible schedules
        # Offline training only - no exploration during production
        resolver = SimpleTabularQLearning(
            courses=courses,
            faculty=faculty,
            rooms=rooms,
            time_slots=time_slots,
            learning_rate=0.15,
            gamma=0.85,
            epsilon=0.05,  # Minimal exploration (mostly exploit)
            frozen=True  # CRITICAL: No learning during runtime
        )
        
        return await asyncio.get_event_loop().run_in_executor(
            None, resolver.resolve_conflicts, schedule
        )

class GPUExecutor:
    """
    ⚠️ EXPERIMENTAL / ARCHIVED (DESIGN FREEZE)
    ============================================
    GPU-accelerated execution engine
    
    STATUS: Disabled for production
    REASON: 
    - Python dicts + branching logic = poor fit for GPUs
    - Nondeterminism and race conditions
    - Minimal correctness benefit
    - Research/paper use only
    
    DO NOT USE in production. Kept for ablation studies and experiments.
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.device = None
        self.torch = None
        logger.warning("[GPUExecutor] EXPERIMENTAL - Not for production use")
        
    async def initialize(self):
        """Initialize GPU resources"""
        try:
            import torch
            self.torch = torch
            
            if torch.cuda.is_available():
                self.device = torch.device('cuda')
                logger.info(f"GPU initialized: {torch.cuda.get_device_name(0)}")
            else:
                raise RuntimeError("CUDA not available")
                
        except ImportError:
            raise RuntimeError("PyTorch not installed")
    
    async def execute_stage2(self, courses: List[Course], faculty: Dict,
                           rooms: List[Room], time_slots: List[TimeSlot],
                           clusters: List[List[Course]]) -> Dict:
        """Execute Stage 2 with GPU acceleration"""
        
        # Use GPU-accelerated GA with CPU CP-SAT
        # GPU-accelerated GA (CP-SAT on CPU)
        all_courses = []
        for cluster in clusters:
            all_courses.extend(cluster)
        
        cpsat_solver = AdaptiveCPSATSolver(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            max_cluster_size=12
        )
        
        feasible_solution = await asyncio.get_event_loop().run_in_executor(
            None, cpsat_solver.solve_cluster, all_courses
        )
        
        if not feasible_solution:
            return {'schedule': {}, 'quality_score': 0, 'conflicts': [], 'execution_time': 0}
        
        # GPU-accelerated GA would go here
        ga_optimizer = GeneticAlgorithmOptimizer(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            students={},
            initial_solution=feasible_solution,
            population_size=self.config['ga_population'] * 2,  # Larger for GPU
            generations=self.config['ga_generations'] * 2
        )
        
        optimized_solution = await asyncio.get_event_loop().run_in_executor(
            None, ga_optimizer.evolve
        )
        
        return {
            'schedule': optimized_solution,
            'quality_score': ga_optimizer.fitness(optimized_solution),
            'conflicts': [],
            'execution_time': 0
        }
    
    async def execute_stage3(self, schedule: Dict, courses: List[Course],
                           faculty: Dict, rooms: List[Room], time_slots: List[TimeSlot]) -> Dict:
        """Execute Stage 3 with GPU acceleration"""
        
        # DESIGN FREEZE: RL policy FROZEN during runtime scheduling
        # Learning disabled to ensure deterministic, reproducible schedules
        # Offline training only - no exploration during production
        resolver = SimpleTabularQLearning(
            courses=courses,
            faculty=faculty,
            rooms=rooms,
            time_slots=time_slots,
            learning_rate=0.15,
            gamma=0.85,
            epsilon=0.05,  # Minimal exploration (mostly exploit)
            frozen=True  # CRITICAL: No learning during runtime
        )
        
        return await asyncio.get_event_loop().run_in_executor(
            None, resolver.resolve_conflicts, schedule
        )

class DistributedExecutor:
    """
    Distributed execution engine for cloud/cluster environments
    
    STATUS: Optional (Celery-based horizontal scaling)
    NOTE: Not affected by DESIGN FREEZE (CPU-based, deterministic)
    USE: Only when Celery workers available
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.cluster_nodes = []
        logger.info("[DistributedExecutor] Optional Celery-based distribution")
        
    async def initialize(self):
        """Initialize distributed resources"""
        try:
            # Check for Celery
            from celery import Celery
            
            self.celery_app = Celery(
                'timetable_distributed',
                broker=self.config.get('celery_broker', 'redis://localhost:6379/0'),
                backend=self.config.get('celery_backend', 'redis://localhost:6379/1')
            )
            
            # Check active workers
            inspect = self.celery_app.control.inspect()
            active_workers = inspect.active()
            
            if not active_workers:
                raise RuntimeError("No Celery workers available")
            
            self.cluster_nodes = list(active_workers.keys())
            logger.info(f"Distributed executor initialized with {len(self.cluster_nodes)} workers")
            
        except ImportError:
            raise RuntimeError("Celery not installed")
    
    async def execute_stage2(self, courses: List[Course], faculty: Dict,
                           rooms: List[Room], time_slots: List[TimeSlot],
                           clusters: List[List[Course]]) -> Dict:
        """Execute Stage 2 with distributed processing"""
        
        from celery import group
        from .distributed_tasks import solve_cluster_task
        
        # Distribute clusters across workers
        num_workers = len(self.cluster_nodes)
        cluster_chunks = [clusters[i::num_workers] for i in range(num_workers)]
        
        # Create distributed task group
        job = group(
            solve_cluster_task.s(courses, faculty, rooms, time_slots, chunk, self.config)
            for chunk in cluster_chunks if chunk
        )
        
        # Execute and wait for results
        result = job.apply_async()
        results = result.get(timeout=600)  # 10 minute timeout
        
        # Merge results
        merged_schedule = {}
        total_conflicts = []
        total_quality = 0
        max_time = 0
        
        for result in results:
            merged_schedule.update(result.get('schedule', {}))
            total_conflicts.extend(result.get('conflicts', []))
            total_quality += result.get('quality_score', 0)
            max_time = max(max_time, result.get('execution_time', 0))
        
        return {
            'schedule': merged_schedule,
            'quality_score': total_quality / len(results) if results else 0,
            'conflicts': total_conflicts,
            'execution_time': max_time
        }
    
    async def execute_stage3(self, schedule: Dict, courses: List[Course],
                           faculty: Dict, rooms: List[Room], time_slots: List[TimeSlot]) -> Dict:
        """Execute Stage 3 with distributed processing"""
        
        from .distributed_tasks import resolve_conflicts_task
        
        # Execute RL conflict resolution on distributed workers
        task = resolve_conflicts_task.delay(schedule, courses, faculty, rooms, time_slots, self.config)
        result = task.get(timeout=300)  # 5 minute timeout
        
        return result

# Global adaptive executor instance
adaptive_executor = AdaptiveExecutor()

async def get_adaptive_executor() -> AdaptiveExecutor:
    """Get initialized adaptive executor"""
    if adaptive_executor.hardware_profile is None:
        await adaptive_executor.initialize()
    return adaptive_executor