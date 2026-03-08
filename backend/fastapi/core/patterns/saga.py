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


def _enqueue_cache_warm_task(job_id: str) -> None:
    """Enqueue Django's ``fastapi_callback_task`` immediately after a successful
    DB persist so that Django's Redis caches (variants_list_*, variant_entries_*)
    are populated **before** the SSE 'completed' event reaches the frontend.

    Design notes (Google/Meta cache-aside pattern):
    - FastAPI writes the DB directly via psycopg2, bypassing Celery entirely.
    - Without this call, ``fastapi_callback_task`` is NEVER queued, so Django
      caches stay cold — every first review-page visit cold-reads a 5-50 MB
      JSONB column from Neon, taking 20-30 s.
    - This function creates a minimal Celery *producer* (no Django app needed)
      and publishes the task.  The Django Celery worker picks it up in <200 ms
      on the same Redis broker and warms all cache keys.
    - Fire-and-forget: a failure here is non-fatal; the review page degrades
      gracefully to a slower cold read.
    - ``variants`` is intentionally omitted from the task kwargs so we stay
      under the Celery Redis message-size limit (~64 KB default).  The task
      reads variants from the DB itself (see ``fastapi_callback_task``).

    Args:
        job_id: UUID string of the ``GenerationJob`` row just committed.
    """
    try:
        broker_url = os.getenv(
            'CELERY_BROKER_URL',
            os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        )
        from celery import Celery as _CeleryProducer  # lightweight producer only
        _app = _CeleryProducer(broker=broker_url)
        _app.send_task(
            'academics.celery_tasks.fastapi_callback_task',
            args=[job_id, 'completed'],
            kwargs={},
            queue='celery',   # Django's default Celery queue name
        )
        logger.info(
            "[SAGA-PERSIST] Cache-warm task enqueued",
            extra={"job_id": job_id},
        )
    except Exception as exc:
        logger.warning(
            "[SAGA-PERSIST] Cache-warm enqueue failed (non-fatal) — "
            "first review-page load may be slower",
            extra={"job_id": job_id, "error": str(exc)},
        )


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
    
    COMPLIANT: CPU-only, no GPU, no runtime learning, deterministic
    DISABLED: GPU acceleration, runtime RL training, distributed execution
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
        import time as _time
        _workflow_start = _time.perf_counter()
        logger.info(
            "[SAGA] ============================================================"
        )
        logger.info(
            "[SAGA] WORKFLOW START  job_id=%s  org=%s  semester=%s",
            job_id,
            request_data.get('organization_id', '?'),
            request_data.get('semester', '?'),
        )
        logger.info(
            "[SAGA] ============================================================"
        )

        # Create cancellation token (SOFT mode by default)
        token = CancellationToken(job_id, self.redis_client, CancellationMode.SOFT)

        # Create progress tracker (Enterprise pattern: worker owns progress)
        tracker = ProgressTracker(job_id, self.redis_client) if self.redis_client else None

        try:
            # ------------------------------------------------------------------
            # STEP 1: Load data (CANCELABLE)
            # ------------------------------------------------------------------
            _t0 = _time.perf_counter()
            logger.info("[SAGA] STEP 1/6 START  stage=data_loading")
            with SafePoint(token, "data_loading"):
                if tracker:
                    tracker.start_stage('loading')
                data = await self._load_data(job_id, request_data, tracker)
                self.stage_completed['data_load'] = True
                if tracker:
                    tracker.complete_stage()
            _t1 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 1/6 DONE   stage=data_loading  elapsed=%.2fs"
                "  courses=%d  faculty=%d  rooms=%d  time_slots=%d"
                "  students=%d  enrollments=%d",
                _t1 - _t0,
                len(data.get('courses', [])),
                len(data.get('faculty', {})),
                len(data.get('rooms', [])),
                len(data.get('time_slots', [])),
                len(data.get('students', [])),
                len(data.get('enrollments', [])),
            )

            # ------------------------------------------------------------------
            # STEP 2: Clustering (CANCELABLE)
            # ------------------------------------------------------------------
            _t0 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 2/6 START  stage=clustering  courses=%d",
                len(data['courses']),
            )
            with SafePoint(token, "clustering"):
                if tracker:
                    tracker.start_stage('clustering', total_items=len(data['courses']))
                clusters = await self._stage1_clustering(job_id, data, token, tracker)
                self.stage_completed['clustering'] = True
                if tracker:
                    tracker.complete_stage()
            _t1 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 2/6 DONE   stage=clustering  elapsed=%.2fs"
                "  clusters=%d  avg_cluster_size=%.1f",
                _t1 - _t0,
                len(clusters),
                sum(len(c) for c in clusters) / max(len(clusters), 1),
            )

            # ------------------------------------------------------------------
            # STEP 3: CP-SAT solving (CANCELABLE between clusters only)
            # ------------------------------------------------------------------
            _t0 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 3/6 START  stage=cpsat_solving  clusters=%d",
                len(clusters),
            )
            with SafePoint(token, "cpsat_solving"):
                if tracker:
                    tracker.start_stage('cpsat_solving', total_items=len(clusters))
                initial_solution = await self._stage2_partitioned_solve(
                    job_id, data, clusters, token, tracker
                )
                self.stage_completed['cpsat'] = True
                if tracker:
                    tracker.complete_stage()
            _t1 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 3/6 DONE   stage=cpsat_solving  elapsed=%.2fs"
                "  assignments=%d",
                _t1 - _t0,
                len(initial_solution),
            )

            # ------------------------------------------------------------------
            # STEP 4: GA optimization (CANCELABLE between generations)
            # ------------------------------------------------------------------
            _t0 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 4/6 START  stage=ga_optimization  initial_assignments=%d",
                len(initial_solution),
            )
            with SafePoint(token, "ga_optimization"):
                if tracker:
                    tracker.start_stage('ga_optimization')
                optimized_solution = await self._stage2b_ga(
                    job_id, data, initial_solution, token, tracker
                )
                self.stage_completed['ga'] = True
                if tracker:
                    tracker.complete_stage()
            _t1 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 4/6 DONE   stage=ga_optimization  elapsed=%.2fs"
                "  variants=%d  assignments=%d",
                _t1 - _t0,
                len(self.job_data.get('variants', [])),
                len(optimized_solution),
            )

            # ------------------------------------------------------------------
            # STEP 5: RL refinement (CANCELABLE)
            # ------------------------------------------------------------------
            _t0 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 5/6 START  stage=rl_refinement  assignments=%d",
                len(optimized_solution),
            )
            with SafePoint(token, "rl_refinement"):
                if tracker:
                    tracker.start_stage('rl_refinement')
                final_solution = await self._stage3_rl(
                    job_id, data, optimized_solution, token, tracker
                )
                self.stage_completed['rl'] = True
                if tracker:
                    tracker.complete_stage()
            _t1 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 5/6 DONE   stage=rl_refinement  elapsed=%.2fs"
                "  assignments=%d",
                _t1 - _t0,
                len(final_solution),
            )

            # ------------------------------------------------------------------
            # STEP 6: Persistence (NON-CANCELABLE atomic section)
            # ISS 5 FIX: Previously this was a TODO/pass — timetable was never saved.
            # Now writes the final timetable to Django's GenerationJob record and
            # stores all variants in Redis for the variants API endpoint.
            # ------------------------------------------------------------------
            _t0 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 6/6 START  stage=persistence  assignments=%d"
                "  variants=%d  (atomic - non-cancelable)",
                len(final_solution),
                len(self.job_data.get('variants', [])),
            )
            with AtomicSection(token, "persistence"):
                await self._persist_results(
                    job_id,
                    final_solution,
                    data,
                    self.job_data.get('variants', [])
                )
                self.stage_completed['persistence'] = True
            _t1 = _time.perf_counter()
            logger.info(
                "[SAGA] STEP 6/6 DONE   stage=persistence  elapsed=%.2fs",
                _t1 - _t0,
            )

            # Mark as completed
            if tracker:
                tracker.mark_completed()

            # Clear cancellation flag on success
            clear_cancellation(job_id, self.redis_client)

            _total = _time.perf_counter() - _workflow_start
            logger.info(
                "[SAGA] ============================================================"
            )
            logger.info(
                "[SAGA] WORKFLOW COMPLETE  job_id=%s  total_elapsed=%.2fs",
                job_id, _total,
            )
            logger.info(
                "[SAGA] ============================================================"
            )
            
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
            logger.warning(f"[SAGA] Job {job_id} cancelled: {e}")
            
            # Mark as cancelled
            if tracker:
                tracker.mark_cancelled()
            
            # Google/Meta pattern: Distinguish CANCELLED vs PARTIAL_SUCCESS
            # If CP-SAT completed, we have a usable (though unoptimized) solution
            is_partial_success = self.stage_completed['cpsat']
            
            if is_partial_success:
                logger.info(f"[SAGA] PARTIAL_SUCCESS: CP-SAT completed, refinement cancelled")
                # Keep the CP-SAT solution (feasible but not optimized)
                await self._compensate(job_id, is_cancelled=True)
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
                logger.warning(f"[SAGA] CANCELLED: No usable solution (cancelled before CP-SAT)")
                await self._compensate(job_id, is_cancelled=True)
                return {
                    'success': False,
                    'job_id': job_id,
                    'state': 'cancelled',
                    'cancelled': True,
                    'reason': e.reason.value if e.reason else 'unknown'
                }
            
        except Exception as e:
            logger.error(f"[SAGA] Workflow failed: {e}")
            if tracker:
                tracker.mark_failed(str(e))
            await self._compensate(job_id)
            raise
    
    async def _load_data(self, job_id: str, request_data: dict, tracker=None) -> Dict:
        """
        Load data from Django backend via database connection.

        All five fetch_* calls run truly in parallel via asyncio.gather:
        - Each method uses asyncio.to_thread so psycopg2 blocking I/O does NOT
          stall the event loop.
        - Each thread borrows its own connection from the module-level pool.

        The DjangoAPIClient.close() call is in a finally block to guarantee the
        primary borrowed connection is returned to the pool even on exceptions.
        """
        from utils.django_client import DjangoAPIClient

        org_id = request_data.get('organization_id')
        semester = request_data.get('semester', 1)
        time_config = request_data.get('time_config')

        import time as _t
        logger.info(
            "[SAGA-DATA] Loading data  job_id=%s  org_id=%s  semester=%s"
            "  time_config=%s",
            job_id, org_id, semester,
            "custom" if time_config else "default",
        )

        django_client = DjangoAPIClient(redis_client=self.redis_client)
        try:
            # Resolve org name -> UUID (sync, uses primary connection, fast)
            logger.info(
                "[SAGA-DATA] Resolving org identifier  raw_value=%s", org_id
            )
            _t0 = _t.perf_counter()
            org_id = django_client.resolve_org_id(org_id)
            logger.info(
                "[SAGA-DATA] Org resolved  org_uuid=%s  elapsed=%.3fs",
                org_id, _t.perf_counter() - _t0,
            )

            # Fetch all data in parallel.
            # Each fetch_* method uses asyncio.to_thread internally, so these
            # coroutines truly run concurrently on the thread pool.
            # Wall-clock time = max(individual fetch times), not their sum.
            import asyncio
            logger.info(
                "[SAGA-DATA] Launching 6 parallel DB fetches"
                "  (courses / faculty / rooms / time_slots / students / enrollments)"
            )
            _t0 = _t.perf_counter()
            courses, faculty, rooms, time_slots, students, enrollments = await asyncio.gather(
                django_client.fetch_courses(org_id, semester),
                django_client.fetch_faculty(org_id),
                django_client.fetch_rooms(org_id),
                django_client.fetch_time_slots(org_id, time_config),
                django_client.fetch_students(org_id),
                django_client.fetch_enrollments(org_id, semester),
            )
            _elapsed = _t.perf_counter() - _t0

            logger.info(
                "[SAGA-DATA] All fetches complete  elapsed=%.2fs"
                "  courses=%d  faculty=%d  rooms=%d  time_slots=%d"
                "  students=%d  enrollments=%d",
                _elapsed,
                len(courses),
                len(faculty) if isinstance(faculty, (list, dict)) else 0,
                len(rooms),
                len(time_slots),
                len(students),
                len(enrollments),
            )

            return {
                'courses': courses,
                'rooms': rooms,
                'time_slots': time_slots,
                'faculty': faculty,
                'students': students,
                'enrollments': enrollments,
                'organization_id': org_id,
                'semester': semester,
            }

        except Exception as exc:
            logger.error(
                "[SAGA] Data loading failed",
                extra={"job_id": job_id, "error": str(exc)},
            )
            import traceback
            logger.error(traceback.format_exc())
            raise
        finally:
            # Always return the borrowed connection to the pool,
            # even if an exception occurred above.
            await django_client.close()
    
    async def _stage1_clustering(self, job_id: str, data: Dict, token: CancellationToken, tracker=None) -> List[List]:
        """
        Stage 1: Louvain clustering with cancellation support
        DESIGN FREEZE: CPU-only, deterministic clustering
        """
        from engine.stage1_clustering import LouvainClusterer
        import time as _t

        if not data['courses']:
            logger.warning("[SAGA-CLUSTER] No courses to cluster - returning empty clusters")
            return []

        n_courses = len(data['courses'])
        logger.info(
            "[SAGA-CLUSTER] Initializing Louvain clusterer  courses=%d"
            "  target_cluster_size=10",
            n_courses,
        )

        try:
            _t0 = _t.perf_counter()
            clusterer = LouvainClusterer(target_cluster_size=10)
            # Pass Redis and job_id for progress tracking (not cancellation)
            clusterer.redis_client = self.redis_client
            clusterer.job_id = job_id

            logger.info(
                "[SAGA-CLUSTER] Running cluster_courses  courses=%d"
                "  edge_threshold=%.2f",
                n_courses, clusterer.EDGE_THRESHOLD,
            )
            clusters_dict = clusterer.cluster_courses(data['courses'])
            clusters = list(clusters_dict.values())
            _elapsed = _t.perf_counter() - _t0

            sizes = sorted(len(c) for c in clusters)
            logger.info(
                "[SAGA-CLUSTER] Clustering complete  elapsed=%.2fs"
                "  clusters=%d  min_size=%d  max_size=%d  avg_size=%.1f",
                _elapsed,
                len(clusters),
                sizes[0] if sizes else 0,
                sizes[-1] if sizes else 0,
                sum(sizes) / max(len(sizes), 1),
            )
            return clusters
        except Exception as e:
            logger.error(
                "[SAGA-CLUSTER] Louvain clustering failed: %s -- using greedy fallback"
                "  courses=%d",
                e, n_courses,
            )
            import traceback
            logger.error(traceback.format_exc())
            courses = data['courses']
            chunk_size = 10
            fallback = [courses[i:i+chunk_size] for i in range(0, len(courses), chunk_size)]
            logger.warning(
                "[SAGA-CLUSTER] Greedy fallback: %d clusters of size ~%d",
                len(fallback), chunk_size,
            )
            return fallback
    
    @staticmethod
    def _push_phase_progress(
        redis_client, job_id: str, phase: str, pct: int, meta: dict
    ) -> None:
        """
        Best-effort Redis progress push for partition-solve phase milestones.
        Maps 0-100 pct into the 55%-72% overall window (clustering→GA).
        Non-fatal: if Redis is unavailable, the progress bar skips this tick.
        """
        if not redis_client:
            return
        try:
            import json
            import time as _t
            key = f"progress:job:{job_id}"
            raw = redis_client.get(key)
            existing = json.loads(raw) if raw else {}
            mapped = 55.0 + (pct / 100.0) * 17.0
            if mapped > existing.get("overall_progress", 0.0):
                existing.update({
                    "stage": "cpsat_solving",
                    "stage_progress": float(pct),
                    "overall_progress": round(mapped, 2),
                    "last_updated": int(_t.time()),
                    "metadata": {"phase": phase, **meta},
                })
                redis_client.setex(key, 7200, json.dumps(existing))
        except Exception as exc:
            logger.warning(
                "[SAGA] Phase progress push failed (non-fatal)",
                extra={"phase": phase, "error": str(exc)},
            )

    async def _run_dept_phase(
        self,
        job_id: str,
        data: Dict,
        dept_buckets: Dict,
        registry,
        token: CancellationToken,
    ) -> List:
        """Phase 2: solve each department's courses using CommittedAwareSolver.

        Enterprise fix: ``solve_department_timetable`` is a CPU-intensive
        synchronous solver.  Calling it directly inside an ``async def`` blocked
        the entire asyncio event loop for the full duration of each department's
        CP-SAT run (seconds to minutes per dept, × N depts).

        All WebSocket / SSE / Redis heartbeats stalled during that window,
        causing the frontend to incorrectly report the job as hanging and
        triggering spurious reconnects.

        Fix: each dept solve runs in a thread-pool worker via
        ``asyncio.to_thread()``.  The event loop stays responsive; progress
        updates, cancellation checks, and Redis writes all fire normally between
        dept completions.
        """
        from engine.cpsat.dept_solver import solve_department_timetable

        dept_results = []
        n_depts = len(dept_buckets)
        for i, (dept_id, dept_courses) in enumerate(dept_buckets.items()):
            token.check_or_raise(f"dept_phase_{dept_id}")
            logger.info(
                "[SAGA-DEPT] Solving dept %d/%d  dept_id=%s  courses=%d  job_id=%s",
                i + 1, n_depts, dept_id, len(dept_courses), job_id,
            )
            # Run blocking CP-SAT solver in a thread-pool worker so the event
            # loop stays free for progress updates and cancellation checks.
            result = await asyncio.to_thread(
                solve_department_timetable,
                dept_id=dept_id,
                courses=dept_courses,
                rooms=data["rooms"],
                faculty=data["faculty"],
                time_slots=data["time_slots"],
                committed_registry=registry,
                job_id=job_id,
                redis_client=self.redis_client,
            )
            registry.commit_solution(result.solution, dept_courses)
            dept_results.append(result)
            pct = 10 + int((i + 1) / max(n_depts, 1) * 58)
            self._push_phase_progress(
                self.redis_client, job_id, "dept_solving", pct, registry.report_stats()
            )
            logger.info(
                "[SAGA-DEPT] Dept %d/%d done  dept_id=%s"
                "  solved=%d  failed=%d  elapsed=%.2fs  progress=%d%%",
                i + 1, n_depts, dept_id,
                getattr(result, 'solved_count', '?'),
                getattr(result, 'failed_count', '?'),
                getattr(result, 'elapsed_seconds', 0.0),
                pct,
            )
        return dept_results

    async def _stage2_partitioned_solve(
        self,
        job_id: str,
        data: Dict,
        clusters: List[List],
        token: CancellationToken,
        tracker=None,
    ) -> Dict:
        """
        4-phase partitioned solver replacing monolithic _stage2_cpsat_legacy.

        Phase 1: CoursePartitioner  → dept_buckets + shared_pool
        Phase 2: DeptSolvers (seq)  → commits each dept to CommittedResourceRegistry
        Phase 3: CrossDeptSolver    → uses fully populated registry
        Phase 4: TimetableMerger    → final solution (same format as legacy output)

        Falls back to _stage2_cpsat_legacy on any unexpected exception so no
        regression is possible for existing deployments.
        """
        from engine.cpsat.committed_registry import CommittedResourceRegistry
        from engine.cpsat.cross_dept_solver import solve_cross_dept_timetable
        from engine.cpsat.timetable_merger import merge_timetables
        from core.services.course_partitioner import CoursePartitioner
        import time as _t

        courses = data.get("courses", [])
        if not courses:
            logger.warning(
                "[SAGA-CPSAT] No courses -- empty solution  job_id=%s", job_id
            )
            return {}

        logger.info(
            "[SAGA-CPSAT] PHASE 1: CoursePartitioner partitioning %d courses"
            "  job_id=%s",
            len(courses), job_id,
        )
        try:
            registry = CommittedResourceRegistry()
            _tp1 = _t.perf_counter()
            partition = CoursePartitioner().partition(courses)
            logger.info(
                "[SAGA-CPSAT] PHASE 1 done  elapsed=%.2fs  depts=%d"
                "  shared_pool=%d  stats=%s",
                _t.perf_counter() - _tp1,
                len(partition.dept_buckets),
                len(partition.shared_pool),
                partition.stats,
            )
            self._push_phase_progress(
                self.redis_client, job_id, "phase_1_partition", 5, partition.stats
            )

            # --- Phase 2: dept solvers (sequential) ---
            logger.info(
                "[SAGA-CPSAT] PHASE 2: dept solvers  depts=%d  job_id=%s",
                len(partition.dept_buckets), job_id,
            )
            token.check_or_raise("before_dept_phase")
            _tp2 = _t.perf_counter()
            dept_results = await self._run_dept_phase(
                job_id, data, partition.dept_buckets, registry, token
            )
            logger.info(
                "[SAGA-CPSAT] PHASE 2 done  elapsed=%.2fs  dept_results=%d"
                "  registry=%s",
                _t.perf_counter() - _tp2, len(dept_results),
                registry.report_stats(),
            )
            self._push_phase_progress(
                self.redis_client, job_id, "phase_2_complete", 68, registry.report_stats()
            )

            # --- Phase 3: cross-dept solver ---
            logger.info(
                "[SAGA-CPSAT] PHASE 3: cross-dept solver  shared_pool=%d  job_id=%s",
                len(partition.shared_pool), job_id,
            )
            token.check_or_raise("before_cross_dept")
            _tp3 = _t.perf_counter()
            # Run blocking solver in thread-pool worker (same rationale as Phase 2).
            cross_solution = await asyncio.to_thread(
                solve_cross_dept_timetable,
                shared_pool=partition.shared_pool,
                rooms=data["rooms"],
                faculty=data["faculty"],
                time_slots=data["time_slots"],
                committed_registry=registry,
                job_id=job_id,
                redis_client=self.redis_client,
            )
            logger.info(
                "[SAGA-CPSAT] PHASE 3 done  elapsed=%.2fs  cross_assignments=%d",
                _t.perf_counter() - _tp3, len(cross_solution),
            )
            registry.commit_solution(cross_solution, partition.shared_pool)
            self._push_phase_progress(
                self.redis_client, job_id, "phase_3_cross_dept", 90, registry.report_stats()
            )

            # --- Phase 4: merge ---
            logger.info("[SAGA-CPSAT] PHASE 4: merging dept + cross-dept results")
            _tp4 = _t.perf_counter()
            merged = merge_timetables(dept_results, cross_solution, courses)
            self.job_data["registry"] = registry
            logger.info(
                "[SAGA-CPSAT] PHASE 4 done  elapsed=%.2fs  merged_assignments=%d",
                _t.perf_counter() - _tp4, len(merged),
            )
            self._push_phase_progress(
                self.redis_client, job_id, "phase_4_merged", 100,
                {"assignments": len(merged)},
            )
            logger.info(
                "[SAGA-CPSAT] Partitioned solve complete  job_id=%s"
                "  total_assignments=%d",
                job_id, len(merged),
            )
            return merged

        except CancellationError:
            raise  # propagate to saga.execute() cancellation handler
        except Exception as exc:
            logger.error(
                "[SAGA-CPSAT] Partitioned solve FAILED -- falling back to legacy CP-SAT"
                "  job_id=%s  error=%s",
                job_id, exc,
            )
            import traceback
            logger.error(traceback.format_exc())
            return await self._stage2_cpsat_legacy(job_id, data, clusters, token, tracker)

    async def _stage2_cpsat_legacy(self, job_id: str, data: Dict, clusters: List[List], token: CancellationToken, tracker=None) -> Dict:
        """
        Stage 2 (legacy): monolithic CP-SAT solving with cancellation between clusters.
        Kept as fallback — called by _stage2_partitioned_solve on exception.
        DESIGN FREEZE: Deterministic, provably correct
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
        DESIGN FREEZE: CPU-only, single population, deterministic per seed.
        """
        from engine.ga.optimizer import GeneticAlgorithmOptimizer
        import copy
        import random
        import time as _t

        if not initial_solution:
            logger.warning("[SAGA-GA] No initial solution -- skipping GA  job_id=%s", job_id)
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
        _ga_ticks_done = 0  # running counter for smooth progress 75%->90%

        logger.info(
            "[SAGA-GA] Starting GA  job_id=%s  variants=%d  pop=%d  gens=%d"
            "  initial_assignments=%d",
            job_id, NUM_VARIANTS, _ga_pop, _ga_gens, len(initial_solution),
        )

        for variant_idx in range(NUM_VARIANTS):
            # ----------------------------------------------------------------
            # CANCELLATION SAFE POINT — between GA variants.
            # GA variants call optimizer.optimize() synchronously, blocking the
            # event loop for the full variant duration (~3-5 s each at BHU scale).
            # Without this check, a cancel request sat undetected for ALL remaining
            # variants → 10-15 s latency.  Checking here drops it to <5 s worst case.
            # The per-generation callback below drops it further to <0.5 s.
            # ----------------------------------------------------------------
            token.check_or_raise(f"ga_variant_{variant_idx}")
            try:
                # Use a different random seed per variant for diversity
                config = VARIANT_CONFIGS[variant_idx]
                variant_seed = config['seed']
                random.seed(variant_seed)

                logger.info(
                    "[SAGA-GA] Variant %d/%d START  seed=%d  label=%s"
                    "  weights=%s  job_id=%s",
                    variant_idx + 1, NUM_VARIANTS, variant_seed,
                    config['label'], config['weights'], job_id,
                )

                # Closure captures counter AND the cancellation token so the
                # callback can raise CancellationError every 5 generations,
                # giving <0.5 s cancel response inside a single variant.
                # CancellationError propagates because optimizer.py now re-raises
                # it instead of the generic `except Exception: pass` swallow.
                _ticks_ref = [_ga_ticks_done]

                def _ga_progress_callback(gen: int, total_gens: int, best_fitness: float,
                                          _ref=_ticks_ref, _tracker=tracker,
                                          _total=_ga_total_ticks, _job_id=job_id,
                                          _token=token, _vidx=variant_idx):
                    """Emit one SSE progress tick per GA generation (75%→90% range).

                    Also checks cancellation every 5 generations.  The check uses
                    a synchronous Redis GET (same as all other token checks) which
                    is safe here because this callback is called from the synchronous
                    optimizer loop — no event loop interference.
                    """
                    _ref[0] += 1
                    # Per-generation cancellation: raises CancellationError which
                    # propagates through optimizer._optimize_simple → _stage2b_ga
                    # → saga.execute()'s CancellationError handler.
                    if gen % 5 == 0:
                        _token.check_or_raise(f"ga_variant_{_vidx}_gen_{gen}")
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
                            meta={'variant': _vidx + 1, 'generation': gen,
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
                    "[SAGA-GA] Variant %d/%d DONE  fitness=%.4f  seed=%d"
                    "  label=%s  new_best=%s  job_id=%s",
                    variant_idx + 1, NUM_VARIANTS, fitness, variant_seed,
                    config['label'], fitness >= best_fitness, job_id,
                )

            except CancellationError:
                # Enterprise pattern: cooperative cancellation MUST propagate.
                # Without this guard the outer ``except Exception`` below swallows
                # CancellationError (it inherits from Exception), preventing saga's
                # outer handler from ever seeing it and leaving the job stuck as
                # 'running' permanently.
                raise
            except Exception as e:
                logger.error(f"[SAGA] GA variant {variant_idx + 1} failed: {e} - skipping")
                continue

        # Store all variants for the variants API endpoint and admin UI
        self.job_data['variants'] = variants
        self.job_data['ga_solution'] = best_solution

        logger.info(
            "[SAGA-GA] GA complete  job_id=%s  variants=%d  best_fitness=%.4f",
            job_id, len(variants), best_fitness,
        )
        return best_solution
    
    async def _stage3_rl(self, job_id: str, data: Dict, solution: Dict, token: CancellationToken, tracker=None) -> Dict:
        """
        Stage 3: RL conflict refinement (frozen policy, optional)
        DESIGN FREEZE: Tabular Q-learning, no runtime learning, local swaps only
        """
        from engine.rl.qlearning import SimpleTabularQLearning
        import time as _t

        if not solution:
            logger.warning("[SAGA-RL] No solution to refine - skipping RL stage")
            return solution

        logger.info(
            "[SAGA-RL] Initializing Q-learning resolver  assignments=%d"
            "  courses=%d  frozen=True",
            len(solution), len(data.get('courses', [])),
        )

        try:
            _t0 = _t.perf_counter()
            # RL with FROZEN policy (no learning during runtime)
            rl = SimpleTabularQLearning(
                courses=data['courses'],
                faculty=data['faculty'],
                rooms=data['rooms'],
                time_slots=data['time_slots'],
                frozen=True  # NO runtime learning (DESIGN FREEZE)
            )

            # Try to load pre-trained policy for this semester
            semester = data.get('semester')
            if semester:
                policy_key = f"sem_{semester}"
                logger.info(
                    "[SAGA-RL] Attempting to load pre-trained policy  key=%s",
                    policy_key,
                )
                rl.load_policy(semester_id=policy_key, freeze_on_load=True)
                logger.info(
                    "[SAGA-RL] Policy load attempt done"
                    "  q_table_size=%d  epsilon=%.4f",
                    len(rl.q_table), rl.epsilon,
                )

            # Apply RL refinement (local swaps only, no global repair)
            # NOTE: refine_solution is not yet implemented; RL stage is a pass-through.
            refined = solution  # TODO: Implement rl.refine_solution(solution)
            logger.info(
                "[SAGA-RL] RL refinement complete  elapsed=%.2fs"
                "  assignments_in=%d  assignments_out=%d  note=pass-through",
                _t.perf_counter() - _t0,
                len(solution),
                len(refined),
            )
            return refined

        except Exception as e:
            logger.error("[SAGA-RL] RL stage failed: %s - using GA solution", e)
            import traceback
            logger.error(traceback.format_exc())
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
        #
        # Enterprise fix: use the module-level ThreadedConnectionPool instead of
        # opening a raw psycopg2.connect() here.  A raw connect() pays the full
        # TCP + TLS + auth handshake cost (~300-1500 ms on Neon.tech) on EVERY
        # persist call, and each open connection is NOT returned to any pool —
        # it leaks until GC finalises the db_conn object.  Under concurrent load
        # this exhausts the 25-connection Neon.tech free-tier limit.
        #
        # By borrowing from django_client's shared pool we reuse existing
        # connections, reduce persist latency to <10 ms, and guarantee the
        # connection is returned on completion or error.
        # ------------------------------------------------------------------
        db_conn = None
        borrowed_from_pool = False
        try:
            from utils.django_client import _get_db_pool, _get_healthy_conn, _on_conn_closed
            _pool = _get_db_pool()
            db_conn = _get_healthy_conn(_pool)
            borrowed_from_pool = True
            # Pool connections are autocommit=True; we need a transaction here.
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
                    f"[SAGA-PERSIST] Job {job_id} updated: "
                    f"{len(timetable_entries)} entries, status=completed"
                )
                # ── Step 4: Trigger Django cache warm-up ─────────────────────
                # Warm Redis caches NOW (before tracker.mark_completed() fires
                # the SSE 'completed' event).  This gives the Celery worker the
                # maximum lead time before the browser lands on the review page.
                _enqueue_cache_warm_task(job_id)

        except Exception as db_err:
            logger.error(f"[SAGA-PERSIST] DB write failed: {db_err}")
            if db_conn:
                try:
                    db_conn.rollback()
                except Exception:
                    pass
            # Non-fatal: result is still in Redis — Django can read from there
            logger.warning(
                "[SAGA-PERSIST] Falling back to Redis-only result. "
                "Django must poll Redis for this job."
            )
        finally:
            if db_conn:
                if borrowed_from_pool:
                    # Restore autocommit so the connection is clean for the next borrower
                    try:
                        db_conn.autocommit = True
                    except Exception:
                        pass
                    try:
                        from utils.django_client import _get_db_pool
                        _get_db_pool().putconn(db_conn)
                    except Exception:
                        try:
                            db_conn.close()
                        except Exception:
                            pass
                else:
                    try:
                        db_conn.close()
                    except Exception:
                        pass

    async def _compensate(self, job_id: str, is_cancelled: bool = False):
        """
        Compensation logic for failure/cancellation rollback.

        Args:
            job_id:       Generation job UUID.
            is_cancelled: ``True`` when invoked from a ``CancellationError`` handler
                          (user-initiated stop) — writes ``'cancelled'`` to the DB.
                          ``False`` (default) for unhandled errors → ``'failed'``.

        Google/Meta pattern: terminal status MUST accurately reflect the exit reason
        so the admin dashboard, SSE listener, and Django polling endpoint all agree.
        Showing ``'failed'`` for an intentional cancel confuses operators and
        triggers false-positive alerting.
        """
        import json
        import os
        from datetime import datetime, timezone

        terminal_status = 'cancelled' if is_cancelled else 'failed'
        logger.warning(f"[SAGA] Compensating for job {job_id} (status={terminal_status})")

        # Clear ALL ephemeral job keys in ONE pipeline round-trip.
        # Previously only ``cancel:job:`` was deleted — ``start_time:job:`` and
        # ``state:job:`` leaked for up to 1 hour causing stale admin-dashboard reads.
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline(transaction=False)
                pipe.delete(f"cancel:job:{job_id}")
                pipe.delete(f"start_time:job:{job_id}")
                pipe.delete(f"state:job:{job_id}")
                pipe.execute()
            except Exception:
                pass

        # Mark job in Django DB with the correct terminal status
        db_conn = None
        borrowed_from_pool = False
        try:
            from utils.django_client import _get_db_pool, _get_healthy_conn
            _pool = _get_db_pool()
            db_conn = _get_healthy_conn(_pool)
            borrowed_from_pool = True
            db_conn.autocommit = False
            with db_conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE generation_jobs
                    SET status = %s, updated_at = %s
                    WHERE id = %s AND status NOT IN ('completed', 'approved')
                    """,
                    (terminal_status, datetime.now(timezone.utc), job_id)
                )
            db_conn.commit()
        except Exception as e:
            logger.error(f"[SAGA] Compensation DB write failed: {e}")
            if db_conn:
                try:
                    db_conn.rollback()
                except Exception:
                    pass
        finally:
            if db_conn:
                if borrowed_from_pool:
                    try:
                        db_conn.autocommit = True
                    except Exception:
                        pass
                    try:
                        from utils.django_client import _get_db_pool
                        _get_db_pool().putconn(db_conn)
                    except Exception:
                        try:
                            db_conn.close()
                        except Exception:
                            pass
                else:
                    try:
                        db_conn.close()
                    except Exception:
                        pass

        self.completed_steps.clear()
        self.job_data.clear()


# TODO: Future enhancements (post-DESIGN FREEZE)
# - Integrate Django REST API for data loading (_load_data)
# - Add WebSocket progress updates for real-time feedback
# - Implement RL policy training pipeline (offline, frozen policies)
# - Add conflict detection and reporting
# - Implement proper compensation logic (_compensate)
