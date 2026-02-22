"""
CP-SAT Solver - Main Orchestrator
Adaptive solver with progressive relaxation.
Wires in: faculty, room, student (BUG 1 FIX), workload (BUG 2 FIX),
          max-sessions-per-day (MISS 6 FIX), fixed-slots (MISS 2 FIX).
"""
import logging
import time
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from ortools.sat.python import cp_model

from models.timetable_models import Course, Room, TimeSlot, Faculty
from .strategies import STRATEGIES
from .progress import log_cluster_start, log_cluster_success
from .constraints import (
    add_faculty_constraints,
    add_room_constraints,
    add_student_constraints,
    add_workload_constraints,
    add_max_sessions_per_day_constraints,
    add_fixed_slot_constraints,
)

logger = logging.getLogger(__name__)


class AdaptiveCPSATSolver:
    """
    Adaptive CP-SAT solver with progressive relaxation.
    Tries multiple strategies until one succeeds.

    Hard constraints applied (in order):
    HC1 — Faculty conflict (no double-booking)
    HC2 — Room conflict (one course per room per slot)
    HC3 — Faculty workload (max hours/week) [BUG 2 FIX]
    HC4 — Student conflict (no student in two classes at once) [BUG 1 FIX]
    HC5 — Max sessions per course per day [MISS 6 FIX]
    HC6 — Fixed/special slot assignments [MISS 2 FIX]
    """

    def __init__(
        self,
        courses: List[Course],
        rooms: List[Room],
        time_slots: List[TimeSlot],
        faculty: Dict[str, Faculty],
        max_cluster_size: int = 50,
        job_id: str = None,
        redis_client=None,
        cluster_id: int = None,
        total_clusters: int = None,
        completed_clusters: int = 0,
        global_student_schedule: Dict[str, List[Tuple[int, int]]] = None,
        max_sessions_per_day: int = 2,
    ):
        self.courses = courses
        self.rooms = rooms
        self.time_slots = time_slots
        self.faculty = faculty
        self.max_cluster_size = max_cluster_size
        self.job_id = job_id
        self.redis_client = redis_client
        self.cluster_id = cluster_id
        self.total_clusters = total_clusters
        self.completed_clusters = completed_clusters
        self.global_student_schedule = global_student_schedule or {}
        self.max_sessions_per_day = max_sessions_per_day

        # Pre-build slot lookup (str → TimeSlot) used by MISS 6 constraint
        self.slot_by_id: Dict[str, TimeSlot] = {
            str(ts.slot_id): ts for ts in time_slots
        }

        # Auto-detect CPU cores
        import multiprocessing
        self.num_workers = min(8, multiprocessing.cpu_count())
        logger.info(f"[CP-SAT] Using {self.num_workers} CPU cores")

    def solve_cluster(self, cluster: List[Course], timeout: float = None) -> Optional[Dict]:
        """
        Solve cluster with progressive strategy relaxation.
        Returns assignments or None if no solution found.
        """
        cluster_start_time = time.perf_counter()

        log_cluster_start(
            self.cluster_id if self.cluster_id is not None else 0,
            len(cluster),
            len(self.time_slots)
        )

        # STEP 1: Build global indexes (O(N) once)
        self.course_by_id = {c.course_id: c for c in cluster}
        self.faculty_of_course = {c.course_id: c.faculty_id for c in cluster}
        self.students_of_course = {
            c.course_id: set(c.student_ids) if hasattr(c, 'student_ids') else set()
            for c in cluster
        }
        logger.info(f"[CP-SAT] Built indexes for {len(cluster)} courses")

        # STEP 2: Precompute valid domains
        self.valid_domains = self._precompute_valid_domains(cluster)
        total_entries = sum(len(v) for v in self.valid_domains.values())
        avg_per_session = total_entries / len(self.valid_domains) if self.valid_domains else 0
        logger.info(f"[CP-SAT] Domain size: {total_entries:,} entries (avg {avg_per_session:.0f}/session)")
        logger.info(f"[CP-SAT] Memory estimate: ~{total_entries * 16 / 1024 / 1024:.1f} MB")

        for strategy_idx, strategy in enumerate(STRATEGIES):
            logger.info(
                f"[CP-SAT] Attempting strategy {strategy_idx + 1}/{len(STRATEGIES)}: "
                f"{strategy['name']}"
            )
            solution = self._solve_with_strategy(cluster, strategy)

            if solution:
                elapsed = time.perf_counter() - cluster_start_time
                log_cluster_success(
                    self.cluster_id if self.cluster_id is not None else 0,
                    elapsed
                )
                return solution

        logger.warning("[CP-SAT] All strategies failed - will use greedy fallback")
        return None

    def _solve_with_strategy(self, cluster: List[Course], strategy: Dict) -> Optional[Dict]:
        """Solve cluster using a specific strategy config."""
        try:
            model = cp_model.CpModel()
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = strategy['timeout']
            solver.parameters.num_search_workers = self.num_workers

            # -------------------------------------------------------------
            # Create Boolean variables only for valid (slot, room) pairs
            # -------------------------------------------------------------
            variables: Dict[tuple, cp_model.IntVar] = {}
            for course in cluster:
                for session in range(course.duration):
                    domain_key = (course.course_id, session)
                    if domain_key in self.valid_domains:
                        for (t_slot_id, room_id) in self.valid_domains[domain_key]:
                            var_name = f"x_{course.course_id}_s{session}_t{t_slot_id}_r{room_id}"
                            var = model.NewBoolVar(var_name)
                            variables[(course.course_id, session, t_slot_id, room_id)] = var

            # Assignment: each session assigned exactly once
            for course in cluster:
                for session in range(course.duration):
                    session_vars = [
                        var for (c_id, s_idx, _, _), var in variables.items()
                        if c_id == course.course_id and s_idx == session
                    ]
                    if session_vars:
                        model.Add(sum(session_vars) == 1)

            # ------------------------------------------------------------------
            # HC1: Faculty conflicts
            # ------------------------------------------------------------------
            if strategy.get('faculty_conflicts', True):
                add_faculty_constraints(model, variables, cluster, self.faculty_of_course)

            # ------------------------------------------------------------------
            # HC2: Room conflicts
            # ------------------------------------------------------------------
            if strategy.get('room_capacity', True):
                add_room_constraints(model, variables, cluster)

            # ------------------------------------------------------------------
            # HC3: Faculty workload (BUG 2 FIX — re-added)
            # Only apply when strategy requests it (relaxed strategies may skip)
            # ------------------------------------------------------------------
            if strategy.get('workload_constraints', True):
                add_workload_constraints(
                    model, variables, cluster,
                    self.faculty_of_course,
                    self.faculty
                )

            # ------------------------------------------------------------------
            # HC4: Student conflict constraints (BUG 1 FIX — implemented)
            # Use "CRITICAL" mode in relaxed strategies to help feasibility,
            # "ALL" mode in strict strategies for full correctness.
            # ------------------------------------------------------------------
            student_priority = strategy.get('student_priority', 'ALL')
            add_student_constraints(
                model, variables, cluster, student_priority, self.students_of_course
            )

            # ------------------------------------------------------------------
            # HC5: Max sessions per course per day (MISS 6 FIX)
            # ------------------------------------------------------------------
            if strategy.get('max_sessions_per_day', True):
                add_max_sessions_per_day_constraints(
                    model, variables, cluster,
                    self.slot_by_id,
                    self.max_sessions_per_day
                )

            # ------------------------------------------------------------------
            # HC6: Fixed/special slot constraints (MISS 2 FIX)
            # Always applied — fixed slots are hard requirements
            # ------------------------------------------------------------------
            add_fixed_slot_constraints(model, variables, cluster)

            # Solve
            logger.info(f"[CP-SAT] Starting solver with timeout {strategy['timeout']}s...")
            status = solver.Solve(model)

            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                solution = {}
                for (course_id, session, t_slot_id, room_id), var in variables.items():
                    if solver.Value(var):
                        solution[(course_id, session)] = (t_slot_id, room_id)

                logger.info(f"[CP-SAT] Solution found: {len(solution)} assignments")
                return solution

            logger.warning(f"[CP-SAT] No solution with strategy: {strategy['name']}")
            return None

        except Exception as e:
            logger.error(f"[CP-SAT] Strategy failed: {e}")
            return None

    def _precompute_valid_domains(self, cluster: List[Course]) -> Dict:
        """
        Aggressive domain filtering: reduces variable count dramatically.
        Reduces ~3.3M entries → ~50K entries (98% reduction).

        BUG 4 is fixed in django_client.py (room features now fetched properly).
        This method now correctly uses room.features for feature matching.
        """
        valid_domains = {}
        MAX_ROOMS_PER_COURSE = 10

        for course in cluster:
            enrolled = getattr(course, 'enrolled_students', 0) or len(
                getattr(course, 'student_ids', [])
            )
            required_type = getattr(course, 'room_type_required', 'CLASSROOM') or 'CLASSROOM'
            required_features = getattr(course, 'required_features', []) or []
            # Strip fixed_slot markers from required_features for room matching
            non_fixed_features = [
                f for f in required_features
                if not (isinstance(f, str) and f.startswith('fixed_slot:'))
            ]
            dept_id = getattr(course, 'department_id', None)

            # Primary filter: capacity + type + department + features
            candidate_rooms = [
                room for room in self.rooms
                if (
                    room.capacity >= enrolled * 0.9
                    and room.capacity <= enrolled * 1.5
                    and room.room_type.upper() == required_type.upper()
                    and (
                        getattr(room, 'department_id', None) == dept_id
                        or getattr(room, 'allow_cross_department_usage', True)
                    )
                    and all(
                        f in (getattr(room, 'features', []) or [])
                        for f in non_fixed_features
                    )
                )
            ]

            # Sort by best capacity fit
            candidate_rooms.sort(key=lambda r: abs(r.capacity - enrolled))
            candidate_rooms = candidate_rooms[:MAX_ROOMS_PER_COURSE]

            # Fallback 1: relax features, keep type + capacity
            if not candidate_rooms:
                candidate_rooms = [
                    room for room in self.rooms
                    if (
                        room.capacity >= enrolled * 0.9
                        and room.room_type.upper() == required_type.upper()
                    )
                ][:MAX_ROOMS_PER_COURSE]

            # Fallback 2: relax type, keep capacity only
            if not candidate_rooms:
                candidate_rooms = [
                    room for room in self.rooms
                    if room.capacity >= enrolled * 0.9
                ][:MAX_ROOMS_PER_COURSE]

            # Filter time slots: skip lunch breaks
            valid_slots = [
                ts for ts in self.time_slots
                if not getattr(ts, 'is_lunch', False)
            ]

            for session in range(course.duration):
                valid_pairs = [
                    (ts.slot_id, room.room_id)
                    for ts in valid_slots
                    for room in candidate_rooms
                ]
                valid_domains[(course.course_id, session)] = valid_pairs

        return valid_domains
