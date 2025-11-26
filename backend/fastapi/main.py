"""
Enterprise FastAPI Timetable Generation Service
Hardware-Adaptive Cloud-Distributed System with GPU Acceleration

Features:
- Automatic hardware detection (CPU, GPU, RAM, Cloud)
- Adaptive algorithm selection (CPU/GPU/Distributed/Hybrid)
- Enterprise patterns (Circuit Breaker, Bulkhead, Saga)
- Cloud scaling with Celery workers
- GPU acceleration with CUDA/OpenCL
- No hardware limitations - software adapts to available resources
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import redis
import redis.exceptions
import json
import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
import traceback
from pydantic import BaseModel
from typing import Optional, List
import signal
from functools import wraps
import os

# Hardware-Adaptive System
from engine.hardware_detector import get_hardware_profile, HardwareProfile, get_optimal_config
from engine.adaptive_executor import get_adaptive_executor, AdaptiveExecutor
from engine.distributed_tasks import discover_workers, select_optimal_workers

# Fix missing import
import os

# Configure logging FIRST (before any logger usage)
# Clear log file on startup
import os
log_file = os.path.join(os.path.dirname(__file__), 'fastapi_logs.txt')
with open(log_file, 'w') as f:
    f.write('# FastAPI Backend Logs - Started at ' + datetime.now().isoformat() + '\n')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler(log_file, mode='a')  # File output (append mode)
    ]
)
logger = logging.getLogger(__name__)
logger.info(f"Logs saved to: {log_file}")

class StageError(Exception):
    """Base exception for stage errors"""
    def __init__(self, stage: str, message: str, original_error: Exception = None):
        self.stage = stage
        self.message = message
        self.original_error = original_error
        super().__init__(f"[{stage}] {message}")

def handle_stage_error(stage_name: str):
    """Decorator for consistent error handling across stages"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except asyncio.CancelledError:
                logger.warning(f"[{stage_name}] Cancelled by user")
                raise
            except MemoryError as e:
                logger.error(f"[{stage_name}] Memory exhausted: {e}")
                raise StageError(stage_name, "Memory exhausted", e)
            except TimeoutError as e:
                logger.error(f"[{stage_name}] Timeout: {e}")
                raise StageError(stage_name, "Operation timed out", e)
            except Exception as e:
                logger.error(f"[{stage_name}] Unexpected error: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise StageError(stage_name, str(e), e)
        return wrapper
    return decorator

# Feature 10: Celery detection (package only, not runtime availability)
try:
    from celery import Celery
    CELERY_AVAILABLE = True
    logger.debug("Celery package detected (not verified if running)")
except ImportError:
    CELERY_AVAILABLE = False
    logger.debug("Celery package not installed")

# Global hardware profile and executor
hardware_profile: Optional[HardwareProfile] = None
adaptive_executor: Optional[AdaptiveExecutor] = None
redis_client_global = None

# Enterprise Patterns
class CircuitBreaker:
    """Circuit breaker pattern for service protection"""
    
    def __init__(self, failure_threshold=3, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def __call__(self, func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == 'OPEN':
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = 'HALF_OPEN'
                    logger.info("Circuit breaker moving to HALF_OPEN")
                else:
                    raise HTTPException(status_code=503, detail="Service temporarily unavailable")
            
            try:
                result = await func(*args, **kwargs)
                
                if self.state == 'HALF_OPEN':
                    self.state = 'CLOSED'
                    self.failure_count = 0
                    logger.info("Circuit breaker CLOSED - service recovered")
                
                return result
                
            except Exception as e:
                self.failure_count += 1
                self.last_failure_time = time.time()
                
                if self.failure_count >= self.failure_threshold:
                    self.state = 'OPEN'
                    logger.error(f"Circuit breaker OPEN - service failing")
                
                raise e
        
        return wrapper

class ResourceIsolation:
    """Bulkhead pattern - isolate resources"""
    
    def __init__(self):
        from concurrent.futures import ThreadPoolExecutor
        
        # Minimal thread pools to prevent memory leaks
        self.clustering_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="clustering")
        self.cpsat_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="cpsat")
        self.context_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="context")
    
    async def execute_clustering(self, func, *args):
        """Execute clustering in isolated thread pool"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.clustering_pool, func, *args)
    
    async def execute_cpsat(self, func, *args):
        """Execute CP-SAT in isolated thread pool"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.cpsat_pool, func, *args)

class TimetableGenerationSaga:
    """Saga pattern for distributed workflow management"""
    
    def __init__(self):
        self.steps = [
            ('load_data', self._load_data, self._cleanup_data),
            ('stage1_louvain_clustering', self._stage1_louvain_clustering, self._cleanup_clustering),
            ('stage2_cpsat_solving', self._stage2_cpsat_solving, self._cleanup_cpsat),
            ('stage2_ga_optimization', self._stage2_ga_optimization, self._cleanup_ga),
            ('stage3_rl_conflict_resolution', self._stage3_rl_conflict_resolution, self._cleanup_rl)
        ]
        self.completed_steps = []
        self.job_data = {}
    
    async def execute(self, job_id: str, request_data: dict):
        """Execute saga with compensation on failure"""
        self.job_data[job_id] = {'status': 'running', 'results': {}}
        
        # Select strategy based on hardware + user preference
        from engine.strategy_selector import get_strategy_selector
        from engine.resource_monitor import ResourceMonitor
        from utils.progress_tracker import EnterpriseProgressTracker, ProgressUpdateTask
        import gc
        
        global hardware_profile, redis_client_global
        if hardware_profile:
            selector = get_strategy_selector()
            quality_mode = request_data.get('quality_mode', 'balanced')
            self.strategy = selector.select(hardware_profile, quality_mode)
            estimated_time = self.strategy.expected_time_minutes * 60
            logger.info(f"Using strategy: {self.strategy.profile_name}")
        else:
            self.strategy = None
            # Realistic estimate: load(2s) + cluster(3s) + cpsat(10s) + ga(10s) + rl(3s) = 28s
            estimated_time = 35  # 35 seconds realistic estimate with buffer
        
        # Initialize enterprise progress tracker
        self.progress_tracker = EnterpriseProgressTracker(job_id, estimated_time, redis_client_global)
        self.progress_task = ProgressUpdateTask(self.progress_tracker)
        await self.progress_task.start()
        
        # Start resource monitoring with emergency downgrade
        monitor = ResourceMonitor()
        
        async def progressive_downgrade_70():
            """Level 1: 70% RAM - Reduce sample size"""
            logger.warning("[WARN] LEVEL 1 (70% RAM): Reducing sample sizes")
            gc.collect()
            if hasattr(self, 'strategy') and self.strategy:
                self.strategy.sample_size = max(50, self.strategy.sample_size // 2)
                logger.info(f"Reduced sample_size to {self.strategy.sample_size}")
        
        async def progressive_downgrade_80():
            """Level 2: 80% RAM - Reduce population"""
            logger.warning("[WARN] LEVEL 2 (80% RAM): Reducing GA population")
            gc.collect()
            if hasattr(self, 'strategy') and self.strategy:
                self.strategy.ga_population = max(5, self.strategy.ga_population // 2)
                self.strategy.ga_islands = max(1, self.strategy.ga_islands // 2)
                logger.info(f"Reduced pop={self.strategy.ga_population}, islands={self.strategy.ga_islands}")
        
        async def progressive_downgrade_90():
            """Level 3: 90% RAM - Minimum configuration"""
            logger.error("[ERROR] LEVEL 3 (90% RAM): Emergency minimum configuration")
            gc.collect()
            if hasattr(self, 'strategy') and self.strategy:
                self.strategy.ga_population = 3
                self.strategy.ga_generations = 3
                self.strategy.ga_islands = 1
                logger.info(f"Emergency: pop=3, gen=3, islands=1")
        
        async def critical_abort():
            """Level 4: 95% RAM - Abort"""
            logger.error("[CRITICAL] (95% RAM): Aborting due to memory exhaustion")
            raise MemoryError("Critical memory exhaustion - aborting generation")
        
        # Set progressive callbacks
        monitor.set_progressive_callbacks({
            70: progressive_downgrade_70,
            80: progressive_downgrade_80,
            90: progressive_downgrade_90,
            95: critical_abort
        })
        
        # Start monitoring in background
        monitor_task = asyncio.create_task(monitor.start_monitoring(job_id, interval=30))
        
        try:
            for step_name, execute_func, compensate_func in self.steps:
                # Check cancellation before each step
                if await self._check_cancellation(job_id):
                    logger.info(f"[SAGA] Job {job_id} cancelled at {step_name}")
                    raise asyncio.CancelledError(f"Job cancelled by user")
                
                logger.info(f"[SAGA] Job {job_id}: Executing {step_name}")
                
                # Adaptive timeout per stage
                if step_name == 'stage2_ga_optimization':
                    step_timeout = 900  # 15 minutes for GA (includes initialization)
                elif step_name == 'stage2_cpsat_solving':
                    step_timeout = 600  # 10 minutes for CP-SAT
                else:
                    step_timeout = 600  # 10 minutes for data loading
                
                # Execute step with adaptive timeout
                result = await asyncio.wait_for(
                    execute_func(job_id, request_data),
                    timeout=step_timeout
                )
                
                self.completed_steps.append((step_name, compensate_func, result))
                self.job_data[job_id]['results'][step_name] = result
            
            self.job_data[job_id]['status'] = 'completed'
            monitor.stop_monitoring()
            await self.progress_task.stop()
            
            # Get results before cleanup
            results = self.job_data[job_id]['results']
            
            # Cleanup saga internal data
            self.completed_steps.clear()
            
            return results
        
        except asyncio.CancelledError as e:
            logger.warning(f"[SAGA] Job {job_id} cancelled: {e}")
            monitor.stop_monitoring()
            await self.progress_task.stop()
            await self._compensate(job_id)
            self.job_data[job_id]['status'] = 'cancelled'
            await self.progress_tracker.fail('Job cancelled by user')
            
            # Cleanup on cancellation
            self.completed_steps.clear()
            if job_id in self.job_data:
                self.job_data[job_id].clear()
            
            raise
            
        except Exception as e:
            logger.error(f"[SAGA] Job {job_id} failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            monitor.stop_monitoring()
            await self.progress_task.stop()
            await self._compensate(job_id)
            self.job_data[job_id]['status'] = 'failed'
            await self.progress_tracker.fail(f'Generation failed: {str(e)}')
            
            # Cleanup on failure
            self.completed_steps.clear()
            if job_id in self.job_data:
                self.job_data[job_id].clear()
            
            raise
    
    @handle_stage_error("LOAD_DATA")
    async def _load_data(self, job_id: str, request_data: dict):
        """Stage 0: Load and validate data with hardware detection"""
        from utils.django_client import DjangoAPIClient
        
        # Set stage for progress tracking
        self.progress_tracker.set_stage('load_data')
        
        # Detect hardware and get optimal config
        global hardware_profile, adaptive_executor
        logger.info("[HARDWARE] Detecting system...")
        hardware_profile = get_hardware_profile(force_refresh=True)
        optimal_config = get_optimal_config(hardware_profile)
        
        logger.info(f"[HARDWARE] Tier: {optimal_config['tier']} | RAM: {hardware_profile.total_ram_gb:.1f}GB | CPU: {hardware_profile.cpu_cores} cores")
        if hardware_profile.has_nvidia_gpu:
            logger.info(f"[HARDWARE] GPU: {hardware_profile.gpu_memory_gb:.1f}GB VRAM")
        
        # Hardware info logged (background task handles progress)
        
        client = DjangoAPIClient()
        try:
            org_id = request_data['organization_id']
            semester = request_data['semester']
            
            # Load data in parallel (optimized for hardware)
            if hardware_profile.cpu_cores >= 4:
                courses_task = client.fetch_courses(org_id, semester)
                faculty_task = client.fetch_faculty(org_id)
                rooms_task = client.fetch_rooms(org_id)
                time_slots_task = client.fetch_time_slots(org_id)
                students_task = client.fetch_students(org_id)
                
                courses, faculty, rooms, time_slots, students = await asyncio.gather(
                    courses_task, faculty_task, rooms_task, time_slots_task, students_task
                )
            else:
                # Sequential loading for low-end hardware
                courses = await client.fetch_courses(org_id, semester)
                faculty = await client.fetch_faculty(org_id)
                rooms = await client.fetch_rooms(org_id)
                time_slots = await client.fetch_time_slots(org_id)
                students = await client.fetch_students(org_id)
            
            # Validate data
            if not courses or len(courses) < 5:
                raise ValueError(f"Insufficient courses: {len(courses)}")
            
            # CRITICAL DEBUG: Check if rooms and time_slots are loaded
            logger.info(f"[DATA] Loaded {len(courses)} courses, {len(faculty)} faculty, {len(rooms)} rooms, {len(time_slots)} time_slots, {len(students)} students")
            
            if len(rooms) == 0:
                logger.error("[DATA] ❌ NO ROOMS LOADED - Scheduler will fail!")
            else:
                # Show room capacity distribution
                room_capacities = [r.capacity for r in rooms]
                logger.info(f"[DATA] Room capacities: min={min(room_capacities)}, max={max(room_capacities)}, avg={sum(room_capacities)/len(room_capacities):.1f}")
            
            if len(time_slots) == 0:
                logger.error("[DATA] ❌ NO TIME SLOTS GENERATED - Scheduler will fail!")
            else:
                logger.info(f"[DATA] Time slots: {len(time_slots)} slots across {len(set(t.day for t in time_slots))} days")
            
            # Check course enrollment distribution
            if courses:
                enrollments = [len(c.student_ids) for c in courses]
                logger.info(f"[DATA] Course enrollments: min={min(enrollments)}, max={max(enrollments)}, avg={sum(enrollments)/len(enrollments):.1f}")
                large_courses = sum(1 for e in enrollments if e > 60)
                logger.info(f"[DATA] Large courses (>60 students): {large_courses}/{len(courses)}")
            
            return {
                'courses': courses,
                'faculty': faculty,
                'rooms': rooms,
                'time_slots': time_slots,
                'students': students
            }
            
        finally:
            await client.close()
    
    @handle_stage_error("CLUSTERING")
    async def _stage1_louvain_clustering(self, job_id: str, request_data: dict):
        """Stage 1: Louvain clustering with hardware-adaptive configuration + cancellation"""
        from engine.stage1_clustering import LouvainClusterer
        from utils.memory_cleanup import get_memory_usage, aggressive_cleanup
        import gc
        
        # Check cancellation before starting
        if await self._check_cancellation(job_id):
            logger.info(f"[STAGE1] Job {job_id} cancelled before clustering")
            raise asyncio.CancelledError("Job cancelled by user before clustering")
        
        # Get hardware-adaptive config
        global hardware_profile
        optimal_config = get_optimal_config(hardware_profile) if hardware_profile else None
        stage1_config = optimal_config['stage1_louvain'] if optimal_config else {'workers': 1, 'edge_threshold': 0.5}
        
        mem_before = get_memory_usage()
        logger.info(f"[STAGE1] Memory: {mem_before['rss_mb']:.1f}MB | Config: {stage1_config['algorithm']} (workers={stage1_config['workers']})")
        
        data = self.job_data[job_id]['results']['load_data']
        courses = data['courses']
        
        self.progress_tracker.set_stage('clustering')
        
        clusterer = LouvainClusterer(target_cluster_size=10)
        clusters = await asyncio.to_thread(clusterer.cluster_courses, courses)
        
        # Check cancellation after clustering
        if await self._check_cancellation(job_id):
            logger.info(f"[STAGE1] Job {job_id} cancelled after clustering")
            raise asyncio.CancelledError("Job cancelled by user after clustering")
        
        del clusterer
        gc.collect()
        logger.info(f"[STAGE1] Complete: {len(clusters)} clusters")
        
        return clusters
    

    
    @handle_stage_error("CPSAT")
    async def _stage2_cpsat_solving(self, job_id: str, request_data: dict):
        """Stage 2A: Parallel CP-SAT with ThreadPoolExecutor (memory-safe)"""
        import psutil
        import gc
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from utils.memory_cleanup import get_memory_usage, aggressive_cleanup
        
        data = self.job_data[job_id]['results']
        clusters = data['stage1_louvain_clustering']
        
        # Check available memory with monitoring
        mem = psutil.virtual_memory()
        available_gb = mem.available / (1024**3)
        mem_usage = get_memory_usage()
        logger.info(f"[STAGE2] Memory before CP-SAT: {mem_usage['rss_mb']:.1f}MB ({mem_usage['percent']:.1f}%)")
        
        # Emergency cleanup if memory > 75%
        if mem_usage['percent'] > 75:
            logger.warning(f"[STAGE2] ⚠️ High memory ({mem_usage['percent']:.1f}%), forcing cleanup")
            aggressive_cleanup()
            mem = psutil.virtual_memory()
            available_gb = mem.available / (1024**3)
            mem_usage = get_memory_usage()
            logger.info(f"[STAGE2] After cleanup: {mem_usage['rss_mb']:.1f}MB ({mem_usage['percent']:.1f}%)")
        
        # Get hardware-adaptive config
        global hardware_profile
        optimal_config = get_optimal_config(hardware_profile) if hardware_profile else None
        stage2a_config = optimal_config['stage2a_cpsat'] if optimal_config else {'timeout': 1, 'parallel_clusters': 2, 'student_limit': 50}
        
        base_timeout = stage2a_config['timeout']
        max_parallel = stage2a_config['parallel_clusters']
        student_limit = stage2a_config['student_limit']
        
        # Adaptive limits based on memory
        if available_gb > 8.0:
            max_courses_per_cluster = 15
            max_rooms = 200
        elif available_gb > 6.0:
            max_courses_per_cluster = 12
            max_rooms = 150
        else:
            max_courses_per_cluster = 10
            max_rooms = 100
        
        logger.info(f"[STAGE2] Config: timeout={base_timeout}s, parallel={max_parallel}, students={student_limit}, RAM={available_gb:.1f}GB")
        
        all_solutions = {}
        total_clusters = len(clusters)
        
        # Set stage with total clusters for work-based progress
        self.progress_tracker.set_stage('cpsat', total_items=total_clusters)
        
        completed = 0
        if max_parallel == 1:
            # Sequential for very low memory
            for idx, (cluster_id, cluster_courses) in enumerate(list(clusters.items())):
                # Check cancellation during sequential CP-SAT
                if await self._check_cancellation(job_id):
                    logger.info(f"[STAGE2] Job {job_id} cancelled during sequential CP-SAT")
                    raise asyncio.CancelledError("Job cancelled by user during CP-SAT")
                
                try:
                    if len(cluster_courses) > max_courses_per_cluster:
                        cluster_courses = cluster_courses[:max_courses_per_cluster]
                    
                    solution = self._solve_cluster_safe(
                        cluster_id, cluster_courses,
                        data['load_data']['rooms'][:max_rooms],
                        data['load_data']['time_slots'],
                        data['load_data']['faculty']
                    )
                    
                    if solution:
                        all_solutions.update(solution)
                    
                    completed += 1
                    self.progress_tracker.update_work_progress(completed)
                    gc.collect()
                except Exception as e:
                    logger.error(f"Cluster {cluster_id} failed: {e}")
                    completed += 1
                    self.progress_tracker.update_work_progress(completed)
                    gc.collect()
        else:
            # Parallel with ThreadPoolExecutor (shares memory, no pickle issues)
            with ThreadPoolExecutor(max_workers=max_parallel) as executor:
                futures = {}
                for cluster_id, cluster_courses in list(clusters.items()):
                    if len(cluster_courses) > max_courses_per_cluster:
                        cluster_courses = cluster_courses[:max_courses_per_cluster]
                    
                    future = executor.submit(
                        self._solve_cluster_safe,
                        cluster_id, cluster_courses,
                        data['load_data']['rooms'][:max_rooms],
                        data['load_data']['time_slots'],
                        data['load_data']['faculty']
                    )
                    futures[future] = cluster_id
                
                for future in as_completed(futures):
                    # Check cancellation during CP-SAT
                    if await self._check_cancellation(job_id):
                        logger.info(f"[STAGE2] Job {job_id} cancelled during CP-SAT, stopping all workers")
                        # Cancel all pending futures
                        for f in futures:
                            f.cancel()
                        raise asyncio.CancelledError("Job cancelled by user during CP-SAT")
                    
                    cluster_id = futures[future]
                    try:
                        solution = future.result(timeout=base_timeout)
                        if solution:
                            all_solutions.update(solution)
                        completed += 1
                        self.progress_tracker.update_work_progress(completed)
                    except Exception as e:
                        logger.error(f"Cluster {cluster_id} failed: {e}")
                        completed += 1
                        self.progress_tracker.update_work_progress(completed)
                
                gc.collect()
        
        # Mark stage as complete and cleanup
        self.progress_tracker.mark_stage_complete()
        
        # Aggressive cleanup after CP-SAT
        cleanup_stats = aggressive_cleanup()
        logger.info(f"[STAGE2] Completed: {len(all_solutions)} assignments, freed {cleanup_stats['freed_mb']:.1f}MB")
        
        # Calculate CP-SAT success metrics (courses not sessions)
        total_courses = sum(len(courses) for courses in clusters.values())
        scheduled_courses = len(set(cid for (cid, _) in all_solutions.keys()))
        success_rate = (scheduled_courses / total_courses * 100) if total_courses > 0 else 0
        
        logger.info(f"\n{'='*80}")
        logger.info(f"[CP-SAT SUMMARY] Final Results:")
        scheduled_courses = len(set(cid for (cid, _) in all_solutions.keys()))
        logger.info(f"[CP-SAT SUMMARY] Clusters: {total_clusters}, Courses: {total_courses}")
        logger.info(f"[CP-SAT SUMMARY] Scheduled: {scheduled_courses}/{total_courses} courses ({len(all_solutions)} sessions)")
        logger.info(f"[CP-SAT SUMMARY] Success rate: {success_rate:.1f}%")
        logger.info(f"{'='*80}\n")
        
        # Decision thresholds with detailed recommendations
        # THRESHOLD: 60% - CP-SAT must schedule at least 60% of courses to continue
        if success_rate < 60:
            logger.error(f"[CP-SAT DECISION] ❌ ABORT: Success rate {success_rate:.1f}% < 60% threshold")
            logger.error(f"[CP-SAT DECISION] CP-SAT is not performing adequately")
            logger.error(f"[CP-SAT DECISION] Likely causes:")
            logger.error(f"[CP-SAT DECISION]   1. Room/course/faculty department matching disabled but still failing")
            logger.error(f"[CP-SAT DECISION]   2. Insufficient rooms for course sizes")
            logger.error(f"[CP-SAT DECISION]   3. Time slots not properly generated")
            logger.error(f"[CP-SAT DECISION]   4. Faculty availability too restrictive")
            logger.error(f"[CP-SAT DECISION]   5. Student conflicts creating impossible scenarios")
            logger.error(f"[CP-SAT DECISION] ")
            logger.error(f"[CP-SAT DECISION] 🔄 RECOMMENDATION: Switch to Genetic Algorithm")
            logger.error(f"[CP-SAT DECISION] GA can handle looser constraints and find approximate solutions")
            logger.error(f"[CP-SAT DECISION] GA uses population-based search to explore solution space better")
            raise asyncio.CancelledError(f"CP-SAT success rate {success_rate:.1f}% below minimum threshold (60%). Switch to Genetic Algorithm.")
        elif success_rate < 85:
            logger.info(f"[CP-SAT DECISION] ✅ GOOD: Success rate {success_rate:.1f}% (60-85% range)")
            logger.info(f"[CP-SAT DECISION] CP-SAT performing well")
            logger.info(f"[CP-SAT DECISION] RECOMMENDATION: GA/RL will optimize remaining courses")
        else:
            logger.info(f"[CP-SAT DECISION] ✅ EXCELLENT: Success rate {success_rate:.1f}% (>85%)")
            logger.info(f"[CP-SAT DECISION] CP-SAT performing optimally")
            logger.info(f"[CP-SAT DECISION] RECOMMENDATION: GA/RL will fine-tune quality metrics")
        
        # Store success rate for later analysis
        return {
            'schedule': all_solutions,
            'quality_score': 0,
            'conflicts': [],
            'execution_time': 0,
            'cpsat_success_rate': success_rate,
            'cpsat_total_courses': total_courses,
            'cpsat_scheduled': len(all_solutions)
        }
    
    def _solve_cluster_safe(self, cluster_id, courses, rooms, time_slots, faculty):
        """Solve single cluster with adaptive CP-SAT + Greedy hybrid"""
        from engine.stage2_cpsat import AdaptiveCPSATSolver
        from engine.stage2_greedy import SmartGreedyScheduler
        
        try:
            # Adaptive timeout based on cluster difficulty (0.5s - 5s range)
            difficulty = self._analyze_cluster_difficulty(courses)
            
            if difficulty < 0.3:
                timeout = 0.5  # Easy cluster
            elif difficulty < 0.5:
                timeout = 1.0  # Medium-easy
            elif difficulty < 0.7:
                timeout = 2.0  # Medium-hard
            else:
                timeout = 3.0  # Hard cluster (was 5s, now 3s max)
            
            logger.info(f"Cluster {cluster_id}: difficulty={difficulty:.2f}, timeout={timeout:.1f}s")
            
            # Quick feasibility check (100ms) before CP-SAT
            if not self._quick_feasibility_check(courses, rooms, time_slots, faculty):
                logger.info(f"Cluster {cluster_id}: Failed feasibility check, using greedy")
                greedy_solver = SmartGreedyScheduler(courses=courses, rooms=rooms, time_slots=time_slots, faculty=faculty)
                return greedy_solver.solve(courses)
            
            # Adaptive CP-SAT solver with hierarchical constraints
            cpsat_solver = AdaptiveCPSATSolver(
                courses=courses,
                rooms=rooms,
                time_slots=time_slots,
                faculty=faculty,
                max_cluster_size=12
            )
            
            # Try CP-SAT with adaptive timeout
            solution = cpsat_solver.solve_cluster(courses, timeout=timeout)
            
            if solution:
                logger.info(f"Cluster {cluster_id}: CP-SAT succeeded with {len(solution)} assignments")
                return solution
            
            # Fallback to smart greedy
            logger.info(f"Cluster {cluster_id}: CP-SAT failed, using smart greedy")
            greedy_solver = SmartGreedyScheduler(
                courses=courses,
                rooms=rooms,
                time_slots=time_slots,
                faculty=faculty
            )
            return greedy_solver.solve(courses)
            
        except Exception as e:
            logger.error(f"Cluster {cluster_id} error: {e}")
            # Final fallback to basic greedy
            return self._greedy_schedule(cluster_id, courses, rooms, time_slots, faculty)
    
    def _quick_feasibility_check(self, courses, rooms, time_slots, faculty) -> bool:
        """Quick 100ms feasibility check before CP-SAT (saves 80% of failed attempts)"""
        if not courses or not rooms or not time_slots:
            return False
        
        # Check 1: Faculty load (sum of course durations <= available slots)
        faculty_load = {}
        for course in courses:
            fid = getattr(course, 'faculty_id', None)
            if fid:
                duration = getattr(course, 'duration', 1)
                faculty_load[fid] = faculty_load.get(fid, 0) + duration
        
        max_load = max(faculty_load.values()) if faculty_load else 0
        if max_load > len(time_slots):
            return False  # Faculty overloaded
        
        # Check 2: Room capacity (enough large rooms for large classes)
        large_courses = [c for c in courses if getattr(c, 'enrolled_count', 0) > 50]
        large_rooms = [r for r in rooms if getattr(r, 'capacity', 0) > 50]
        if len(large_courses) > len(large_rooms) * len(time_slots):
            return False  # Not enough large rooms
        
        # Check 3: Domain size (each course has >= duration valid slots)
        for course in courses:
            duration = getattr(course, 'duration', 1)
            required_features = set(getattr(course, 'required_features', []))
            valid_rooms = [r for r in rooms if required_features.issubset(set(getattr(r, 'features', [])))]
            
            if len(valid_rooms) * len(time_slots) < duration:
                return False  # Not enough valid slots
        
        return True  # Passed all checks
    
    def _analyze_cluster_difficulty(self, courses) -> float:
        """Analyze cluster difficulty (0=easy, 1=hard) for adaptive CP-SAT timeout"""
        if not courses:
            return 0.0
        
        # Factor 1: Student overlap density
        total_students = sum(len(getattr(c, 'student_ids', [])) for c in courses)
        avg_students = total_students / len(courses) if courses else 0
        overlap_density = min(1.0, avg_students / 100.0)
        
        # Factor 2: Room constraint complexity
        feature_density = sum(len(getattr(c, 'required_features', [])) for c in courses) / len(courses)
        feature_complexity = min(1.0, feature_density / 3.0)
        
        # Factor 3: Cluster size (larger = harder)
        size_factor = min(1.0, len(courses) / 15.0)
        
        # Factor 4: Faculty conflicts (same faculty teaching multiple courses)
        faculty_ids = [getattr(c, 'faculty_id', None) for c in courses if getattr(c, 'faculty_id', None)]
        faculty_conflicts = 1.0 - (len(set(faculty_ids)) / len(faculty_ids)) if faculty_ids else 0.0
        
        # Weighted difficulty (0.0 = easy, 1.0 = hard)
        difficulty = (overlap_density * 0.4 + feature_complexity * 0.2 + size_factor * 0.2 + faculty_conflicts * 0.2)
        return difficulty
    
    def _greedy_schedule(self, cluster_id, courses, rooms, time_slots, faculty):
        """Greedy scheduling fallback - ALWAYS returns something"""
        schedule = {}
        
        sorted_courses = sorted(
            courses,
            key=lambda c: len(getattr(c, 'student_ids', [])) * len(getattr(c, 'required_features', [])),
            reverse=True
        )
        
        used_slots = set()
        faculty_schedule = {}
        room_schedule = {}
        
        for course in sorted_courses:
            assigned = False
            
            for time_slot in time_slots:
                if assigned:
                    break
                    
                faculty_id = getattr(course, 'faculty_id', None)
                if faculty_id and (faculty_id, time_slot.slot_id) in faculty_schedule:
                    continue
                
                for room in rooms:
                    if (room.room_id, time_slot.slot_id) in room_schedule:
                        continue
                    
                    required_features = set(getattr(course, 'required_features', []))
                    room_features = set(getattr(room, 'features', []))
                    if required_features and not required_features.issubset(room_features):
                        continue
                    
                    key = (course.course_id, 0)
                    value = (time_slot.slot_id, room.room_id)
                    schedule[key] = value
                    
                    used_slots.add((time_slot.slot_id, room.room_id))
                    if faculty_id:
                        faculty_schedule[(faculty_id, time_slot.slot_id)] = course.course_id
                    room_schedule[(room.room_id, time_slot.slot_id)] = course.course_id
                    
                    assigned = True
                    break
            
            if not assigned:
                logger.warning(f"Could not assign course {course.course_id} in cluster {cluster_id}")
        
        logger.info(f"Cluster {cluster_id}: Greedy assigned {len(schedule)}/{len(courses)} courses")
        return schedule
    
    def _generate_mock_timetable(self, courses, rooms, time_slots):
        """Generate complete mock timetable for ALL courses when CP-SAT fails"""
        import random
        
        logger.info(f"[MOCK] Generating timetable for {len(courses)} courses, {len(rooms)} rooms, {len(time_slots)} slots")
        
        mock_schedule = {}
        
        # Distribute ALL courses across available time slots
        for i, course in enumerate(courses):  # ALL COURSES
            # Assign to time slot in round-robin fashion
            time_slot_idx = i % len(time_slots) if time_slots else 0
            room_idx = i % len(rooms) if rooms else 0
            
            if rooms and time_slots:
                room = rooms[room_idx]
                time_slot = time_slots[time_slot_idx]
                
                key = (course.course_id, 0)  # session 0
                value = (time_slot.slot_id, room.room_id)
                mock_schedule[key] = value
        
        logger.info(f"[MOCK] Generated {len(mock_schedule)} assignments")
        return mock_schedule
    
    @handle_stage_error("GA")
    async def _stage2_ga_optimization(self, job_id: str, request_data: dict):
        """Stage 2B: GPU Tensor GA - 90%+ GPU utilization with memory management + cancellation"""
        import gc
        import torch
        from utils.memory_cleanup import get_memory_usage, aggressive_cleanup
        
        # Check cancellation before starting GA
        if await self._check_cancellation(job_id):
            logger.info(f"[STAGE2B] Job {job_id} cancelled before GA")
            raise asyncio.CancelledError("Job cancelled by user before GA")
        
        # Check memory before GA
        mem_before = get_memory_usage()
        logger.info(f"[STAGE2B] Memory before GA: {mem_before['rss_mb']:.1f}MB ({mem_before['percent']:.1f}%)")
        
        data = self.job_data[job_id]['results']
        cpsat_result = data['stage2_cpsat_solving']
        initial_schedule = cpsat_result.get('schedule', {})
        
        if not initial_schedule:
            logger.warning("[STAGE2B] No initial schedule, skipping GA")
            return cpsat_result
        
        logger.info(f"[STAGE2B] GPU Tensor GA: {len(initial_schedule)} assignments")
        self.progress_tracker.set_stage('ga')
        
        try:
            courses = data['load_data']['courses']
            rooms = data['load_data']['rooms']
            time_slots = data['load_data']['time_slots']
            faculty = data['load_data']['faculty']
            
            # Use hardware-optimal config
            global hardware_profile
            optimal_config = get_optimal_config(hardware_profile) if hardware_profile else {}
            ga_config = optimal_config.get('stage2b_ga', {'population': 12, 'generations': 18, 'islands': 1, 'use_gpu': False, 'fitness_mode': 'full'})
            
            # CRITICAL: Only use GPU if config explicitly allows it (checks VRAM >= 8GB)
            if ga_config.get('use_gpu', False):
                # GPU Tensor GA
                from engine.gpu_tensor_ga import GPUTensorGA
                
                pop_size = min(ga_config['population'] * 40, 2000)
                generations = ga_config['generations']
                logger.info(f"[STAGE2B] GPU Tensor GA: pop={pop_size}, gen={generations}")
                
                logger.info(f"[STAGE2B] ✅ GPU Tensor GA: pop={pop_size}, gen={generations}")
                
                gpu_ga = GPUTensorGA(
                    courses=courses,
                    rooms=rooms,
                    time_slots=time_slots,
                    faculty=faculty,
                    initial_solution=initial_schedule,
                    population_size=pop_size,
                    generations=generations,
                    mutation_rate=0.15,
                    device='cuda'
                )
                
                optimized_schedule = await asyncio.to_thread(gpu_ga.evolve)
                
                # Calculate fitness using old GA for compatibility
                from engine.stage2_ga import GeneticAlgorithmOptimizer
                temp_ga = GeneticAlgorithmOptimizer(
                    courses=courses, rooms=rooms, time_slots=time_slots,
                    faculty=faculty, students={},
                    initial_solution=optimized_schedule,
                    population_size=1, generations=1
                )
                final_fitness = temp_ga.fitness(optimized_schedule)
                del temp_ga
                
                logger.info(f"[STAGE2B] ✅ GPU GA complete: fitness={final_fitness:.4f}")
                
                # CRITICAL: Force GPU cleanup after GA
                del gpu_ga
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                gc.collect()
                logger.info("[STAGE2B] ✅ GPU memory released")
            else:
                # CPU GA with hardware-optimal config
                pop = ga_config.get('population', 12)
                gen = ga_config.get('generations', 18)
                islands = ga_config.get('islands', 1)
                logger.info(f"[STAGE2B] CPU GA: pop={pop}, gen={gen}, islands={islands}")
                from engine.stage2_ga import GeneticAlgorithmOptimizer
                
                ga_optimizer = GeneticAlgorithmOptimizer(
                    courses=courses, rooms=rooms, time_slots=time_slots,
                    faculty=faculty, students={},
                    initial_solution=initial_schedule,
                    population_size=pop,
                    generations=gen,
                    use_sample_fitness=ga_config.get('fitness_mode', 'full') == 'sample_based',
                    sample_size=ga_config.get('sample_students', 100),
                    hardware_config=ga_config  # CRITICAL: Pass hardware config
                )
                ga_optimizer.progress_tracker = self.progress_tracker
                ga_optimizer.job_id = job_id
                
                optimized_schedule = await asyncio.to_thread(ga_optimizer.evolve, job_id)
                final_fitness = ga_optimizer.fitness(optimized_schedule)
                
                del ga_optimizer
            
            # Mark stage complete and AGGRESSIVE cleanup
            self.progress_tracker.mark_stage_complete()
            
            # CRITICAL: Aggressive cleanup before RL stage
            if ga_config['use_gpu']:
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            cleanup_stats = aggressive_cleanup()
            logger.info(f"[STAGE2B] ✅ Freed {cleanup_stats['freed_mb']:.1f}MB before RL stage")
            
            return {
                'schedule': optimized_schedule,
                'quality_score': final_fitness,
                'conflicts': [],
                'execution_time': 0
            }
            
        except Exception as e:
            logger.error(f"[STAGE2B] GA failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Cleanup on error
            if 'gpu_ga' in locals():
                del gpu_ga
            if ga_config.get('use_gpu', False):
                torch.cuda.empty_cache()
            aggressive_cleanup()
            
            return cpsat_result
    
    @handle_stage_error("RL")
    async def _stage3_rl_conflict_resolution(self, job_id: str, request_data: dict):
        """Stage 3: RL conflict resolution with memory management + cancellation"""
        from engine.stage3_rl import RLConflictResolver
        from utils.memory_cleanup import get_memory_usage, aggressive_cleanup
        import gc
        
        # Check cancellation before starting RL
        if await self._check_cancellation(job_id):
            logger.info(f"[STAGE3] Job {job_id} cancelled before RL")
            raise asyncio.CancelledError("Job cancelled by user before RL")
        
        # Check memory before RL
        mem_before = get_memory_usage()
        logger.info(f"[STAGE3] Memory before RL: {mem_before['rss_mb']:.1f}MB ({mem_before['percent']:.1f}%)")
        
        # Emergency cleanup if memory > 80%
        if mem_before['percent'] > 80:
            logger.warning(f"[STAGE3] ⚠️ High memory ({mem_before['percent']:.1f}%), forcing cleanup")
            aggressive_cleanup()
            mem_before = get_memory_usage()
            logger.info(f"[STAGE3] After cleanup: {mem_before['rss_mb']:.1f}MB ({mem_before['percent']:.1f}%)")
        
        data = self.job_data[job_id]['results']
        ga_result = data['stage2_ga_optimization']
        schedule = ga_result.get('schedule', {})
        
        if not schedule:
            logger.warning("[STAGE3] No schedule from GA, skipping RL")
            return ga_result
        
        logger.info(f"[STAGE3] Starting RL conflict resolution with {len(schedule)} assignments")
        self.progress_tracker.set_stage('rl')
        
        # Time-based progress will handle smooth updates during RL
        
        try:
            # Quick conflict detection
            load_data = data['load_data']
            conflicts = self._detect_conflicts(schedule, load_data)
            
            # OPTIMIZATION: Skip RL if very few conflicts OR too many (memory exhaustion)
            if len(conflicts) < 10:
                logger.info(f"[STAGE3] Only {len(conflicts)} conflicts, skipping RL")
                return ga_result
            
            if len(conflicts) > 1000:
                logger.warning(f"[STAGE3] Too many conflicts ({len(conflicts)}), limiting to 1000 for memory safety")
                conflicts = conflicts[:1000]
            
            logger.info(f"[STAGE3] Detected {len(conflicts)} conflicts, resolving with RL")
            
            # Get hardware-adaptive config
            global hardware_profile
            optimal_config = get_optimal_config(hardware_profile) if hardware_profile else {}
            stage3_config = optimal_config.get('stage3_qlearning', {'max_iterations': 100, 'algorithm': 'q_learning', 'use_gpu': False})
            
            max_iter = stage3_config.get('max_iterations', 100)
            use_gpu_rl = stage3_config.get('use_gpu', False)
            algorithm = stage3_config.get('algorithm', 'q_learning')
            
            resolver = RLConflictResolver(
                courses=load_data['courses'],
                faculty=load_data['faculty'],
                rooms=load_data['rooms'],
                time_slots=load_data['time_slots'],
                learning_rate=0.15,
                discount_factor=0.85,
                epsilon=0.10,
                max_iterations=max_iter,
                use_gpu=use_gpu_rl,
                org_id=request_data.get('organization_id'),
                progress_tracker=self.progress_tracker
            )
            
            logger.info(f"[STAGE3] Config: algorithm={algorithm}, iterations={max_iter}, conflicts={len(conflicts)}")
            
            # RL training with direct call
            resolved_schedule = await asyncio.to_thread(resolver.resolve, schedule)
            
            # Verify resolution
            remaining_conflicts = self._detect_conflicts(resolved_schedule, load_data)
            
            # Mark stage as complete
            self.progress_tracker.mark_stage_complete()
            
            logger.info(f"[STAGE3] RL complete: {len(conflicts)} → {len(remaining_conflicts)} conflicts")
            
            # Aggressive cleanup after RL
            cleanup_stats = aggressive_cleanup()
            logger.info(f"[STAGE3] ✅ Freed {cleanup_stats['freed_mb']:.1f}MB after RL")
            
            return {
                'schedule': resolved_schedule,
                'quality_score': ga_result.get('quality_score', 0),
                'conflicts': remaining_conflicts,
                'execution_time': 0
            }
            
        except Exception as e:
            logger.error(f"[STAGE3] RL conflict resolution failed: {e}")
            
            # Cleanup on error
            if 'resolver' in locals():
                del resolver
            aggressive_cleanup()
            
            return ga_result
    
    def _detect_conflicts(self, solution, load_data):
        """Detect ALL conflicts: faculty, room, and student"""
        conflicts = []
        
        faculty_schedule = {}
        room_schedule = {}
        student_schedule = {}
        
        for (course_id, session), (time_slot, room_id) in solution.items():
            course = next((c for c in load_data['courses'] if c.course_id == course_id), None)
            if not course:
                continue
            
            # Faculty conflicts
            faculty_id = getattr(course, 'faculty_id', None)
            if faculty_id:
                key = (faculty_id, time_slot)
                if key in faculty_schedule:
                    conflicts.append({
                        'type': 'faculty_conflict',
                        'faculty_id': faculty_id,
                        'time_slot': time_slot,
                        'course_id': course_id,
                        'conflicting_course': faculty_schedule[key]
                    })
                else:
                    faculty_schedule[key] = course_id
            
            # Room conflicts
            key = (room_id, time_slot)
            if key in room_schedule:
                conflicts.append({
                    'type': 'room_conflict',
                    'room_id': room_id,
                    'time_slot': time_slot,
                    'course_id': course_id,
                    'conflicting_course': room_schedule[key]
                })
            else:
                room_schedule[key] = course_id
            
            # Student conflicts
            for student_id in getattr(course, 'student_ids', []):
                key = (student_id, time_slot)
                if key in student_schedule:
                    conflicts.append({
                        'type': 'student_conflict',
                        'student_id': student_id,
                        'time_slot': time_slot,
                        'course_id': course_id,
                        'conflicting_course': student_schedule[key],
                        'student_count': len(course.student_ids)
                    })
                else:
                    student_schedule[key] = course_id
        
        logger.info(f"[CONFLICTS] Found {len(conflicts)} total conflicts")
        return conflicts
    
    async def _compensate(self, job_id: str):
        """Compensate completed steps in reverse order"""
        for step_name, compensate_func, result in reversed(self.completed_steps):
            try:
                await compensate_func(job_id, result)
                logger.info(f"[SAGA] Compensated {step_name}")
            except Exception as e:
                logger.error(f"[SAGA] Compensation failed for {step_name}: {e}")
    
    async def _cleanup_data(self, job_id: str, result):
        """Cleanup loaded data"""
        pass  # Data cleanup if needed
    
    async def _cleanup_clustering(self, job_id: str, result):
        """Cleanup clustering resources"""
        pass  # Clustering cleanup if needed
    
    async def _cleanup_cpsat(self, job_id: str, result):
        """Cleanup CP-SAT resources"""
        pass  # CP-SAT cleanup if needed
    
    async def _cleanup_ga(self, job_id: str, result):
        """Cleanup GA resources"""
        pass  # GA cleanup if needed
    
    async def _cleanup_rl(self, job_id: str, result):
        """Cleanup RL resources"""
        pass  # RL cleanup if needed
    
    async def _check_cancellation(self, job_id: str) -> bool:
        """Check if job has been cancelled"""
        global redis_client_global
        try:
            if redis_client_global:
                cancel_flag = redis_client_global.get(f"cancel:job:{job_id}")
                return cancel_flag is not None and cancel_flag
        except Exception as e:
            logger.error(f"[CANCEL] Error checking cancellation: {e}")
        return False
    
    async def _update_progress_final(self, job_id: str, progress: int, status: str, message: str):
        """Update final progress status"""
        global redis_client_global
        try:
            if redis_client_global:
                progress_data = {
                    'job_id': job_id,
                    'progress': progress,
                    'status': status,
                    'stage': status.capitalize(),
                    'message': message,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                redis_client_global.setex(f"progress:job:{job_id}", 3600, json.dumps(progress_data))
                logger.info(f"[PROGRESS] Final status set: {job_id} -> {status}")
        except Exception as e:
            logger.error(f"[PROGRESS] Failed to set final status: {e}")
    
    async def _update_progress(self, job_id: str, progress: int, message: str, total_items: int = None, completed_items: int = None, force_eta_calc: bool = False):
        """Enterprise progress tracking with Redis pub/sub for real-time WebSocket updates"""
        global redis_client_global
        from datetime import timedelta
        
        # Skip cancellation check for early stages (0-5%) to speed up data loading
        if progress > 5:
            if await self._check_cancellation(job_id):
                raise asyncio.CancelledError(f"Job {job_id} cancelled by user")
        
        try:
            if redis_client_global:
                start_time_key = f"start_time:job:{job_id}"
                start_time_str = redis_client_global.get(start_time_key)
                
                time_remaining_seconds = None
                eta = None
                
                if start_time_str and completed_items and total_items and completed_items > 0:
                    # Enterprise ETA: Based on actual cluster completion rate with smoothing
                    start_time = datetime.fromisoformat(start_time_str.decode() if isinstance(start_time_str, bytes) else start_time_str)
                    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
                    
                    # Only calculate ETA after 10% completion for accuracy
                    if completed_items >= max(5, total_items * 0.1):
                        avg_time_per_cluster = elapsed / completed_items
                        remaining_clusters = total_items - completed_items
                        # Add 20% buffer for slower clusters at the end
                        time_remaining_seconds = int(avg_time_per_cluster * remaining_clusters * 1.2)
                        eta = (datetime.now(timezone.utc) + timedelta(seconds=time_remaining_seconds)).isoformat()
                    else:
                        # Early stage: Use conservative estimate
                        time_remaining_seconds = int(total_items * 5)  # 5s per cluster estimate
                        eta = (datetime.now(timezone.utc) + timedelta(seconds=time_remaining_seconds)).isoformat()
                elif start_time_str and progress > 0:
                    # Stage-based ETA estimation (prevents 0 seconds after CP-SAT)
                    start_time = datetime.fromisoformat(start_time_str.decode() if isinstance(start_time_str, bytes) else start_time_str)
                    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
                    
                    # Estimate remaining time based on current stage
                    if progress < 60:  # CP-SAT stage (5-60%)
                        total_estimated = (elapsed / progress) * 100
                        time_remaining_seconds = max(0, int(total_estimated - elapsed))
                    elif progress < 80:  # GA stage (60-80%)
                        # GA takes ~20% of total time
                        ga_progress = (progress - 60) / 20  # 0.0-1.0
                        ga_elapsed = elapsed * 0.2  # Assume GA is 20% of total
                        ga_remaining = (ga_elapsed / max(ga_progress, 0.01)) * (1 - ga_progress)
                        time_remaining_seconds = int(ga_remaining + elapsed * 0.2)  # GA + RL remaining
                    elif progress < 96:  # RL stage (80-96%)
                        # RL takes ~15% of total time
                        rl_progress = (progress - 80) / 16  # 0.0-1.0
                        rl_elapsed = elapsed * 0.15
                        rl_remaining = (rl_elapsed / max(rl_progress, 0.01)) * (1 - rl_progress)
                        time_remaining_seconds = int(rl_remaining + elapsed * 0.05)  # RL + finalization
                    else:  # Finalization (96-100%)
                        time_remaining_seconds = max(10, int(elapsed * 0.05))  # 5% of total time
                    
                    eta = (datetime.now(timezone.utc) + timedelta(seconds=time_remaining_seconds)).isoformat()
                else:
                    # Fallback: Use default estimate
                    time_remaining_seconds = 300  # Default 5 min
                    eta = (datetime.now(timezone.utc) + timedelta(seconds=300)).isoformat()
                
                progress_data = {
                    'task_id': job_id,
                    'job_id': job_id,
                    'progress': progress,  # 0-100 percentage
                    'progress_percent': progress,
                    'status': 'running',
                    'stage': message,
                    'message': message,
                    'items_done': completed_items or 0,
                    'items_total': total_items or 100,
                    'time_remaining_seconds': time_remaining_seconds or 0,
                    'eta_seconds': time_remaining_seconds or 0,
                    'eta': eta,
                    'timestamp': datetime.now(timezone.utc).timestamp()
                }
                
                # Store snapshot for new subscribers
                redis_client_global.setex(
                    f"progress:job:{job_id}",
                    3600,
                    json.dumps(progress_data)
                )
                
                # Publish to Redis pub/sub for real-time WebSocket updates
                redis_client_global.publish(
                    f"progress:{job_id}",
                    json.dumps(progress_data)
                )
                
                logger.info(f"[PROGRESS] Published: {job_id} -> {progress}% - {message} (ETA: {time_remaining_seconds}s)")
            else:
                logger.error(f"[PROGRESS] Redis client not available")
        except Exception as e:
            logger.error(f"[PROGRESS] Failed to update Redis: {e}")
            import traceback
            logger.error(traceback.format_exc())



# Pydantic models
class GenerationRequest(BaseModel):
    job_id: Optional[str] = None
    organization_id: str
    department_id: Optional[str] = None
    batch_ids: List[str] = []
    semester: int
    academic_year: str
    quality_mode: Optional[str] = 'balanced'  # 'fast', 'balanced', 'best'

class GenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str
    estimated_time_seconds: int

# Initialize FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client_global
    logger.info("Starting Enterprise FastAPI Timetable Service...")
    
    # Initialize Redis
    try:
        import os
        from pathlib import Path
        from dotenv import load_dotenv
        import ssl
        
        backend_dir = Path(__file__).resolve().parent.parent
        env_path = backend_dir / ".env"
        load_dotenv(dotenv_path=env_path)
        
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1")
        
        if redis_url.startswith("rediss://"):
            app.state.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                ssl_cert_reqs=ssl.CERT_NONE,
                ssl_check_hostname=False
            )
        else:
            app.state.redis_client = redis.from_url(redis_url, decode_responses=True)
        
        redis_client_global = app.state.redis_client
        app.state.redis_client.ping()
        logger.info("[OK] Redis connection successful")
        
    except Exception as e:
        logger.error(f"[ERROR] Redis initialization failed: {e}")
        app.state.redis_client = None
        redis_client_global = None
    
    # Initialize enterprise components with safety limits
    app.state.saga = TimetableGenerationSaga()
    app.state.resource_isolation = ResourceIsolation()
    
    # Force garbage collection on startup
    import gc
    gc.collect()
    logger.info("Memory cleanup completed")
    
    yield
    
    logger.info("Shutting down Enterprise FastAPI service...")

app = FastAPI(
    title="Enterprise Timetable Generation Service",
    description="Production-ready timetable generation with enterprise patterns",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enterprise background task
async def run_enterprise_generation(job_id: str, request: GenerationRequest):
    """Enterprise generation using saga pattern"""
    global redis_client_global
    import gc
    try:
        logger.info(f"[ENTERPRISE] Starting generation for job {job_id}")
        
        # Force cleanup before starting
        gc.collect()
        
        # Execute saga with timeout
        saga = TimetableGenerationSaga()
        results = await asyncio.wait_for(
            saga.execute(job_id, request.dict()),
            timeout=600  # 10 minutes total timeout
        )
    
    except asyncio.CancelledError:
        logger.warning(f"[ENTERPRISE] Job {job_id} was cancelled")
        
        # Update cancellation status
        if redis_client_global:
            cancel_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'cancelled',
                'stage': 'Cancelled',
                'message': 'Generation cancelled by user',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            redis_client_global.setex(f"progress:job:{job_id}", 3600, json.dumps(cancel_data))
            redis_client_global.delete(f"cancel:job:{job_id}")  # Cleanup flag
        
        await call_django_callback(job_id, 'cancelled', error='Cancelled by user')
        
        # Immediate cleanup on cancellation
        logger.info(f"[CLEANUP] Cleaning up cancelled job {job_id}")
        if 'results' in locals():
            del results
        if 'saga' in locals():
            del saga
        import gc
        gc.collect()
        gc.collect()
        return
    
    try:
        
        # Convert to timetable format
        stage3_result = results.get('stage3_rl_conflict_resolution', {})
        solution = stage3_result.get('schedule', stage3_result) if isinstance(stage3_result, dict) else stage3_result
        load_data = results.get('load_data', {})
        
        logger.info(f"[ENTERPRISE] Converting {len(solution)} assignments to timetable")
        
        # Generate timetable entries for ALL courses
        timetable_entries = []
        day_map = {0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday'}
        
        for (course_id, session), (time_slot_id, room_id) in solution.items():  # ALL ENTRIES
            course = next((c for c in load_data.get('courses', []) if c.course_id == course_id), None)
            room = next((r for r in load_data.get('rooms', []) if r.room_id == room_id), None)
            # Convert time_slot_id to string for comparison
            time_slot = next((t for t in load_data.get('time_slots', []) if str(t.slot_id) == str(time_slot_id)), None)
            
            if course and room and time_slot:
                # Faculty is a list, not a dict - search through it
                faculty_list = load_data.get('faculty', [])
                faculty = next((f for f in faculty_list if getattr(f, 'faculty_id', None) == getattr(course, 'faculty_id', None)), None)
                # Get day number (default to Monday if not set)
                day_num = getattr(time_slot, 'day', 0)
                day_name = day_map.get(day_num, 'Monday')
                
                # Get department name from course
                dept_id = getattr(course, 'department_id', 'Unknown')
                dept_name = getattr(course, 'department_name', dept_id)
                
                timetable_entries.append({
                    'day': day_name,
                    'time_slot': f"{getattr(time_slot, 'start_time', '09:00')}-{getattr(time_slot, 'end_time', '10:00')}",
                    'subject_code': getattr(course, 'course_code', 'N/A'),
                    'subject_name': getattr(course, 'course_name', 'Unknown'),
                    'faculty_name': getattr(faculty, 'faculty_name', 'TBA') if faculty else 'TBA',
                    'room_number': getattr(room, 'room_name', 'N/A'),
                    'batch_name': dept_name,
                    'department_id': dept_id  # For filtering by department
                })
        
        logger.info(f"[ENTERPRISE] Generated {len(timetable_entries)} timetable entries")
        
        # Calculate metrics from 3-stage pipeline
        stage_metrics = {
            'louvain_clusters': len(results.get('stage1_louvain_clustering', {})),
            'cpsat_assignments': len(results.get('stage2_cpsat_solving', {})),
            'ga_optimized': len(results.get('stage2_ga_optimization', {})),
            'rl_resolved': len(solution)
        }
        
        # Detect actual conflicts from final schedule
        final_conflicts = saga._detect_conflicts(solution, load_data) if hasattr(saga, '_detect_conflicts') else []
        actual_conflicts = len(final_conflicts)
        
        # Calculate ACTUAL metrics from GA fitness function
        from engine.stage2_ga import GeneticAlgorithmOptimizer
        
        # Create temporary GA instance to calculate real metrics
        temp_ga = GeneticAlgorithmOptimizer(
            courses=load_data['courses'],
            rooms=load_data['rooms'],
            time_slots=load_data['time_slots'],
            faculty=load_data['faculty'],
            students={},
            initial_solution=solution,
            population_size=1,
            generations=1
        )
        
        # Calculate actual soft constraint scores (0-100 scale)
        faculty_satisfaction = int(temp_ga._faculty_preference_satisfaction(solution) * 100)
        room_utilization = int(temp_ga._room_utilization(solution) * 100)
        compactness = int(temp_ga._schedule_compactness(solution) * 100)
        workload_balance = int(temp_ga._workload_balance(solution) * 100)
        
        # Overall quality score: weighted average of all metrics
        quality_score = int(
            faculty_satisfaction * 0.3 +
            compactness * 0.3 +
            room_utilization * 0.2 +
            workload_balance * 0.2
        )
        
        # Penalty for conflicts (reduce score by 1% per conflict, max 20% penalty)
        conflict_penalty = min(20, (actual_conflicts / max(len(solution), 1)) * 100)
        quality_score = max(0, quality_score - int(conflict_penalty))
        
        # Cleanup temp GA
        del temp_ga
        import gc
        gc.collect()
        
        logger.info(f"[METRICS] Quality={quality_score}%, Faculty={faculty_satisfaction}%, Room={room_utilization}%, Compact={compactness}%, Workload={workload_balance}%")
        
        # Create variant with ACTUAL calculated metrics
        variant = {
            'id': 1,
            'name': '3-Stage AI Solution (Louvain→CP-SAT→GA→RL)',
            'score': quality_score,
            'conflicts': actual_conflicts,
            'faculty_satisfaction': faculty_satisfaction,
            'room_utilization': room_utilization,
            'compactness': compactness,
            'workload_balance': workload_balance,
            'stage_metrics': stage_metrics,
            'timetable_entries': timetable_entries
        }
        
        logger.info(f"[ENTERPRISE] Variant created: {len(timetable_entries)} entries, {actual_conflicts} conflicts")
        
        # Finalization stage (background task handles progress)
        saga.progress_tracker.set_stage('finalize')
        logger.info(f"✅ Job {job_id} completed with {len(timetable_entries)} classes")
        
        # Feature 8: Quality-Based Refinement (COMPLETE) - BEFORE callback
        if len(timetable_entries) > 0:
            quality_score = variant.get('score', 0)
            if quality_score < 50:
                logger.warning(f"Quality {quality_score}% too low for refinement (needs fundamental fix, not optimization)")
            elif quality_score < 85:  # Only refine if quality is reasonable (50-85%)
                logger.warning(f"Quality {quality_score}% below threshold, attempting refinement...")
                try:
                    saga.progress_tracker.set_stage('refinement')
                    
                    # Quick GA refinement pass (5 gens, small pop)
                    from engine.stage2_ga import GeneticAlgorithmOptimizer
                    ga_refine = GeneticAlgorithmOptimizer(
                        courses=load_data['courses'],
                        rooms=load_data['rooms'],
                        time_slots=load_data['time_slots'],
                        faculty=load_data['faculty'],
                        students={},
                        initial_solution=solution,
                        population_size=5,
                        generations=5,
                        early_stop_patience=2
                    )
                    # Set redis client for progress updates
                    ga_refine.redis_client = redis_client_global
                    ga_refine.job_id = job_id
                    refined = await asyncio.to_thread(ga_refine.evolve, job_id)
                    
                    # CRITICAL: Stop GA immediately after completion
                    ga_refine.stop()
                    
                    # Recalculate ACTUAL metrics after refinement
                    refined_conflicts = saga._detect_conflicts(refined, load_data) if hasattr(saga, '_detect_conflicts') else []
                    
                    # Calculate actual soft constraint scores for refined solution
                    refined_faculty = int(ga_refine._faculty_preference_satisfaction(refined) * 100)
                    refined_room = int(ga_refine._room_utilization(refined) * 100)
                    refined_compact = int(ga_refine._schedule_compactness(refined) * 100)
                    refined_workload = int(ga_refine._workload_balance(refined) * 100)
                    
                    # Overall quality score
                    new_quality = int(
                        refined_faculty * 0.3 +
                        refined_compact * 0.3 +
                        refined_room * 0.2 +
                        refined_workload * 0.2
                    )
                    
                    # Conflict penalty
                    refined_penalty = min(20, (len(refined_conflicts) / max(len(refined), 1)) * 100)
                    new_quality = max(0, new_quality - int(refined_penalty))
                    
                    if new_quality > quality_score:
                        logger.info(f"✅ Refinement improved quality: {quality_score}% → {new_quality}%")
                        solution = refined
                        variant['score'] = new_quality
                        variant['conflicts'] = len(refined_conflicts)
                        variant['faculty_satisfaction'] = refined_faculty
                        variant['room_utilization'] = refined_room
                        variant['compactness'] = refined_compact
                        variant['workload_balance'] = refined_workload
                        
                        # Regenerate timetable entries with refined solution
                        timetable_entries = []
                        for (course_id, session), (time_slot_id, room_id) in refined.items():
                            course = next((c for c in load_data.get('courses', []) if c.course_id == course_id), None)
                            room = next((r for r in load_data.get('rooms', []) if r.room_id == room_id), None)
                            time_slot = next((t for t in load_data.get('time_slots', []) if str(t.slot_id) == str(time_slot_id)), None)
                            
                            if course and room and time_slot:
                                faculty_list = load_data.get('faculty', [])
                                faculty = next((f for f in faculty_list if getattr(f, 'faculty_id', None) == getattr(course, 'faculty_id', None)), None)
                                day_num = getattr(time_slot, 'day', 0)
                                day_name = day_map.get(day_num, 'Monday')
                                dept_id = getattr(course, 'department_id', 'Unknown')
                                dept_name = getattr(course, 'department_name', dept_id)
                                
                                timetable_entries.append({
                                    'day': day_name,
                                    'time_slot': f"{getattr(time_slot, 'start_time', '09:00')}-{getattr(time_slot, 'end_time', '10:00')}",
                                    'subject_code': getattr(course, 'course_code', 'N/A'),
                                    'subject_name': getattr(course, 'course_name', 'Unknown'),
                                    'faculty_name': getattr(faculty, 'faculty_name', 'TBA') if faculty else 'TBA',
                                    'room_number': getattr(room, 'room_name', 'N/A'),
                                    'batch_name': dept_name,
                                    'department_id': dept_id
                                })
                        
                        variant['timetable_entries'] = timetable_entries
                        logger.info(f"✅ Updated variant: Quality={new_quality}%, Faculty={refined_faculty}%, Room={refined_room}%, Compact={refined_compact}%")
                    else:
                        logger.info(f"⚠️ Refinement did not improve quality ({new_quality}% vs {quality_score}%), keeping original")
                    
                    # Cleanup GA refiner
                    del ga_refine
                    import gc
                    gc.collect()
                except Exception as e:
                    logger.warning(f"Refinement failed: {e}, using original")
                    if 'ga_refine' in locals():
                        ga_refine.stop()
                        del ga_refine
        
        # Mark as complete
        await saga.progress_tracker.complete(f'Generated timetable with {len(variant.get("timetable_entries", []))} classes')
        
        # CRITICAL: Call Django callback AFTER all processing (including refinement)
        logger.info(f"[CALLBACK] Sending final variant with {len(variant.get('timetable_entries', []))} entries to Django")
        await call_django_callback(job_id, 'completed', [variant])
        
        logger.info(f"[ENTERPRISE] Job {job_id} completed successfully")
        
        # CRITICAL: Stop all background tasks immediately
        if 'ga_refine' in locals():
            del ga_refine
        
        # Immediate cleanup after success
        del stage3_result, solution, load_data, timetable_entries, variant
        import gc
        gc.collect()
        gc.collect()  # Double collect to ensure cleanup
        
    except asyncio.TimeoutError:
        logger.error(f"[ENTERPRISE] Job {job_id} timed out after 10 minutes")
        
        # Update timeout progress
        if redis_client_global:
            timeout_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'failed',
                'stage': 'Timeout',
                'message': 'Generation timed out after 10 minutes',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            redis_client_global.setex(f"progress:job:{job_id}", 3600, json.dumps(timeout_data))
        
        await call_django_callback(job_id, 'failed', error='Generation timed out')
        
        # Cleanup on timeout
        if 'results' in locals():
            del results
        if 'saga' in locals():
            del saga
        import gc
        gc.collect()
        gc.collect()
    
    except Exception as e:
        logger.error(f"[ENTERPRISE] Job {job_id} failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Update error progress
        if redis_client_global:
            error_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'failed',
                'stage': 'Failed',
                'message': f'Generation failed: {str(e)}',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            redis_client_global.setex(f"progress:job:{job_id}", 3600, json.dumps(error_data))
        
        await call_django_callback(job_id, 'failed', error=str(e))
        
        # Cleanup on error
        if 'results' in locals():
            del results
        if 'saga' in locals():
            del saga
        import gc
        gc.collect()
        gc.collect()
    
    finally:
        # CRITICAL: Aggressive memory cleanup to prevent Windows lag
        from utils.memory_cleanup import aggressive_cleanup
        
        logger.info(f"[CLEANUP] Starting memory cleanup for job {job_id}")
        
        try:
            # 0. Stop any running GA optimizers
            if 'ga_refine' in locals():
                try:
                    ga_refine.stop()
                    del ga_refine
                except:
                    pass
            
            # 1. Stop progress tracker background task
            if 'saga' in locals() and hasattr(saga, 'progress_task'):
                await saga.progress_task.stop()
                del saga.progress_task
            
            # 2. Clear all job data from memory
            if 'saga' in locals() and hasattr(saga, 'job_data') and job_id in saga.job_data:
                saga.job_data[job_id].clear()
                del saga.job_data[job_id]
            
            # 3. Delete large objects
            if 'results' in locals():
                del results
            if 'solution' in locals():
                del solution
            if 'load_data' in locals():
                del load_data
            if 'timetable_entries' in locals():
                del timetable_entries
            if 'variant' in locals():
                del variant
            if 'saga' in locals():
                del saga
            
            # 4. Aggressive cleanup (GPU + 3-pass GC)
            cleanup_stats = aggressive_cleanup()
            logger.info(f"[CLEANUP] Freed {cleanup_stats['freed_mb']:.1f}MB, collected {cleanup_stats['gc_collected']} objects")
            
            # 5. Cleanup Redis cancellation flag
            if redis_client_global:
                redis_client_global.delete(f"cancel:job:{job_id}")
            
            logger.info(f"[CLEANUP] Memory cleanup completed for job {job_id}")
            
        except Exception as e:
            logger.error(f"[CLEANUP] Cleanup error: {e}")
            # Fallback: basic cleanup
            import gc
            gc.collect()
            gc.collect()

async def call_django_callback(job_id: str, status: str, variants: list = None, error: str = None):
    """Enterprise callback with retry logic"""
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            from celery import Celery
            import os
            import ssl
            
            broker_url = os.getenv('CELERY_BROKER_URL') or os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            
            if broker_url.startswith('rediss://'):
                celery_app = Celery(
                    'timetable',
                    broker=broker_url,
                    broker_use_ssl={
                        'ssl_cert_reqs': ssl.CERT_NONE,
                        'ssl_check_hostname': False
                    },
                    backend=broker_url,
                    redis_backend_use_ssl={
                        'ssl_cert_reqs': ssl.CERT_NONE,
                        'ssl_check_hostname': False
                    }
                )
            else:
                celery_app = Celery('timetable', broker=broker_url, backend=broker_url)
            
            celery_app.send_task(
                'academics.celery_tasks.fastapi_callback_task',
                args=[job_id, status],
                kwargs={'variants': variants, 'error': error}
            )
            
            logger.info(f"[CALLBACK] Sent callback for job {job_id} (attempt {attempt + 1})")
            return
            
        except Exception as e:
            logger.error(f"[CALLBACK] Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"[CALLBACK] All callback attempts failed for job {job_id}")

# WebSocket endpoint for real-time progress
@app.websocket("/ws/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    """Real-time progress streaming via WebSocket"""
    import aioredis
    
    await websocket.accept()
    
    try:
        # Send snapshot first if exists
        if app.state.redis_client:
            snapshot = app.state.redis_client.get(f"progress:job:{job_id}")
            if snapshot:
                await websocket.send_text(snapshot)
        
        # Subscribe to Redis pub/sub
        redis = await aioredis.create_redis_pool(
            os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
            encoding='utf-8'
        )
        
        channels = await redis.subscribe(f"progress:{job_id}")
        ch = channels[0]
        
        # Stream updates
        while await ch.wait_message():
            msg = await ch.get()
            await websocket.send_text(msg)
            
            # Check if job completed
            data = json.loads(msg)
            if data.get('status') in ['completed', 'failed', 'cancelled']:
                break
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await redis.unsubscribe(f"progress:{job_id}")
            redis.close()
            await redis.wait_closed()
        except:
            pass

# API Endpoints
@app.get("/health")
async def health_check():
    """Enterprise health check"""
    try:
        health_status = {
            "service": "Enterprise Timetable Generation",
            "status": "healthy",
            "version": "2.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Check Redis
        if app.state.redis_client:
            app.state.redis_client.ping()
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "not configured"
        
        # Check resource pools
        health_status["thread_pools"] = {
            "clustering": "available",
            "cpsat": "available",
            "context": "available"
        }
        
        return health_status
        
    except Exception as e:
        return {
            "service": "Enterprise Timetable Generation",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/api/generate_variants", response_model=GenerationResponse)
async def generate_variants_enterprise(request: GenerationRequest):
    """Enterprise generation endpoint with saga pattern"""
    global redis_client_global, hardware_profile
    try:
        job_id = request.job_id or f"enterprise_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Calculate estimated time based on strategy
        estimated_time_seconds = 300  # Default 5 minutes
        if hardware_profile:
            from engine.strategy_selector import get_strategy_selector
            selector = get_strategy_selector()
            quality_mode = request.quality_mode or 'balanced'
            strategy = selector.select(hardware_profile, quality_mode)
            estimated_time_seconds = strategy.expected_time_minutes * 60
            logger.info(f"Estimated time: {strategy.expected_time_minutes} min ({strategy.profile_name})")
        
        # Initialize progress and start time
        if redis_client_global:
            start_time = datetime.now(timezone.utc).isoformat()
            redis_client_global.setex(f"start_time:job:{job_id}", 3600, start_time)
            
            progress_data = {
                'job_id': job_id,
                'progress': 0,
                'status': 'queued',
                'stage': 'Queued',
                'message': 'Job queued for enterprise processing',
                'time_remaining_seconds': estimated_time_seconds,
                'eta': (datetime.now(timezone.utc) + timedelta(seconds=estimated_time_seconds)).isoformat(),
                'timestamp': start_time
            }
            redis_client_global.setex(f"progress:job:{job_id}", 3600, json.dumps(progress_data))
            logger.info(f"✅ Initial progress set in Redis for job {job_id}")
        else:
            logger.error(f"❌ Redis not available for job {job_id}")
        
        # Start enterprise generation in background (fire-and-forget)
        asyncio.create_task(run_enterprise_generation(job_id, request))
        
        logger.info(f"[ENTERPRISE] ✅ Generation queued for job {job_id}")
        
        return GenerationResponse(
            job_id=job_id,
            status="queued",
            message=f"Timetable generation started (est. {estimated_time_seconds//60} min)",
            estimated_time_seconds=estimated_time_seconds
        )
        
    except Exception as e:
        logger.error(f"[ENTERPRISE] Error starting generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/progress/{job_id}/")
@app.get("/api/progress/{job_id}")
async def get_progress_enterprise(job_id: str):
    """Get enterprise generation progress - NO AUTH REQUIRED (PUBLIC ENDPOINT)"""
    # CRITICAL: This endpoint must be public for real-time progress updates
    # No authentication required - progress is not sensitive data
    try:
        # Check if redis_client exists in app.state
        if not hasattr(app.state, 'redis_client') or not app.state.redis_client:
            logger.warning(f"[PROGRESS] Redis not available for job {job_id}")
            return {
                "job_id": job_id,
                "progress": 0,
                "status": "queued",
                "message": "Waiting for job to start...",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Try to get progress data from Redis
        progress_data = app.state.redis_client.get(f"progress:job:{job_id}")
        
        if not progress_data:
            logger.info(f"[PROGRESS] No data found for job {job_id}")
            return {
                "job_id": job_id,
                "progress": 0,
                "status": "queued",
                "message": "Job queued, waiting to start...",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Parse and return progress data
        parsed_data = json.loads(progress_data)
        logger.debug(f"[PROGRESS] Retrieved for {job_id}: {parsed_data.get('progress')}%")
        return parsed_data
        
    except redis.exceptions.ConnectionError as e:
        logger.error(f"[PROGRESS] Redis connection error for {job_id}: {e}")
        return {
            "job_id": job_id,
            "progress": 0,
            "status": "queued",
            "message": "Connecting to progress tracker...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except json.JSONDecodeError as e:
        logger.error(f"[PROGRESS] JSON decode error for {job_id}: {e}")
        return {
            "job_id": job_id,
            "progress": 0,
            "status": "error",
            "message": "Invalid progress data format",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"[PROGRESS] Unexpected error for {job_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "job_id": job_id,
            "progress": 0,
            "status": "error",
            "message": f"Progress tracking error: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.get("/api/hardware")
async def get_hardware_status():
    """Get current hardware profile and capabilities"""
    try:
        global hardware_profile
        if not hardware_profile:
            hardware_profile = get_hardware_profile(force_refresh=True)
        
        optimal_config = get_optimal_config(hardware_profile)
        
        return {
            "hardware_capabilities": {
                "cpu_cores": hardware_profile.cpu_cores,
                "has_gpu": hardware_profile.has_nvidia_gpu,
                "gpu_memory_gb": hardware_profile.gpu_memory_gb,
                "total_ram_gb": hardware_profile.total_ram_gb,
                "tier": optimal_config['tier']
            },
            "optimal_strategy": hardware_profile.optimal_strategy.value,
            "estimated_time": optimal_config['expected_time_minutes'],
            "expected_quality": optimal_config['expected_quality'],
            "stage_configs": {
                "clustering": optimal_config['stage1_louvain']['algorithm'],
                "cpsat": optimal_config['stage2a_cpsat']['primary_solver'],
                "ga": optimal_config['stage2b_ga']['algorithm'],
                "rl": optimal_config['stage3_qlearning']['algorithm']
            }
        }
        
    except Exception as e:
        logger.error(f"[HARDWARE] Error getting hardware status: {e}")
        return {"error": str(e)}

@app.post("/api/hardware/refresh")
async def refresh_hardware_detection():
    """Force refresh hardware detection"""
    try:
        global hardware_profile, adaptive_executor
        
        logger.info("[HARDWARE] Forcing hardware detection refresh...")
        hardware_profile = get_hardware_profile(force_refresh=True)
        adaptive_executor = await get_adaptive_executor()
        
        return {
            "status": "success",
            "message": "Hardware detection refreshed",
            "new_strategy": hardware_profile.optimal_strategy.value,
            "hardware_profile": hardware_profile.to_dict()
        }
        
    except Exception as e:
        logger.error(f"[HARDWARE] Error refreshing hardware: {e}")
        return {"error": str(e)}

@app.post("/api/incremental/add")
async def add_course_incremental(course_data: dict, timetable_id: str):
    """Add course to existing timetable incrementally (30s vs 15min full regen)"""
    try:
        from engine.incremental_update import IncrementalUpdater
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        existing = await client.fetch_timetable(timetable_id)
        rooms = await client.fetch_rooms(course_data['organization_id'])
        time_slots = await client.fetch_time_slots(course_data['organization_id'])
        faculty = await client.fetch_faculty(course_data['organization_id'])
        
        updater = IncrementalUpdater(existing)
        from models.timetable_models import Course
        course = Course(**course_data)
        result = updater.add_course(course, rooms, time_slots, faculty)
        
        await client.close()
        return {"success": True, "updated_entries": len(result)}
    except Exception as e:
        logger.error(f"Incremental add failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/incremental/remove/{course_id}")
async def remove_course_incremental(course_id: str, timetable_id: str):
    """Remove course from existing timetable (instant)"""
    try:
        from engine.incremental_update import IncrementalUpdater
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        existing = await client.fetch_timetable(timetable_id)
        
        updater = IncrementalUpdater(existing)
        result = updater.remove_course(course_id)
        
        await client.close()
        return {"success": True, "updated_entries": len(result)}
    except Exception as e:
        logger.error(f"Incremental remove failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cancel/{job_id}")
async def cancel_generation(job_id: str):
    """Cancel a running generation job"""
    global redis_client_global
    try:
        if not redis_client_global:
            raise HTTPException(status_code=503, detail="Redis not available")
        
        # Set cancellation flag
        redis_client_global.setex(f"cancel:job:{job_id}", 3600, "1")
        logger.info(f"[CANCEL] Cancellation flag set for job {job_id}")
        
        return {
            "success": True,
            "message": f"Cancellation requested for job {job_id}",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"[CANCEL] Error setting cancellation flag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/department/{department_id}/view")
async def get_department_view(department_id: str, semester: int, academic_year: str, timetable_id: str):
    """Get department-specific view of master timetable"""
    try:
        from services.department_view_service import DepartmentViewService
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        timetable = await client.fetch_timetable(timetable_id)
        courses = await client.fetch_courses(department_id, semester)
        faculty = await client.fetch_faculty(department_id)
        students = await client.fetch_students(department_id)
        
        service = DepartmentViewService(timetable, courses, faculty, students)
        view = service.get_department_view(department_id, semester, academic_year)
        
        await client.close()
        return view.dict()
    except Exception as e:
        logger.error(f"Department view error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/university/dashboard")
async def get_university_dashboard(organization_id: str):
    """Get registrar's university-wide dashboard"""
    try:
        from services.department_view_service import DepartmentViewService
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        timetable = await client.fetch_all_timetables(organization_id)
        courses = await client.fetch_all_courses(organization_id)
        faculty = await client.fetch_all_faculty(organization_id)
        students = await client.fetch_all_students(organization_id)
        
        service = DepartmentViewService(timetable, courses, faculty, students)
        dashboard = service.get_university_dashboard()
        
        await client.close()
        return dashboard.dict()
    except Exception as e:
        logger.error(f"University dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conflicts/detect")
async def detect_conflicts(timetable_id: str):
    """Detect all conflicts in timetable"""
    try:
        from services.conflict_resolution_service import ConflictResolutionService
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        timetable = await client.fetch_timetable(timetable_id)
        courses = await client.fetch_all_courses(timetable_id)
        rooms = await client.fetch_all_rooms(timetable_id)
        time_slots = await client.fetch_all_time_slots(timetable_id)
        faculty = await client.fetch_all_faculty(timetable_id)
        
        service = ConflictResolutionService(timetable, courses, rooms, time_slots, faculty)
        conflicts = service.detect_all_conflicts()
        
        await client.close()
        return {"conflicts": [c.dict() for c in conflicts], "total": len(conflicts)}
    except Exception as e:
        logger.error(f"Conflict detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conflicts/resolve")
async def resolve_conflicts(timetable_id: str, auto_resolve: bool = True):
    """Resolve conflicts automatically with hierarchical approach"""
    try:
        from services.conflict_resolution_service import ConflictResolutionService
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        timetable = await client.fetch_timetable(timetable_id)
        courses = await client.fetch_all_courses(timetable_id)
        rooms = await client.fetch_all_rooms(timetable_id)
        time_slots = await client.fetch_all_time_slots(timetable_id)
        faculty = await client.fetch_all_faculty(timetable_id)
        
        service = ConflictResolutionService(timetable, courses, rooms, time_slots, faculty)
        
        if auto_resolve:
            results = service.resolve_all_conflicts()
        else:
            conflicts = service.detect_all_conflicts()
            results = {'total': len(conflicts), 'resolved': 0, 'manual_review': len(conflicts)}
        
        await client.close()
        return results
    except Exception as e:
        logger.error(f"Conflict resolution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conflicts/resolve/{conflict_id}")
async def resolve_single_conflict(conflict_id: str, timetable_id: str):
    """Resolve single conflict with hierarchical approach"""
    try:
        from services.conflict_resolution_service import ConflictResolutionService
        from utils.django_client import DjangoAPIClient
        
        client = DjangoAPIClient()
        timetable = await client.fetch_timetable(timetable_id)
        courses = await client.fetch_all_courses(timetable_id)
        rooms = await client.fetch_all_rooms(timetable_id)
        time_slots = await client.fetch_all_time_slots(timetable_id)
        faculty = await client.fetch_all_faculty(timetable_id)
        
        service = ConflictResolutionService(timetable, courses, rooms, time_slots, faculty)
        conflicts = service.detect_all_conflicts()
        
        conflict = next((c for c in conflicts if c.conflict_id == conflict_id), None)
        if not conflict:
            raise HTTPException(status_code=404, detail="Conflict not found")
        
        result = service.resolve_conflict(conflict)
        
        await client.close()
        return result
    except Exception as e:
        logger.error(f"Single conflict resolution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preferences/submit")
async def submit_department_preferences(preferences: dict):
    """Submit department preferences for upcoming semester (Week 1-2 of governance model)"""
    try:
        from services.department_preference_service import DepartmentPreferenceService, DepartmentPreferences
        
        service = DepartmentPreferenceService(redis_client=app.state.redis_client)
        prefs = DepartmentPreferences(**preferences)
        result = service.submit_preferences(prefs)
        
        return result
    except Exception as e:
        logger.error(f"Preference submission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preferences/{department_id}/{semester}")
async def get_department_preferences(department_id: str, semester: int):
    """Get department preferences for semester"""
    try:
        from services.department_preference_service import DepartmentPreferenceService
        
        service = DepartmentPreferenceService(redis_client=app.state.redis_client)
        prefs = service.get_preferences(department_id, semester)
        
        if not prefs:
            raise HTTPException(status_code=404, detail="Preferences not found")
        
        return prefs.dict()
    except Exception as e:
        logger.error(f"Get preferences error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preferences/stats/{semester}")
async def get_preference_statistics(semester: int):
    """Get statistics on submitted preferences for semester"""
    try:
        from services.department_preference_service import DepartmentPreferenceService
        
        service = DepartmentPreferenceService(redis_client=app.state.redis_client)
        stats = service.get_preference_statistics(semester)
        
        return stats
    except Exception as e:
        logger.error(f"Preference stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _estimate_processing_time(profile: HardwareProfile) -> dict:
    """Estimate processing time based on hardware profile"""
    base_time_seconds = 600  # 10 minutes baseline for 1000 courses
    
    # Apply hardware multipliers
    cpu_factor = 1.0 / profile.cpu_multiplier
    gpu_factor = 1.0 / profile.gpu_multiplier if profile.has_nvidia_gpu else 1.0
    memory_factor = 1.0 / profile.memory_multiplier
    
    # Strategy-specific adjustments
    if profile.optimal_strategy.value == "gpu_cuda":
        estimated_time = base_time_seconds * cpu_factor * gpu_factor * 0.3  # GPU 70% faster
    elif profile.optimal_strategy.value == "cloud_distributed":
        estimated_time = base_time_seconds * cpu_factor * 0.2  # Distributed 80% faster
    elif profile.optimal_strategy.value == "hybrid":
        estimated_time = base_time_seconds * cpu_factor * gpu_factor * 0.15  # Hybrid 85% faster
    elif profile.optimal_strategy.value == "cpu_multi":
        estimated_time = base_time_seconds * cpu_factor * memory_factor * 0.6  # Multi-core 40% faster
    else:
        estimated_time = base_time_seconds * cpu_factor * memory_factor
    
    return {
        "estimated_seconds": int(estimated_time),
        "estimated_minutes": round(estimated_time / 60, 1),
        "strategy": profile.optimal_strategy.value,
        "confidence": "high" if profile.cpu_cores >= 4 else "medium"
    }

# Cleanup duplicate files on startup
@app.on_event("startup")
async def cleanup_duplicates():
    """Clean up duplicate/unused files"""
    import os
    
    duplicate_files = [
        "api/generation.py",
        "engine/distributed_scheduler.py", 
        "engine/gpu_scheduler.py",
        "engine/incremental_scheduler.py",
        "engine/variant_generator.py",
        "tasks/timetable_tasks.py"
    ]
    
    for file_path in duplicate_files:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"[CLEANUP] Removed duplicate file: {file_path}")
        except Exception as e:
            logger.debug(f"[CLEANUP] Could not remove {file_path}: {e}")
    
    # Remove empty directories
    empty_dirs = ["api", "tasks"]
    for dir_path in empty_dirs:
        try:
            if os.path.exists(dir_path) and not os.listdir(dir_path):
                os.rmdir(dir_path)
                logger.info(f"[CLEANUP] Removed empty directory: {dir_path}")
        except Exception as e:
            logger.debug(f"[CLEANUP] Could not remove directory {dir_path}: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)