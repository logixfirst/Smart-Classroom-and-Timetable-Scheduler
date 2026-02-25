"""
CP-SAT Solver - Main Orchestrator
Adaptive solver with progressive relaxation.
Wires in: faculty, room, student (BUG 1 FIX), workload (BUG 2 FIX),
          max-sessions-per-day (MISS 6 FIX), fixed-slots (MISS 2 FIX).
"""
import gc
import logging
import time
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
import psutil
from ortools.sat.python import cp_model

from models.timetable_models import Course, Room, TimeSlot, Faculty
from .strategies import STRATEGIES, select_strategy_for_cluster_size
from .progress import log_cluster_start, log_cluster_success
from .constraints import (
    add_faculty_constraints,
    add_room_constraints,
    add_workload_constraints,
    add_max_sessions_per_day_constraints,
    add_fixed_slot_constraints,
    build_student_course_index,
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
        student_course_index: Dict[str, set] = None,
        num_workers: int = None,
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
        # OPT2: precomputed global index passed in from saga — avoids per-cluster rebuild.
        # If None, falls back to per-cluster construction below (safe degradation).
        self.student_course_index = student_course_index

        # Pre-build slot lookup (str → TimeSlot) used by MISS 6 constraint
        self.slot_by_id: Dict[str, TimeSlot] = {
            str(ts.slot_id): ts for ts in time_slots
        }

        # OPT1: accept explicit worker count for parallel execution (saga controls
        # total thread budget: parallel_clusters × workers_per_cluster ≤ physical_cores).
        # If None (sequential / direct call), auto-detect and cap at 8.
        import multiprocessing
        if num_workers is not None:
            self.num_workers = max(1, num_workers)
        else:
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
        # OPT2: use precomputed global index if available; otherwise build per-cluster.
        if self.student_course_index is not None:
            self.students_of_course = {
                c.course_id: self.student_course_index.get(c.course_id, set())
                for c in cluster
            }
        else:
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

        # STEP 3: Precompute student conflict pairs ONCE before the strategy loop (RF-6).
        # Previously, add_student_constraints() rebuilt the full (student, slot) →
        # [vars] mapping on every strategy retry — O(V×E) per attempt where V is
        # the variable count (~20K) and E is enrolled students per course (~200-900).
        # For clusters that fail strategy 1+2 before landing on Faculty+Room Only,
        # this scan ran 3× for 1.5-4s each = up to 12s wasted per cluster.
        # Precomputing here cuts per-strategy cost to O(actual_conflicts) lookups.
        self._student_conflict_groups = self._precompute_student_conflict_groups()
        self._critical_students = self._compute_critical_students()
        logger.debug(
            "[CP-SAT] Precomputed %d student conflict groups (%d critical students)",
            len(self._student_conflict_groups), len(self._critical_students),
        )

        # OPT4: Skip strategies that are statistically infeasible for this
        # cluster's shape. Large clusters (>20 courses) almost always fail
        # Full Constraints (30s timeout) and Relaxed Student (45s timeout)
        # before reaching Faculty+Room Only — wasting 75s per cluster.
        # select_strategy_for_cluster_size returns the optimal starting strategy;
        # we still cascade forward from that point so no feasible solution is lost.
        _start_strategy = select_strategy_for_cluster_size(len(cluster))
        _start_idx = next(
            (i for i, s in enumerate(STRATEGIES) if s is _start_strategy), 0
        )
        if _start_idx > 0:
            logger.info(
                "[CP-SAT] Cluster size %d → starting at strategy %d (%s) "
                "— skipping %d guaranteed-fail attempts",
                len(cluster), _start_idx + 1,
                _start_strategy['name'], _start_idx
            )

        # ------------------------------------------------------------------
        # PRE-FLIGHT: faculty-overload detection
        #
        # If a faculty member has more sessions assigned (sum of course.duration)
        # than the total number of distinct time slots, CP-SAT will immediately
        # prove INFEASIBLE even under Strategy 4 (faculty-only constraints).
        # Observed in logs: cluster 182 spent ~0.13 s on Strategy 4 before failing,
        # while ~3 previous strategies wasted ~60-90 s total on the same infeasible
        # problem.  Catching this here skips all CP-SAT work and goes straight to
        # the greedy fallback, saving up to ~3 min per run across all such clusters.
        # ------------------------------------------------------------------
        _faculty_sessions: Dict[str, int] = defaultdict(int)
        for _c in cluster:
            _fid = getattr(_c, 'faculty_id', None)
            if _fid:
                _faculty_sessions[_fid] += getattr(_c, 'duration', 1) or 1

        _total_slots = len(self.time_slots)
        _overloaded_faculty = {
            fid: cnt for fid, cnt in _faculty_sessions.items()
            if cnt > _total_slots
        }
        if _overloaded_faculty:
            logger.warning(
                "[CP-SAT] PRE-FLIGHT FAIL: %d faculty member(s) have more sessions "
                "than available time slots (%d slots). Faculty→sessions: %s. "
                "Skipping all strategies → greedy fallback immediately.",
                len(_overloaded_faculty), _total_slots,
                ', '.join(f'{fid}:{cnt}' for fid, cnt in _overloaded_faculty.items())
            )
            return None

        for strategy_idx, strategy in enumerate(STRATEGIES):
            if strategy_idx < _start_idx:
                continue
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

            # OPT3: Build (course_id, session) → [vars] index in one O(N) pass.
            # Previous code did a full variables.items() scan per (course, session)
            # pair — O(N²) with ~500 variables × 36 sessions = 18,000 comparisons
            # per strategy, per cluster. Now O(1) lookup after one build pass.
            session_vars_index: Dict[tuple, list] = defaultdict(list)
            for (c_id, s_idx, _t, _r), var in variables.items():
                session_vars_index[(c_id, s_idx)].append(var)

            # Assignment: each session assigned exactly once
            for course in cluster:
                for session in range(course.duration):
                    sv = session_vars_index.get((course.course_id, session), [])
                    if sv:
                        model.Add(sum(sv) == 1)

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
            # HC4: Student conflict constraints — RF-6 fast path.
            # Conflict pairs precomputed once in solve_cluster(); each strategy
            # attempt here only iterates stored conflict entries via O(1) lookups
            # instead of rescanning all ~20K variables × enrolled students.
            # ------------------------------------------------------------------
            student_priority = strategy.get('student_priority', 'ALL')
            self._apply_student_constraints_fast(model, variables, student_priority)

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

            # Reduce workers under memory pressure before solving
            mem_percent = psutil.virtual_memory().percent
            if mem_percent > 85:
                reduced_workers = max(2, self.num_workers // 2)
                solver.parameters.num_search_workers = reduced_workers
                if reduced_workers < self.num_workers:
                    # Actually reducing — worth a WARNING so ops can see it
                    logger.warning(
                        f"[MEMORY] RAM {mem_percent:.1f}% — reducing CP-SAT workers "
                        f"{self.num_workers} → {reduced_workers}"
                    )
                else:
                    # Already at minimum (2→2): log at DEBUG to avoid log spam.
                    # This fires every cluster when system RAM sits above 85% —
                    # a WARNING here drowns out real signals in the log stream.
                    logger.debug(
                        f"[MEMORY] RAM {mem_percent:.1f}% — already at minimum "
                        f"{reduced_workers} workers (no reduction possible)"
                    )

            # Solve
            logger.info(f"[CP-SAT] Starting solver with timeout {strategy['timeout']}s...")
            status = solver.Solve(model)

            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                solution = {}
                for (course_id, session, t_slot_id, room_id), var in variables.items():
                    if solver.Value(var):
                        solution[(course_id, session)] = (t_slot_id, room_id)

                n_assignments = len(solution)

                # Explicit C++ memory release — OR-Tools allocates native heap.
                # Python GC cannot see these objects; must delete explicitly.
                # Do this BEFORE logging to free memory as early as possible.
                del solver
                del model
                del variables
                gc.collect()

                logger.info(f"[CP-SAT] Solution found: {n_assignments} assignments")
                return solution

            logger.warning(f"[CP-SAT] No solution with strategy: {strategy['name']}")

            # Release on failure too — accumulation across failed strategies wastes RAM
            del solver
            del model
            del variables
            gc.collect()

            return None

        except Exception as e:
            logger.error(f"[CP-SAT] Strategy failed: {e}")
            # Best-effort cleanup on exception path
            try:
                del solver
            except NameError:
                pass
            try:
                del model
            except NameError:
                pass
            gc.collect()
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

    # ------------------------------------------------------------------
    # RF-6: Precomputed student conflict helpers
    # ------------------------------------------------------------------

    def _precompute_student_conflict_groups(self) -> Dict[tuple, list]:
        """
        One O(C×S×R×E) pass over valid_domains to find all (student, t_slot)
        pairs that have courses competing for the same slot.

        C = courses, S = sessions/course, R = rooms/slot, E = enrolled students.
        Replaces the repeated O(V×E) scan inside add_student_constraints() that
        was running once per strategy attempt (up to 4×) per cluster.

        Returns:
            {(student_id, t_slot_id): [(course_id, session, t_slot_id, room_id), ...]}
            Only entries with 2+ elements are stored (actual conflicts).
        """
        groups: Dict[tuple, list] = defaultdict(list)
        for (course_id, session), pairs in self.valid_domains.items():
            students = self.students_of_course.get(course_id, set())
            if not students:
                continue
            for (t_slot_id, r_id) in pairs:
                for student_id in students:
                    groups[(student_id, t_slot_id)].append(
                        (course_id, session, t_slot_id, r_id)
                    )
        # Discard non-conflicting entries early to reduce memory
        return {k: v for k, v in groups.items() if len(v) > 1}

    def _compute_critical_students(self) -> set:
        """
        Students enrolled in 5+ courses within this cluster.
        Precomputed once so CRITICAL-mode strategy attempts pay O(1) membership test.
        """
        counts: Dict[str, int] = defaultdict(int)
        for students in self.students_of_course.values():
            for sid in students:
                counts[sid] += 1
        return {sid for sid, n in counts.items() if n >= 5}

    def _apply_student_constraints_fast(
        self,
        model,
        variables: Dict,
        student_priority: str,
    ) -> None:
        """
        Apply HC4 student no-double-booking constraints using precomputed pairs.

        RF-6 fast path: instead of scanning all variables × enrolled students,
        iterate self._student_conflict_groups (computed once in solve_cluster)
        and do O(1) dict lookups into the per-strategy `variables` dict.

        Args:
            student_priority: "ALL" | "CRITICAL" | "NONE"
        """
        if student_priority == "NONE":
            logger.warning("[Constraints] Student constraints DISABLED (NONE mode)")
            return

        critical_set = self._critical_students if student_priority == "CRITICAL" else None
        if student_priority == "CRITICAL":
            logger.info(
                "[Constraints] CRITICAL mode: constraining %d students with 5+ courses",
                len(self._critical_students),
            )

        count = 0
        for (student_id, t_slot_id), domain_keys in self._student_conflict_groups.items():
            if critical_set is not None and student_id not in critical_set:
                continue
            vars_list = [variables[dk] for dk in domain_keys if dk in variables]
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)
                count += 1

        mode_label = student_priority
        logger.info(
            "[Constraints] Added %d student conflict constraints "
            "(HC4 — no student double-booking, mode=%s)",
            count, mode_label,
        )
