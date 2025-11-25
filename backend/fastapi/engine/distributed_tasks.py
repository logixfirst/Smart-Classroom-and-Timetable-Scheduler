"""
Distributed Celery Tasks for Cloud/Cluster Execution
Enables horizontal scaling across multiple machines
"""
import logging
from typing import Dict, List, Any
from celery import Celery
import os

from models.timetable_models import Course, Faculty, Room, TimeSlot
from .stage2_hybrid import CPSATSolver, GeneticAlgorithmOptimizer
from .stage3_rl import resolve_conflicts_with_enhanced_rl

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    'timetable_distributed',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
)

# Configure Celery
import ssl
celery_app.conf.update(
    task_serializer='pickle',
    accept_content=['pickle'],
    result_serializer='pickle',
    timezone='UTC',
    enable_utc=True,
    broker_use_ssl={'ssl_cert_reqs': ssl.CERT_NONE},
    redis_backend_use_ssl={'ssl_cert_reqs': ssl.CERT_NONE},
    task_routes={
        'engine.distributed_tasks.solve_cluster_task': {'queue': 'timetable_heavy'},
        'engine.distributed_tasks.resolve_conflicts_task': {'queue': 'timetable_light'},
        'engine.distributed_tasks.gpu_accelerated_task': {'queue': 'timetable_gpu'},
    },
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=10,
    task_time_limit=1800,  # 30 minutes
    task_soft_time_limit=1500,  # 25 minutes
)

@celery_app.task(bind=True, name='engine.distributed_tasks.solve_cluster_task')
def solve_cluster_task(self, courses: List[Course], faculty: Dict, 
                      rooms: List[Room], time_slots: List[TimeSlot],
                      cluster_chunk: List[List[Course]], config: Dict) -> Dict:
    """
    Distributed task for solving cluster chunks
    Runs on remote Celery workers
    """
    try:
        logger.info(f"Worker {self.request.hostname} solving {len(cluster_chunk)} clusters")
        
        # Update task progress
        self.update_state(state='PROGRESS', meta={'progress': 0, 'status': 'Initializing solver'})
        
        # Initialize CP-SAT solver
        all_courses = []
        for cluster in cluster_chunk:
            all_courses.extend(cluster)
        
        cpsat_solver = CPSATSolver(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            timeout_seconds=config.get('cpsat_timeout', 30)
        )
        
        self.update_state(state='PROGRESS', meta={'progress': 20, 'status': 'Solving clusters'})
        
        # Solve with CP-SAT + GA
        feasible_solution = cpsat_solver.solve()
        
        if not feasible_solution:
            result = {'schedule': {}, 'quality_score': 0, 'conflicts': [], 'execution_time': 0}
        else:
            ga_optimizer = GeneticAlgorithmOptimizer(
                courses=all_courses,
                rooms=rooms,
                time_slots=time_slots,
                faculty=faculty,
                students={},
                initial_solution=feasible_solution,
                population_size=config.get('ga_population', 15),
                generations=config.get('ga_generations', 25)
            )
            
            optimized_solution = ga_optimizer.evolve()
            result = {
                'schedule': optimized_solution,
                'quality_score': ga_optimizer.fitness(optimized_solution),
                'conflicts': [],
                'execution_time': 0
            }
        
        self.update_state(state='PROGRESS', meta={'progress': 100, 'status': 'Complete'})
        
        logger.info(f"Worker {self.request.hostname} completed cluster solving")
        return result
        
    except Exception as e:
        logger.error(f"Distributed cluster solving failed: {e}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise

@celery_app.task(bind=True, name='engine.distributed_tasks.resolve_conflicts_task')
def resolve_conflicts_task(self, schedule: Dict, courses: List[Course],
                          faculty: Dict, rooms: List[Room], time_slots: List[TimeSlot],
                          config: Dict) -> Dict:
    """
    Distributed task for RL conflict resolution
    Runs on remote Celery workers
    """
    try:
        logger.info(f"Worker {self.request.hostname} resolving conflicts")
        
        self.update_state(state='PROGRESS', meta={'progress': 0, 'status': 'Initializing RL resolver'})
        
        # Detect conflicts
        conflicts = []
        student_schedule = {}
        for (course_id, session), (time_slot, room_id) in schedule.items():
            course = next((c for c in courses if c.course_id == course_id), None)
            if course:
                for student_id in getattr(course, 'student_ids', []):
                    key = (student_id, time_slot)
                    if key in student_schedule:
                        conflicts.append({
                            'type': 'student_conflict',
                            'student_id': student_id,
                            'course_id': course_id,
                            'time_slot': time_slot
                        })
                    else:
                        student_schedule[key] = course_id
        
        self.update_state(state='PROGRESS', meta={'progress': 20, 'status': 'Resolving conflicts'})
        
        if not conflicts:
            result = {'schedule': schedule, 'conflicts_resolved': 0}
        else:
            from .stage3_rl import resolve_conflicts_with_enhanced_rl
            
            timetable_data = {
                'courses': courses,
                'rooms': rooms,
                'time_slots': time_slots,
                'faculty': faculty,
                'current_solution': schedule
            }
            
            resolved_conflicts = resolve_conflicts_with_enhanced_rl(conflicts, timetable_data)
            result = {
                'schedule': timetable_data['current_solution'],
                'conflicts_resolved': len(resolved_conflicts)
            }
        
        self.update_state(state='PROGRESS', meta={'progress': 100, 'status': 'Complete'})
        
        logger.info(f"Worker {self.request.hostname} completed conflict resolution")
        return result
        
    except Exception as e:
        logger.error(f"Distributed conflict resolution failed: {e}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise

@celery_app.task(bind=True, name='engine.distributed_tasks.gpu_accelerated_task')
def gpu_accelerated_task(self, courses: List[Course], faculty: Dict,
                        rooms: List[Room], time_slots: List[TimeSlot],
                        clusters: List[List[Course]], config: Dict) -> Dict:
    """
    GPU-accelerated distributed task
    Runs on workers with GPU resources
    """
    try:
        import torch
        
        if not torch.cuda.is_available():
            raise RuntimeError("GPU not available on this worker")
        
        logger.info(f"GPU Worker {self.request.hostname} with {torch.cuda.get_device_name(0)}")
        
        self.update_state(state='PROGRESS', meta={'progress': 0, 'status': 'Initializing GPU solver'})
        
        # GPU-accelerated solving
        all_courses = []
        for cluster in clusters:
            all_courses.extend(cluster)
        
        cpsat_solver = CPSATSolver(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            timeout_seconds=config.get('cpsat_timeout', 30)
        )
        
        self.update_state(state='PROGRESS', meta={'progress': 20, 'status': 'GPU solving clusters'})
        
        feasible_solution = cpsat_solver.solve()
        
        if not feasible_solution:
            result = {'schedule': {}, 'quality_score': 0, 'conflicts': [], 'execution_time': 0}
        else:
            # GPU-accelerated GA
            ga_optimizer = GeneticAlgorithmOptimizer(
                courses=all_courses,
                rooms=rooms,
                time_slots=time_slots,
                faculty=faculty,
                students={},
                initial_solution=feasible_solution,
                population_size=config.get('ga_population', 30) * 2,  # Larger for GPU
                generations=config.get('ga_generations', 50) * 2
            )
            
            optimized_solution = ga_optimizer.evolve()
            result = {
                'schedule': optimized_solution,
                'quality_score': ga_optimizer.fitness(optimized_solution),
                'conflicts': [],
                'execution_time': 0
            }
        
        self.update_state(state='PROGRESS', meta={'progress': 100, 'status': 'Complete'})
        
        logger.info(f"GPU Worker {self.request.hostname} completed GPU solving")
        return result
        
    except Exception as e:
        logger.error(f"GPU distributed solving failed: {e}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise

@celery_app.task(bind=True, name='engine.distributed_tasks.hybrid_cloud_task')
def hybrid_cloud_task(self, courses: List[Course], faculty: Dict,
                     rooms: List[Room], time_slots: List[TimeSlot],
                     clusters: List[List[Course]], config: Dict) -> Dict:
    """
    Hybrid cloud task that uses all available resources
    Automatically detects and uses GPU if available, falls back to CPU
    """
    try:
        logger.info(f"Hybrid Worker {self.request.hostname} starting")
        
        self.update_state(state='PROGRESS', meta={'progress': 0, 'status': 'Detecting hardware'})
        
        # Detect available hardware on this worker
        use_gpu = False
        gpu_device = None
        
        try:
            import torch
            if torch.cuda.is_available():
                use_gpu = True
                gpu_device = torch.device('cuda')
                logger.info(f"Worker using GPU: {torch.cuda.get_device_name(0)}")
            else:
                logger.info("Worker using CPU only")
        except ImportError:
            logger.info("Worker using CPU only (PyTorch not available)")
        
        self.update_state(state='PROGRESS', meta={'progress': 10, 'status': 'Initializing adaptive solver'})
        
        # Adjust config based on available hardware
        worker_config = config.copy()
        if use_gpu:
            worker_config['ga_population'] = min(worker_config.get('ga_population', 15) * 2, 60)
            worker_config['ga_generations'] = min(worker_config.get('ga_generations', 25) * 2, 100)
        
        # Adaptive solving based on available hardware
        all_courses = []
        for cluster in clusters:
            all_courses.extend(cluster)
        
        cpsat_solver = CPSATSolver(
            courses=all_courses,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            timeout_seconds=worker_config.get('cpsat_timeout', 30)
        )
        
        self.update_state(state='PROGRESS', meta={'progress': 20, 'status': 'Solving with adaptive strategy'})
        
        feasible_solution = cpsat_solver.solve()
        
        if not feasible_solution:
            result = {'schedule': {}, 'quality_score': 0, 'conflicts': [], 'execution_time': 0}
        else:
            ga_optimizer = GeneticAlgorithmOptimizer(
                courses=all_courses,
                rooms=rooms,
                time_slots=time_slots,
                faculty=faculty,
                students={},
                initial_solution=feasible_solution,
                population_size=worker_config.get('ga_population', 15),
                generations=worker_config.get('ga_generations', 25)
            )
            
            optimized_solution = ga_optimizer.evolve()
            result = {
                'schedule': optimized_solution,
                'quality_score': ga_optimizer.fitness(optimized_solution),
                'conflicts': [],
                'execution_time': 0
            }
        
        self.update_state(state='PROGRESS', meta={'progress': 100, 'status': 'Complete'})
        
        logger.info(f"Hybrid Worker {self.request.hostname} completed")
        return result
        
    except Exception as e:
        logger.error(f"Hybrid cloud task failed: {e}")
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise

@celery_app.task(bind=True, name='engine.distributed_tasks.health_check_task')
def health_check_task(self) -> Dict:
    """
    Health check task for distributed workers
    Returns worker capabilities and status
    """
    try:
        import psutil
        import platform
        
        # Basic system info
        worker_info = {
            'hostname': self.request.hostname,
            'platform': platform.system(),
            'cpu_cores': psutil.cpu_count(logical=False),
            'cpu_threads': psutil.cpu_count(logical=True),
            'memory_gb': psutil.virtual_memory().total / (1024**3),
            'available_memory_gb': psutil.virtual_memory().available / (1024**3),
            'gpu_available': False,
            'gpu_memory_gb': 0,
            'cuda_version': None,
            'pytorch_available': False
        }
        
        # Check GPU availability
        try:
            import torch
            worker_info['pytorch_available'] = True
            
            if torch.cuda.is_available():
                worker_info['gpu_available'] = True
                worker_info['gpu_memory_gb'] = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                worker_info['cuda_version'] = torch.version.cuda
                worker_info['gpu_name'] = torch.cuda.get_device_name(0)
        except ImportError:
            pass
        
        # Check other dependencies
        try:
            import ortools
            worker_info['ortools_available'] = True
        except ImportError:
            worker_info['ortools_available'] = False
        
        try:
            import networkx
            worker_info['networkx_available'] = True
        except ImportError:
            worker_info['networkx_available'] = False
        
        return worker_info
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {'error': str(e), 'hostname': getattr(self.request, 'hostname', 'unknown')}

@celery_app.task(bind=True, name='engine.distributed_tasks.benchmark_task')
def benchmark_task(self, test_size: str = 'small') -> Dict:
    """
    Benchmark task to measure worker performance
    Helps with load balancing and worker selection
    """
    try:
        import time
        import random
        
        logger.info(f"Running {test_size} benchmark on {self.request.hostname}")
        
        start_time = time.time()
        
        # CPU benchmark
        if test_size == 'small':
            iterations = 100000
        elif test_size == 'medium':
            iterations = 1000000
        else:  # large
            iterations = 10000000
        
        # Simple CPU-intensive task
        total = 0
        for i in range(iterations):
            total += random.random() * random.random()
        
        cpu_time = time.time() - start_time
        
        # Memory benchmark
        start_time = time.time()
        data = [random.random() for _ in range(iterations // 10)]
        data.sort()
        memory_time = time.time() - start_time
        
        # GPU benchmark (if available)
        gpu_time = 0
        try:
            import torch
            if torch.cuda.is_available():
                start_time = time.time()
                
                # Simple GPU computation
                size = 1000 if test_size == 'small' else 5000 if test_size == 'medium' else 10000
                a = torch.randn(size, size, device='cuda')
                b = torch.randn(size, size, device='cuda')
                c = torch.matmul(a, b)
                torch.cuda.synchronize()
                
                gpu_time = time.time() - start_time
        except:
            pass
        
        benchmark_result = {
            'hostname': self.request.hostname,
            'test_size': test_size,
            'cpu_time': cpu_time,
            'memory_time': memory_time,
            'gpu_time': gpu_time,
            'total_time': cpu_time + memory_time + gpu_time,
            'cpu_score': 1.0 / cpu_time if cpu_time > 0 else 0,
            'memory_score': 1.0 / memory_time if memory_time > 0 else 0,
            'gpu_score': 1.0 / gpu_time if gpu_time > 0 else 0
        }
        
        logger.info(f"Benchmark complete on {self.request.hostname}: CPU={cpu_time:.2f}s, GPU={gpu_time:.2f}s")
        return benchmark_result
        
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        return {'error': str(e), 'hostname': getattr(self.request, 'hostname', 'unknown')}

# Task routing and worker management
@celery_app.task(bind=True, name='engine.distributed_tasks.get_worker_stats')
def get_worker_stats(self) -> Dict:
    """Get comprehensive worker statistics"""
    try:
        inspect = celery_app.control.inspect()
        
        stats = {
            'active_workers': list(inspect.active().keys()) if inspect.active() else [],
            'registered_tasks': inspect.registered(),
            'active_tasks': inspect.active(),
            'scheduled_tasks': inspect.scheduled(),
            'reserved_tasks': inspect.reserved(),
            'worker_stats': inspect.stats()
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get worker stats: {e}")
        return {'error': str(e)}

# Auto-discovery and load balancing
def discover_workers() -> List[Dict]:
    """Discover available workers and their capabilities"""
    try:
        from celery import group
        
        # Send health check to all workers
        job = group(health_check_task.s() for _ in range(10))  # Try up to 10 workers
        result = job.apply_async()
        
        # Wait for responses (with timeout)
        worker_info = []
        try:
            responses = result.get(timeout=30)
            worker_info = [r for r in responses if 'error' not in r]
        except:
            pass
        
        return worker_info
        
    except Exception as e:
        logger.error(f"Worker discovery failed: {e}")
        return []

def select_optimal_workers(worker_info: List[Dict], task_type: str = 'cpu') -> List[str]:
    """Select optimal workers based on task requirements"""
    
    if not worker_info:
        return []
    
    if task_type == 'gpu':
        # Prefer workers with GPU
        gpu_workers = [w for w in worker_info if w.get('gpu_available', False)]
        if gpu_workers:
            # Sort by GPU memory
            gpu_workers.sort(key=lambda w: w.get('gpu_memory_gb', 0), reverse=True)
            return [w['hostname'] for w in gpu_workers]
    
    elif task_type == 'memory':
        # Prefer workers with more memory
        worker_info.sort(key=lambda w: w.get('available_memory_gb', 0), reverse=True)
    
    else:  # cpu
        # Prefer workers with more CPU cores
        worker_info.sort(key=lambda w: w.get('cpu_cores', 0), reverse=True)
    
    return [w['hostname'] for w in worker_info]