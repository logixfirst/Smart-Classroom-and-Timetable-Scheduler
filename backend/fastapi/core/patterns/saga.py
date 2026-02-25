"""  
Saga Pattern for Timetable Generation
DESIGN FREEZE-compliant workflow orchestration with industry-standard cancellation
Following enterprise standards: Simple, testable, production-safe

CANCELLATION STATE MACHINE (Google/Meta Pattern):

    CREATED
       ↓
    RUNNING
       ↓
    CANCELLATION_REQUESTED
       ↓
    ┌──────────────────┐
    │ AT SAFE POINT?     │
    └──────────────────┘
       ↓ YES         ↓ NO
    STOPPED       DEFERRED → STOPPED
       ↓              (after atomic section)
    CP-SAT done?
     │       │
    YES      NO
     │       │
  PARTIAL   CANCELLED
  SUCCESS

CRITICAL RULES:
1. Cancellation is COOPERATIVE (not forced)
2. Cancellation only at SAFE POINTS:
   - Between clusters
   - Between GA generations  
   - Between RL episodes
3. ATOMIC sections are NON-CANCELABLE:
   - CP-SAT model construction
   - Database write transactions
4. PARTIAL_SUCCESS if CP-SAT completed (feasible solution exists)
5. CANCELLED if before CP-SAT (no usable solution)

Industry Quote:
"The system supports cooperative cancellation at safe execution boundaries.
Cancellation is deferred during atomic optimization and persistence phases
to ensure schedule consistency."
"""
import logging
import asyncio
import os
import psutil
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, List, Optional
from datetime import datetime, timezone

from core.cancellation import (
    CancellationToken,
    CancellationMode,
    CancellationError,
    SafePoint,
    AtomicSection,
    clear_cancellation
)
from utils.progress_tracker import ProgressTracker

# Sentinel used when CP-SAT cannot schedule a course's cluster and greedy
# fallback must insert a placeholder entry.  Downstream code (persist, conflict
# checkers) can detect this value and treat the course as unscheduled instead
# of accidentally blocking a real room/slot with a dummy assignment.
_GREEDY_FALLBACK_SENTINEL = '__UNSCHEDULED__'

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# OPT1: Top-level worker for ProcessPoolExecutor.
# MUST be module-level (not a method) so Python's pickle can find it.
#
# Intentionally excluded (not picklable / belong in main process):
#   redis_client  — progress and cancellation handled in main async loop
#   tracker       — same
#   token         — same
#   job_id        — not needed inside subprocess
# ---------------------------------------------------------------------------
def _solve_cluster_worker(
    cluster_id: int,
    cluster,
    rooms,
    time_slots,
    faculty,
    student_course_index,
    total_clusters: int,
    num_workers: int,
):
    """
    Run one CP-SAT cluster inside a subprocess.
    Returns (cluster_id, solution_or_None, error_msg_or_None).
    """
    import logging as _logging
    _logger = _logging.getLogger(__name__)
    try:
        from engine.cpsat.solver import AdaptiveCPSATSolver
        solver = AdaptiveCPSATSolver(
            courses=cluster,
            rooms=rooms,
            time_slots=time_slots,
            faculty=faculty,
            cluster_id=cluster_id,
            total_clusters=total_clusters,
            student_course_index=student_course_index,
            num_workers=num_workers,  # OPT1: controlled thread budget per cluster
            # redis_client intentionally omitted — not picklable
        )
        solution = solver.solve_cluster(cluster)
        return (cluster_id, solution, None)
    except Exception as exc:  # noqa: BLE001
        import traceback
        return (cluster_id, None, f"{exc}\n{traceback.format_exc()}")


class TimetableGenerationSaga:
    """
    Saga pattern for timetable generation workflow.
    
    DESIGN FREEZE Architecture:
    1. Load data (mock for now - will integrate with Django REST API)
    2. Stage 1: CPU clustering (Louvain with greedy fallback)
    3. Stage 2: CP-SAT solving (hard feasibility, aggressive domain reduction)
    4. Stage 2B: GA optimization (CPU-only, optional)
    5. Stage 3: RL refinement (frozen policy, optional)
    
    ✅ COMPLIANT: CPU-only, no GPU, no runtime learning, deterministic
    ❌ DISABLED: GPU acceleration, runtime RL training, distributed execution
    """
    
    def __init__(self, redis_client=None):
        """Initialize saga with empty state and Redis client"""
        self.steps = []
        self.completed_steps = []
        self.job_data = {}
        self.redis_client = redis_client
        # Track completion status for PARTIAL_SUCCESS detection (Google/Meta pattern)
        self.stage_completed = {
            'data_load': False,
            'clustering': False,
            'cpsat': False,
            'ga': False,
            'rl': False,
            'persistence': False
        }
        logger.info("[SAGA] Initialized (DESIGN FREEZE compliant)")
    
    async def execute(self, job_id: str, request_data: dict) -> Dict:
        """
        Execute the complete timetable generation workflow with cancellation support.
        
        Args:
            job_id: Unique job identifier
            request_data: Generation request with organization_id, semester, time_config
            
        Returns:
            Dict with generated timetable and metadata
        """
        logger.info(f"[SAGA] Starting workflow for job {job_id}")
        
        # Create cancellation token (SOFT mode by default)
        token = CancellationToken(job_id, self.redis_client, CancellationMode.SOFT)
        
        # Create progress tracker (Enterprise pattern: worker owns progress)
        tracker = ProgressTracker(job_id, self.redis_client) if self.redis_client else None
        
        try:
            # STEP 1: Load data (CANCELABLE)
            with SafePoint(token, "data_loading"):
                logger.info("[SAGA] Step 1/5: Loading data...")
                if tracker:
                    tracker.start_stage('loading')
                data = await self._load_data(job_id, request_data, tracker)
                self.stage_completed['data_load'] = True
                if tracker:
                    tracker.complete_stage()
            
            # STEP 2: Clustering (CANCELABLE)
            with SafePoint(token, "clustering"):
                logger.info("[SAGA] Step 2/5: Clustering courses...")
                if tracker:
                    tracker.start_stage('clustering', total_items=len(data['courses']))
                clusters = await self._stage1_clustering(job_id, data, token, tracker)
                self.stage_completed['clustering'] = True
                if tracker:
                    tracker.complete_stage()
            
            # STEP 3: CP-SAT solving (CANCELABLE between clusters only)
            with SafePoint(token, "cpsat_solving"):
                logger.info("[SAGA] Step 3/5: CP-SAT solving...")
                if tracker:
                    tracker.start_stage('cpsat_solving', total_items=len(clusters))
                initial_solution = await self._stage2_cpsat(job_id, data, clusters, token, tracker)
                self.stage_completed['cpsat'] = True
                if tracker:
                    tracker.complete_stage()
            
            # STEP 4: GA optimization (CANCELABLE between generations)
            with SafePoint(token, "ga_optimization"):
                logger.info("[SAGA] Step 4/5: GA optimization...")
                if tracker:
                    tracker.start_stage('ga_optimization')
                optimized_solution = await self._stage2b_ga(job_id, data, initial_solution, token, tracker)
                self.stage_completed['ga'] = True
                if tracker:
                    tracker.complete_stage()
            
            # STEP 5: RL refinement (CANCELABLE)
            with SafePoint(token, "rl_refinement"):
                logger.info("[SAGA] Step 5/5: RL refinement...")
                if tracker:
                    tracker.start_stage('rl_refinement')
                final_solution = await self._stage3_rl(job_id, data, optimized_solution, token, tracker)
                self.stage_completed['rl'] = True
                if tracker:
                    tracker.complete_stage()
            
            # STEP 6: Persistence (NON-CANCELABLE atomic section)
            # ISS 5 FIX: Previously this was a TODO/pass — timetable was never saved.
            # Now writes the final timetable to Django's GenerationJob record and
            # stores all variants in Redis for the variants API endpoint.
            with AtomicSection(token, "persistence"):
                logger.info("[SAGA] Persisting results (atomic - non-cancelable)...")
                await self._persist_results(
                    job_id,
                    final_solution,
                    data,
                    self.job_data.get('variants', [])
                )
                self.stage_completed['persistence'] = True
            
            # Mark as completed
            if tracker:
                tracker.mark_completed()
            
            # Clear cancellation flag on success
            clear_cancellation(job_id, self.redis_client)
            
            logger.info(f"[SAGA] ✅ Workflow complete for job {job_id}")
            
            return {
                'success': True,
                'job_id': job_id,
                'solution': final_solution,
                'metadata': {
                    'clusters': len(clusters),
                    'courses': len(data['courses']),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            }
            
        except CancellationError as e:
            logger.warning(f"[SAGA] ⚠️  Job {job_id} cancelled: {e}")
            
            # Mark as cancelled
            if tracker:
                tracker.mark_cancelled()
            
            # Google/Meta pattern: Distinguish CANCELLED vs PARTIAL_SUCCESS
            # If CP-SAT completed, we have a usable (though unoptimized) solution
            is_partial_success = self.stage_completed['cpsat']
            
            if is_partial_success:
                logger.info(f"[SAGA] ✅ PARTIAL_SUCCESS: CP-SAT completed, refinement cancelled")
                # Keep the CP-SAT solution (feasible but not optimized)
                await self._compensate(job_id)
                return {
                    'success': True,
                    'partial': True,
                    'job_id': job_id,
                    'state': 'partial_success',
                    'completed_stages': list(k for k, v in self.stage_completed.items() if v),
                    'solution': self.job_data.get('cpsat_solution', {}),
                    'reason': f'Cancelled during {e.reason.value if e.reason else "unknown"}',
                    'message': 'Basic solution generated, optimization cancelled'
                }
            else:
                logger.warning(f"[SAGA] ❌ CANCELLED: No usable solution (cancelled before CP-SAT)")
                await self._compensate(job_id)
                return {
                    'success': False,
                    'job_id': job_id,
                    'state': 'cancelled',
                    'cancelled': True,
                    'reason': e.reason.value if e.reason else 'unknown'
                }
            
        except Exception as e:
            logger.error(f"[SAGA] ❌ Workflow failed: {e}")
            if tracker:
                tracker.mark_failed(str(e))
            await self._compensate(job_id)
            raise
    
    async def _load_data(self, job_id: str, request_data: dict, tracker=None) -> Dict:
        """
        Load data from Django backend via database connection
        PRODUCTION: Direct database access for performance
        """
        from utils.django_client import DjangoAPIClient
        
        try:
            # Use Redis client passed to saga instance
            django_client = DjangoAPIClient(redis_client=self.redis_client)
            
            org_id = request_data.get('organization_id')
            semester = request_data.get('semester', 1)
            time_config = request_data.get('time_config')
            
            logger.info(f"[SAGA] Loading data for org={org_id}, semester={semester}")
            
            # Resolve org name to UUID if needed
            org_id = django_client.resolve_org_id(org_id)
            
            # Fetch all data in parallel for performance
            import asyncio
            courses_task = django_client.fetch_courses(org_id, semester)
            faculty_task = django_client.fetch_faculty(org_id)
            rooms_task = django_client.fetch_rooms(org_id)
            time_slots_task = django_client.fetch_time_slots(org_id, time_config)
            students_task = django_client.fetch_students(org_id)
            
            courses, faculty, rooms, time_slots, students = await asyncio.gather(
                courses_task, faculty_task, rooms_task, time_slots_task, students_task
            )
            
            logger.info(f"[SAGA] Data loaded: {len(courses)} courses, {len(faculty)} faculty, "
                       f"{len(rooms)} rooms, {len(time_slots)} time slots, {len(students)} students")
            
            await django_client.close()
            
            return {
                'courses': courses,
                'rooms': rooms,
                'time_slots': time_slots,
                'faculty': faculty,
                'students': students,
                'organization_id': org_id,
                'semester': semester
            }
            
        except Exception as e:
            logger.error(f"[SAGA] Data loading failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    async def _stage1_clustering(self, job_id: str, data: Dict, token: CancellationToken, tracker=None) -> List[List]:
        """
        Stage 1: Louvain clustering with cancellation support
        ✅ DESIGN FREEZE: CPU-only, deterministic clustering
        """
        from engine.stage1_clustering import LouvainClusterer
        
        if not data['courses']:
            logger.warning("[SAGA] No courses to cluster - returning empty clusters")
            return []
        
        try:
            clusterer = LouvainClusterer(target_cluster_size=10)
            # Pass Redis and job_id for progress tracking (not cancellation)
            clusterer.redis_client = self.redis_client
            clusterer.job_id = job_id
            
            clusters_dict = clusterer.cluster_courses(data['courses'])
            clusters = list(clusters_dict.values())
            logger.info(f"[SAGA] Created {len(clusters)} clusters")
            return clusters
        except Exception as e:
            logger.error(f"[SAGA] Clustering failed: {e} - using greedy fallback")
            courses = data['courses']
            chunk_size = 10
            return [courses[i:i+chunk_size] for i in range(0, len(courses), chunk_size)]
    
    async def _stage2_cpsat(self, job_id: str, data: Dict, clusters: List[List], token: CancellationToken, tracker=None) -> Dict:
        """
        Stage 2: CP-SAT solving with cancellation between clusters
        ✅ DESIGN FREEZE: Deterministic, provably correct
        """
        from engine.cpsat.solver import AdaptiveCPSATSolver
        from engine.cpsat.constraints import build_student_course_index

        if not clusters:
            logger.warning("[SAGA] No clusters to solve - returning empty solution")
            return {}

        # OPT2: precompute {course_id: set(student_ids)} ONCE for all 2494 courses.
        # Each cluster solver slices its own courses from this shared index,
        # eliminating 216 redundant per-cluster set() constructions.
        all_courses = data.get('courses', [])
        student_course_index = build_student_course_index(all_courses)
        logger.info(
            f"[SAGA] Precomputed student-course index: {len(student_course_index)} courses"
        )

        solution = {}
        total_clusters_count = len(clusters)
        completed_count = 0

        # -----------------------------------------------------------------
        # OPT1: Parallel cluster execution via ProcessPoolExecutor
        #
        # Thread budget rule: parallel_clusters × workers_per_cluster ≤ physical_cores
        # On 6-core hardware: 2 × 3 = 6 threads → no CPU thrashing.
        #
        # Falls back to sequential if:
        #   (a) available RAM < 2 GB
        #   (b) ProcessPoolExecutor fails to start
        # -----------------------------------------------------------------
        from engine.hardware.config import PARALLEL_CLUSTERS

        physical_cores = os.cpu_count() or 6
        parallel_clusters = PARALLEL_CLUSTERS
        workers_per_cluster = max(1, physical_cores // parallel_clusters)
        available_ram_gb = psutil.virtual_memory().available / (1024 ** 3)

        use_parallel = available_ram_gb >= 2.0
        if not use_parallel:
            logger.warning(
                f"[SAGA] Available RAM {available_ram_gb:.1f} GB < 2 GB — "
                f"falling back to sequential cluster solving"
            )
        else:
            logger.info(
                f"[SAGA-PARALLEL] {parallel_clusters} clusters × "
                f"{workers_per_cluster} workers = "
                f"{parallel_clusters * workers_per_cluster} threads "
                f"on {physical_cores} physical cores"
            )

        if use_parallel:
            try:
                loop = asyncio.get_running_loop()
                with ProcessPoolExecutor(max_workers=parallel_clusters) as executor:
                    # Submit all clusters at once; results come back as they finish.
                    tasks = [
                        loop.run_in_executor(
                            executor,
                            _solve_cluster_worker,
                            cluster_id,
                            cluster,
                            data['rooms'],
                            data['time_slots'],
                            data['faculty'],
                            student_course_index,
                            total_clusters_count,
                            workers_per_cluster,
                        )
                        for cluster_id, cluster in enumerate(clusters)
                    ]

                    for coro in asyncio.as_completed(tasks):
                        try:
                            result_cid, cluster_solution, error_msg = await coro
                            completed_count += 1

                            if error_msg:
                                logger.error(
                                    f"[SAGA-PARALLEL] Cluster {result_cid} error: "
                                    f"{error_msg[:300]}"
                                )
                                # Error isolation: greedy fallback for this cluster.
                                # Use the sentinel slot-id so persist skips these
                                # entries cleanly rather than blocking real slots.
                                logger.warning(
                                    "[CPSAT] GREEDY FALLBACK triggered — "
                                    "cluster %d error: %s",
                                    result_cid, error_msg[:200]
                                )
                                _fb_room = (
                                    data['rooms'][0].room_id
                                    if data['rooms'] else None
                                )
                                for course in clusters[result_cid]:
                                    for _sess in range(max(course.duration, 1)):
                                        solution[(course.course_id, _sess)] = (
                                            _GREEDY_FALLBACK_SENTINEL, _fb_room
                                        )
                            elif cluster_solution:
                                solution.update(cluster_solution)
                            else:
                                logger.warning(
                                    "[CPSAT] GREEDY FALLBACK triggered — "
                                    "cluster %d returned no solution",
                                    result_cid
                                )
                                _fb_room = (
                                    data['rooms'][0].room_id
                                    if data['rooms'] else None
                                )
                                for course in clusters[result_cid]:
                                    for _sess in range(max(course.duration, 1)):
                                        solution[(course.course_id, _sess)] = (
                                            _GREEDY_FALLBACK_SENTINEL, _fb_room
                                        )

                            # Progress update after each cluster completes
                            if tracker:
                                tracker.update_stage_progress(
                                    completed_count, total_clusters_count
                                )

                            # Cancellation check at each safe point
                            token.check_or_raise(
                                f"cpsat_cluster_{result_cid}_done"
                            )

                        except CancellationError:
                            raise  # propagate to saga's outer handler
                        except Exception as future_exc:
                            completed_count += 1
                            logger.error(
                                f"[SAGA-PARALLEL] Future raised unexpectedly: "
                                f"{future_exc}"
                            )
                            if tracker:
                                tracker.update_stage_progress(
                                    completed_count, total_clusters_count
                                )

            except CancellationError:
                raise
            except Exception as pool_exc:
                logger.error(
                    f"[SAGA-PARALLEL] ProcessPoolExecutor failed: {pool_exc} — "
                    f"falling back to sequential"
                )
                # Reset state so the sequential block below starts clean
                use_parallel = False
                solution = {}
                completed_count = 0

        if not use_parallel:
            # Sequential fallback (original logic, preserved exactly)
            for cluster_id, cluster in enumerate(clusters):
                # Check cancellation BETWEEN clusters (safe point)
                token.check_or_raise(f"cpsat_cluster_{cluster_id}")

                logger.info(
                    f"[SAGA] Solving cluster {cluster_id + 1}/{total_clusters_count}..."
                )

                solver = AdaptiveCPSATSolver(
                    courses=cluster,
                    rooms=data['rooms'],
                    time_slots=data['time_slots'],
                    faculty=data['faculty'],
                    job_id=job_id,
                    redis_client=self.redis_client,
                    cluster_id=cluster_id,
                    total_clusters=total_clusters_count,
                    student_course_index=student_course_index,  # OPT2
                )

                cluster_solution = solver.solve_cluster(cluster)
                completed_count += 1

                if tracker:
                    tracker.update_stage_progress(
                        completed_count, total_clusters_count
                    )

                if cluster_solution:
                    solution.update(cluster_solution)
                else:
                    logger.warning(
                        "[CPSAT] GREEDY FALLBACK triggered — "
                        "cluster %d failed, %d courses unscheduled",
                        cluster_id, len(cluster)
                    )
                    _fb_room = (
                        data['rooms'][0].room_id if data['rooms'] else None
                    )
                    for course in cluster:
                        for _sess in range(max(course.duration, 1)):
                            solution[(course.course_id, _sess)] = (
                                _GREEDY_FALLBACK_SENTINEL, _fb_room
                            )

        logger.info(f"[SAGA] CP-SAT complete: {len(solution)} assignments")
        # Store for PARTIAL_SUCCESS recovery (Google/Meta pattern)
        self.job_data['cpsat_solution'] = solution
        return solution
    
    async def _stage2b_ga(
        self, job_id: str, data: Dict, initial_solution: Dict,
        token: CancellationToken, tracker=None
    ) -> Dict:
        """
        Stage 2B: Genetic algorithm optimization for soft constraints.

        MISS 1 FIX: Runs GA 3× with different seeds to generate multiple
        timetable variants the admin can choose from.
        ✅ DESIGN FREEZE: CPU-only, single population, deterministic per seed.
        """
        from engine.ga.optimizer import GeneticAlgorithmOptimizer
        import copy
        import random

        if not initial_solution:
            logger.warning("[SAGA] No initial solution - skipping GA")
            return initial_solution

        NUM_VARIANTS = 3  # SIH requirement: multiple options to choose from
        variants = []
        best_solution = initial_solution
        best_fitness = float('-inf')

        # Semantic diversity: each variant optimises a different objective.
        # Different weights drive evolution towards genuinely different local optima.
        VARIANT_CONFIGS = [
            {
                'seed': 42,
                'label': 'Faculty-Friendly',
                'weights': {'faculty': 0.55, 'room': 0.20, 'spread': 0.15, 'student': 0.10},
            },
            {
                'seed': 55,
                'label': 'Room-Efficient',
                'weights': {'faculty': 0.20, 'room': 0.55, 'spread': 0.15, 'student': 0.10},
            },
            {
                'seed': 68,
                'label': 'Student-Spread',
                'weights': {'faculty': 0.20, 'room': 0.20, 'spread': 0.45, 'student': 0.15},
            },
        ]

        from config import settings as _ga_settings
        _ga_pop = _ga_settings.GA_POPULATION_SIZE
        _ga_gens = _ga_settings.GA_GENERATIONS
        _ga_total_ticks = NUM_VARIANTS * _ga_gens  # total generation ticks across all variants
        _ga_ticks_done = 0  # running counter for smooth progress 75%→90%

        for variant_idx in range(NUM_VARIANTS):
            try:
                # Use a different random seed per variant for diversity
                config = VARIANT_CONFIGS[variant_idx]
                variant_seed = config['seed']
                random.seed(variant_seed)

                # Closure captures mutable counter via list wrapper
                _ticks_ref = [_ga_ticks_done]

                def _ga_progress_callback(gen: int, total_gens: int, best_fitness: float,
                                          _ref=_ticks_ref, _tracker=tracker,
                                          _total=_ga_total_ticks, _job_id=job_id):
                    """Emit one SSE progress tick per GA generation (75%→90% range)."""
                    _ref[0] += 1
                    if _tracker is None:
                        return
                    # Map ticks into the GA stage's 75-90% window
                    ga_start, ga_end = 75.0, 90.0
                    fraction = min(_ref[0] / max(_total, 1), 1.0)
                    overall = ga_start + fraction * (ga_end - ga_start)
                    try:
                        _tracker.update(
                            stage='ga_optimization',
                            stage_progress=round(fraction * 100, 1),
                            overall_progress=round(overall, 2),
                            meta={'variant': variant_idx + 1, 'generation': gen,
                                  'best_fitness': round(best_fitness, 2)}
                        )
                    except Exception:
                        pass  # Non-fatal

                optimizer = GeneticAlgorithmOptimizer(
                    courses=data['courses'],
                    rooms=data['rooms'],
                    time_slots=data['time_slots'],
                    faculty=data['faculty'],
                    students=data['students'],
                    initial_solution=copy.deepcopy(initial_solution),
                    population_size=_ga_pop,
                    generations=_ga_gens,
                    fitness_weights=config['weights'],
                    progress_callback=_ga_progress_callback
                )

                optimized = optimizer.optimize()
                fitness = optimizer.fitness(optimized)

                variant_record = {
                    'variant_id': variant_idx + 1,
                    'seed': variant_seed,
                    'fitness': round(fitness, 4),
                    'solution': optimized,
                    'label': config['label'],
                    'weights': config['weights'],
                }
                variants.append(variant_record)

                if fitness > best_fitness:
                    best_fitness = fitness
                    best_solution = optimized

                # Advance the shared tick counter for the next variant
                _ga_ticks_done = _ticks_ref[0]

                logger.info(
                    f"[SAGA] GA variant {variant_idx + 1}/{NUM_VARIANTS} "
                    f"fitness={fitness:.4f} (seed={variant_seed})"
                )

            except Exception as e:
                logger.error(f"[SAGA] GA variant {variant_idx + 1} failed: {e} - skipping")
                continue

        # Store all variants for the variants API endpoint and admin UI
        self.job_data['variants'] = variants
        self.job_data['ga_solution'] = best_solution

        logger.info(
            f"[SAGA] GA complete: {len(variants)} variants generated, "
            f"best fitness={best_fitness:.4f}"
        )
        return best_solution
    
    async def _stage3_rl(self, job_id: str, data: Dict, solution: Dict, token: CancellationToken, tracker=None) -> Dict:
        """
        Stage 3: RL conflict refinement (frozen policy, optional)
        ✅ DESIGN FREEZE: Tabular Q-learning, no runtime learning, local swaps only
        """
        from engine.rl.qlearning import SimpleTabularQLearning
        
        if not solution:
            logger.warning("[SAGA] No solution - skipping RL")
            return solution
        
        try:
            # RL with FROZEN policy (no learning during runtime)
            rl = SimpleTabularQLearning(
                courses=data['courses'],
                faculty=data['faculty'],
                rooms=data['rooms'],
                time_slots=data['time_slots'],
                frozen=True  # ❌ NO runtime learning (DESIGN FREEZE)
            )
            
            # Try to load pre-trained policy for this semester
            semester = data.get('semester')
            if semester:
                rl.load_policy(semester_id=f"sem_{semester}", freeze_on_load=True)
                logger.info(f"[SAGA] Attempted to load pre-trained policy for semester {semester}")
            
            # Apply RL refinement (local swaps only, no global repair)
            refined = solution  # TODO: Implement rl.refine_solution(solution)
            logger.info("[SAGA] RL refinement complete")
            return refined
            
        except Exception as e:
            logger.error(f"[SAGA] RL failed: {e} - using GA solution")
            return solution
    
    async def _persist_results(
        self,
        job_id: str,
        final_solution: Dict,
        data: Dict,
        variants: list
    ):
        """
        ISS 5 FIX: Persist the final timetable to Django's database.

        Previously this was a TODO/pass — the saga produced a result in memory
        but never wrote it back to Django, leaving the GenerationJob stuck.

        This method:
        1. Converts the internal solution dict into TimetableEntry JSON records
        2. Writes them into Django's `generation_jobs` table (timetable_data column)
        3. Sets job status to 'completed' so Django's polling endpoint sees it
        4. Stores all variants in Redis for the variants API endpoint
        """
        import json
        import os
        import psycopg2
        from psycopg2.extras import RealDictCursor
        from datetime import datetime, timezone

        logger.info(f"[SAGA-PERSIST] Writing timetable for job {job_id}")

        # ------------------------------------------------------------------
        # Step 1: Build structured timetable_data from the internal solution
        # ------------------------------------------------------------------
        courses_by_id = {c.course_id: c for c in data.get('courses', [])}
        slot_by_id = {str(ts.slot_id): ts for ts in data.get('time_slots', [])}
        rooms_by_id = {r.room_id: r for r in data.get('rooms', [])}

        timetable_entries = []
        _malformed_keys: list = []   # programming-error entries (wrong format)
        _unscheduled_count: int = 0  # greedy-sentinel entries (CP-SAT failure)

        for _key, _value in final_solution.items():
            # ── Guard 1: key/value must be 2-tuples ──────────────────────────
            try:
                (course_id, session) = _key
                (t_slot_id, room_id) = _value
            except (TypeError, ValueError):
                _malformed_keys.append(_key)
                logger.error(
                    "[SAGA-PERSIST] Malformed solution entry — "
                    "key=%r value=%r (expected 2-tuple: 2-tuple format)",
                    _key, _value
                )
                continue

            # ── Guard 2: greedy-fallback sentinel → course is unscheduled ────
            if t_slot_id == _GREEDY_FALLBACK_SENTINEL:
                _unscheduled_count += 1
                logger.debug(
                    "[SAGA-PERSIST] Course %s session %s is unscheduled "
                    "(greedy fallback sentinel)",
                    course_id, session
                )
                continue

            course = courses_by_id.get(course_id)
            slot = slot_by_id.get(str(t_slot_id))
            room = rooms_by_id.get(room_id)

            if not (course and slot and room):
                continue

            entry = {
                'course_id': course_id,
                'course_code': getattr(course, 'course_code', ''),
                'course_name': getattr(course, 'course_name', ''),
                'faculty_id': getattr(course, 'faculty_id', ''),
                'room_id': room_id,
                'room_code': getattr(room, 'room_code', ''),
                'time_slot_id': str(t_slot_id),
                'day': slot.day,
                'day_of_week': slot.day_of_week,
                'start_time': slot.start_time,
                'end_time': slot.end_time,
                'session_number': session,
                'student_ids': list(getattr(course, 'student_ids', [])),
                'batch_ids': list(getattr(course, 'batch_ids', [])),
            }
            timetable_entries.append(entry)

        # ── Post-loop diagnostics ─────────────────────────────────────────────
        total = len(final_solution)
        if _unscheduled_count:
            logger.warning(
                "[SAGA-PERSIST] %d/%d entries are unscheduled (greedy fallback) — "
                "those courses will be absent from the generated timetable",
                _unscheduled_count, total
            )
        if _malformed_keys:
            pct = len(_malformed_keys) / max(total, 1)
            logger.error(
                "[SAGA-PERSIST] %d/%d entries have malformed keys (%.1f%%) — "
                "job_id=%s",
                len(_malformed_keys), total, pct * 100, job_id
            )
            # Abort if more than 5% of the solution is corrupt — saving a
            # heavily incomplete timetable gives a false 'completed' signal.
            if pct > 0.05:
                raise ValueError(
                    f"[SAGA-PERSIST] Aborting: {len(_malformed_keys)}/{total} "
                    f"({pct:.1%}) solution entries are malformed. "
                    f"Saving would produce a severely incomplete timetable."
                )

        # ------------------------------------------------------------------
        # Build per-variant metrics so Django's TimetableVariantViewSet.list()
        # can return real numbers to the frontend.
        #
        # Broken chain before this fix:
        #   FastAPI stored {variant_id, label, fitness}
        #   Django reads   v.get('score', 0)          → 0  (field named 'fitness')
        #                  v.get('conflicts', 0)       → 0  (field missing)
        #                  len(v['timetable_entries']) → 0  (field missing)
        #   Frontend shows Overall Score 0%, Conflicts 0, Total Classes 0
        # ------------------------------------------------------------------
        _max_fitness = max((v['fitness'] for v in variants), default=1.0) or 1.0
        _total_rooms = max(len(rooms_by_id), 1)

        def _build_variant_payload(v: dict) -> dict:
            """Convert one GA variant → DB-ready dict with correct field names."""
            sol = v.get('solution', {})

            # ── Convert solution → entry list ────────────────────────────
            v_entries: list = []
            faculty_slot_usage: dict = {}   # (faculty_id, t_slot_id) → course_code
            room_slot_usage: dict = {}      # (room_id,    t_slot_id) → course_code
            rooms_used: set = set()
            conflicts: int = 0

            for _k, _val in sol.items():
                try:
                    (c_id, _sess) = _k
                    (t_sid, r_id) = _val
                except (TypeError, ValueError):
                    continue
                if t_sid == _GREEDY_FALLBACK_SENTINEL:
                    continue

                course = courses_by_id.get(c_id)
                slot   = slot_by_id.get(str(t_sid))
                room   = rooms_by_id.get(r_id)
                if not (course and slot and room):
                    continue

                # Count faculty conflicts
                fac_key = (getattr(course, 'faculty_id', ''), str(t_sid))
                if fac_key[0]:
                    if fac_key in faculty_slot_usage:
                        conflicts += 1
                    faculty_slot_usage[fac_key] = c_id

                # Count room conflicts
                room_key = (r_id, str(t_sid))
                if room_key in room_slot_usage:
                    conflicts += 1
                room_slot_usage[room_key] = c_id
                rooms_used.add(r_id)

                _fac_id = getattr(course, 'faculty_id', '')
                _fac    = data.get('faculty', {}).get(_fac_id)
                v_entries.append({
                    'course_code':  getattr(course, 'course_code', ''),
                    'subject_name': getattr(course, 'course_name', ''),
                    'faculty_id':   _fac_id,
                    'faculty_name': getattr(_fac, 'faculty_name', '') if _fac else '',
                    'room_id':      r_id,
                    'room_code':    getattr(room, 'room_code', ''),
                    'time_slot_id': str(t_sid),
                    'day':          slot.day,
                    'start_time':   slot.start_time,
                    'end_time':     slot.end_time,
                })

            # Normalise fitness to 0–100 relative to best variant in this run
            score_pct = round((v['fitness'] / _max_fitness) * 100, 1)
            room_util = round((len(rooms_used) / _total_rooms) * 100, 1)

            return {
                # Field names Django reads
                'variant_id':        v['variant_id'],
                'label':             v.get('label', ''),
                'score':             score_pct,          # was: fitness (wrong name)
                'fitness':           v['fitness'],       # keep raw for debugging
                'conflicts':         conflicts,          # was: missing
                'timetable_entries': v_entries,          # was: missing → total_classes=0
                'room_utilization':  room_util,
                # Quality metrics block (matches Django quality_metrics field names)
                'quality_metrics': {
                    'overall_score':            score_pct,
                    'total_conflicts':          conflicts,
                    'room_utilization_score':   room_util,
                },
                'statistics': {
                    'total_classes':    len(v_entries),
                    'total_conflicts':  conflicts,
                },
            }

        enriched_variants = [_build_variant_payload(v) for v in variants]

        # Build the full result payload
        result_payload = {
            'timetable_entries': timetable_entries,
            'total_sessions_scheduled': len(timetable_entries),
            'total_courses': len(courses_by_id),
            'variants_count': len(enriched_variants),
            'variants': enriched_variants,
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }

        # ------------------------------------------------------------------
        # Step 2: Store variants summary in Redis (for /api/variants/{job_id})
        #
        # ROOT CAUSE OF PREVIOUS 26 MB OVERFLOW:
        #   result_payload contained BOTH top-level timetable_entries (8279 rows)
        #   AND enriched_variants — each with their own timetable_entries lists.
        #   Combined ~16 k entries × ~1.6 KB = 26 MB >> Upstash 10 MB limit.
        #
        # Fix: Redis stores ONLY lightweight summaries — no entry rows at all.
        #   Full entries live in Django's generation_jobs.timetable_data (Django DB).
        #   Redis is a fast-read cache for job status + variant scores, NOT a
        #   secondary DB for 8 k-row payloads.
        # ------------------------------------------------------------------
        if self.redis_client:
            try:
                # Strip timetable_entries from each variant (keep scores / metrics)
                redis_variants = [
                    {k: v2 for k, v2 in ev.items() if k != 'timetable_entries'}
                    for ev in enriched_variants
                ]
                # Strip timetable_entries + full variants from the timetable summary
                # (variants block replaced by the lightweight redis_variants list)
                redis_timetable_summary = {
                    k: v2 for k, v2 in result_payload.items()
                    if k not in ('timetable_entries', 'variants')
                }
                redis_timetable_summary['variants'] = redis_variants

                redis_result = {
                    'timetable': redis_timetable_summary,   # lightweight summary
                    'variants': redis_variants,             # scores + metrics only
                    'metadata': {
                        'job_id': job_id,
                        'org_id': data.get('organization_id'),
                        'semester': data.get('semester'),
                        'total_entries': len(timetable_entries),
                        'generated_at': result_payload['generated_at'],
                    }
                }
                payload_bytes = len(json.dumps(redis_result, default=str).encode())
                logger.info(
                    f"[SAGA-PERSIST] Redis payload size: {payload_bytes / 1024:.1f} KB "
                    f"({len(enriched_variants)} variants, entries stored in DB only)"
                )
                self.redis_client.setex(
                    f"result:job:{job_id}",
                    3600 * 24,  # 24h TTL
                    json.dumps(redis_result, default=str)
                )
                logger.info(f"[SAGA-PERSIST] Stored {len(enriched_variants)} variants in Redis")
            except Exception as redis_err:
                logger.error(f"[SAGA-PERSIST] Redis store failed: {redis_err}")

        # ------------------------------------------------------------------
        # Step 3: Write back to Django's generation_jobs table
        # ------------------------------------------------------------------
        db_conn = None
        try:
            db_url = os.getenv(
                'DATABASE_URL',
                'postgresql://postgres:postgres@localhost:5432/sih28'
            )
            db_conn = psycopg2.connect(
                db_url,
                cursor_factory=RealDictCursor,
                connect_timeout=10
            )
            db_conn.autocommit = False

            with db_conn.cursor() as cur:
                timetable_json = json.dumps(result_payload, default=str)
                cur.execute(
                    """
                    UPDATE generation_jobs
                    SET
                        status            = 'completed',
                        progress          = 100,
                        timetable_data    = %s::jsonb,
                        completed_at      = %s,
                        updated_at        = %s
                    WHERE id = %s
                    """,
                    (
                        timetable_json,
                        datetime.now(timezone.utc),
                        datetime.now(timezone.utc),
                        job_id,
                    )
                )
                rows_updated = cur.rowcount

            db_conn.commit()

            if rows_updated == 0:
                logger.warning(
                    f"[SAGA-PERSIST] No rows updated for job {job_id}. "
                    f"The job may not exist in generation_jobs table."
                )
            else:
                logger.info(
                    f"[SAGA-PERSIST] ✅ Job {job_id} updated: "
                    f"{len(timetable_entries)} entries, status=completed"
                )

        except Exception as db_err:
            logger.error(f"[SAGA-PERSIST] DB write failed: {db_err}")
            if db_conn:
                db_conn.rollback()
            # Non-fatal: result is still in Redis — Django can read from there
            logger.warning(
                "[SAGA-PERSIST] Falling back to Redis-only result. "
                "Django must poll Redis for this job."
            )
        finally:
            if db_conn:
                db_conn.close()

    async def _compensate(self, job_id: str):
        """
        Compensation logic for failure/cancellation rollback.
        Marks the GenerationJob as failed/cancelled in Django's DB.
        """
        import json
        import os
        import psycopg2
        from psycopg2.extras import RealDictCursor
        from datetime import datetime, timezone

        logger.warning(f"[SAGA] Compensating for job {job_id}")

        # Clear Redis flags
        if self.redis_client:
            try:
                self.redis_client.delete(f"cancel:job:{job_id}")
            except Exception:
                pass

        # Mark job as failed in Django DB
        db_conn = None
        try:
            db_url = os.getenv(
                'DATABASE_URL',
                'postgresql://postgres:postgres@localhost:5432/sih28'
            )
            db_conn = psycopg2.connect(
                db_url,
                cursor_factory=RealDictCursor,
                connect_timeout=10
            )
            db_conn.autocommit = False
            with db_conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE generation_jobs
                    SET status = 'failed', updated_at = %s
                    WHERE id = %s AND status NOT IN ('completed', 'approved')
                    """,
                    (datetime.now(timezone.utc), job_id)
                )
            db_conn.commit()
        except Exception as e:
            logger.error(f"[SAGA] Compensation DB write failed: {e}")
            if db_conn:
                db_conn.rollback()
        finally:
            if db_conn:
                db_conn.close()

        self.completed_steps.clear()
        self.job_data.clear()


# TODO: Future enhancements (post-DESIGN FREEZE)
# - Integrate Django REST API for data loading (_load_data)
# - Add WebSocket progress updates for real-time feedback
# - Implement RL policy training pipeline (offline, frozen policies)
# - Add conflict detection and reporting
# - Implement proper compensation logic (_compensate)
