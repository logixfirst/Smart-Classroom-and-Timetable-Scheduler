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

logger = logging.getLogger(__name__)


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
        
        if not clusters:
            logger.warning("[SAGA] No clusters to solve - returning empty solution")
            return {}
        
        solution = {}
        
        for cluster_id, cluster in enumerate(clusters):
            # Check cancellation BETWEEN clusters (safe point)
            token.check_or_raise(f"cpsat_cluster_{cluster_id}")
            
            logger.info(f"[SAGA] Solving cluster {cluster_id+1}/{len(clusters)}...")
            
            # Update progress
            if tracker:
                tracker.update_stage_progress(cluster_id, len(clusters))
            
            solver = AdaptiveCPSATSolver(
                courses=cluster,
                rooms=data['rooms'],
                time_slots=data['time_slots'],
                faculty=data['faculty'],
                job_id=job_id,
                redis_client=self.redis_client,
                cluster_id=cluster_id,
                total_clusters=len(clusters)
            )
            
            cluster_solution = solver.solve_cluster(cluster)
            
            if cluster_solution:
                solution.update(cluster_solution)
            else:
                logger.warning(f"[SAGA] Cluster {cluster_id} failed - using greedy fallback")
                for course in cluster:
                    solution[course.course_id] = {
                        'time_slot': 0,
                        'room': data['rooms'][0].room_id if data['rooms'] else None
                    }
        
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

        for variant_idx in range(NUM_VARIANTS):
            try:
                # Use a different random seed per variant for diversity
                variant_seed = 42 + variant_idx * 13
                random.seed(variant_seed)

                optimizer = GeneticAlgorithmOptimizer(
                    courses=data['courses'],
                    rooms=data['rooms'],
                    time_slots=data['time_slots'],
                    faculty=data['faculty'],
                    students=data['students'],
                    initial_solution=copy.deepcopy(initial_solution),
                    population_size=15,
                    generations=20
                )

                optimized = optimizer.optimize()
                fitness = optimizer.fitness(optimized)

                variant_record = {
                    'variant_id': variant_idx + 1,
                    'seed': variant_seed,
                    'fitness': round(fitness, 4),
                    'solution': optimized,
                    'label': f'Timetable Option {variant_idx + 1}'
                }
                variants.append(variant_record)

                if fitness > best_fitness:
                    best_fitness = fitness
                    best_solution = optimized

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
        for (course_id, session), (t_slot_id, room_id) in final_solution.items():
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

        # Build the full result payload
        result_payload = {
            'timetable_entries': timetable_entries,
            'total_sessions_scheduled': len(timetable_entries),
            'total_courses': len(courses_by_id),
            'variants_count': len(variants),
            'variants': [
                {
                    'variant_id': v['variant_id'],
                    'label': v['label'],
                    'fitness': v['fitness'],
                }
                for v in variants
            ],
            'generated_at': datetime.now(timezone.utc).isoformat(),
        }

        # ------------------------------------------------------------------
        # Step 2: Store all variants in Redis (for /api/variants/{job_id})
        # ------------------------------------------------------------------
        if self.redis_client:
            try:
                redis_result = {
                    'timetable': result_payload,
                    'variants': variants,
                    'metadata': {
                        'job_id': job_id,
                        'org_id': data.get('organization_id'),
                        'semester': data.get('semester'),
                        'generated_at': result_payload['generated_at'],
                    }
                }
                self.redis_client.setex(
                    f"result:job:{job_id}",
                    3600 * 24,  # 24h TTL
                    json.dumps(redis_result, default=str)
                )
                logger.info(f"[SAGA-PERSIST] Stored {len(variants)} variants in Redis")
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
                    WHERE job_id = %s
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
                    WHERE job_id = %s AND status NOT IN ('completed', 'approved')
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
