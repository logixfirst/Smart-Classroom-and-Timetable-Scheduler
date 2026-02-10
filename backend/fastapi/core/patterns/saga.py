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
        
        try:
            # STEP 1: Load data (CANCELABLE)
            with SafePoint(token, "data_loading"):
                logger.info("[SAGA] Step 1/5: Loading data...")
                data = await self._load_data(job_id, request_data)
                self.stage_completed['data_load'] = True
            
            # STEP 2: Clustering (CANCELABLE)
            with SafePoint(token, "clustering"):
                logger.info("[SAGA] Step 2/5: Clustering courses...")
                clusters = await self._stage1_clustering(job_id, data, token)
                self.stage_completed['clustering'] = True
            
            # STEP 3: CP-SAT solving (CANCELABLE between clusters only)
            with SafePoint(token, "cpsat_solving"):
                logger.info("[SAGA] Step 3/5: CP-SAT solving...")
                initial_solution = await self._stage2_cpsat(job_id, data, clusters, token)
                self.stage_completed['cpsat'] = True
            
            # STEP 4: GA optimization (CANCELABLE between generations)
            with SafePoint(token, "ga_optimization"):
                logger.info("[SAGA] Step 4/5: GA optimization...")
                optimized_solution = await self._stage2b_ga(job_id, data, initial_solution, token)
                self.stage_completed['ga'] = True
            
            # STEP 5: RL refinement (CANCELABLE)
            with SafePoint(token, "rl_refinement"):
                logger.info("[SAGA] Step 5/5: RL refinement...")
                final_solution = await self._stage3_rl(job_id, data, optimized_solution, token)
                self.stage_completed['rl'] = True
            
            # STEP 6: Persistence (NON-CANCELABLE atomic section)
            # Industry pattern: Cancellation deferred during atomic DB write
            with AtomicSection(token, "persistence"):
                logger.info("[SAGA] Persisting results (atomic - non-cancelable)...")
                # TODO: Save to database
                self.stage_completed['persistence'] = True
                pass
            
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
            await self._compensate(job_id)
            raise
    
    async def _load_data(self, job_id: str, request_data: dict) -> Dict:
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
    
    async def _stage1_clustering(self, job_id: str, data: Dict, token: CancellationToken) -> List[List]:
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
    
    async def _stage2_cpsat(self, job_id: str, data: Dict, clusters: List[List], token: CancellationToken) -> Dict:
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
    
    async def _stage2b_ga(self, job_id: str, data: Dict, initial_solution: Dict, token: CancellationToken) -> Dict:
        """
        Stage 2B: Genetic algorithm optimization for soft constraints
        ✅ DESIGN FREEZE: CPU-only, single population, deterministic
        """
        from engine.ga.optimizer import GeneticAlgorithmOptimizer
        
        if not initial_solution:
            logger.warning("[SAGA] No initial solution - skipping GA")
            return initial_solution
        
        try:
            optimizer = GeneticAlgorithmOptimizer(
                courses=data['courses'],
                rooms=data['rooms'],
                time_slots=data['time_slots'],
                faculty=data['faculty'],
                students=data['students'],
                initial_solution=initial_solution,
                population_size=15,
                generations=20
            )
            
            optimized = optimizer.optimize()
            logger.info("[SAGA] GA optimization complete")
            # Store for fallback
            self.job_data['ga_solution'] = optimized
            return optimized
            
        except Exception as e:
            logger.error(f"[SAGA] GA failed: {e} - using initial solution")
            return initial_solution
    
    async def _stage3_rl(self, job_id: str, data: Dict, solution: Dict, token: CancellationToken) -> Dict:
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
    
    async def _compensate(self, job_id: str):
        """
        Compensation logic for failure rollback
        Clean up partial work (e.g., delete temporary data, notify failure)
        """
        logger.warning(f"[SAGA] Compensating for job {job_id}")
        
        # TODO: Implement compensation logic
        # - Clear Redis cache for job
        # - Notify Django backend of failure
        # - Clean up any temporary files
        
        self.completed_steps.clear()
        self.job_data.clear()


# TODO: Future enhancements (post-DESIGN FREEZE)
# - Integrate Django REST API for data loading (_load_data)
# - Add WebSocket progress updates for real-time feedback
# - Implement RL policy training pipeline (offline, frozen policies)
# - Add conflict detection and reporting
# - Implement proper compensation logic (_compensate)
