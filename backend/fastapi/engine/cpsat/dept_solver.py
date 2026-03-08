"""
DeptSolver — department-scoped CP-SAT solver that respects already-committed slots.

Architecture:
  CommittedAwareSolver subclasses AdaptiveCPSATSolver and ONLY overrides
  _precompute_valid_domains().  Every other method (strategies, HC1-HC6,
  student constraints, greedy fallback) is inherited unchanged.

  solver.py is NOT touched — this is additive-only code.

  The override filters each (slot, room) pair in the inherited domain against
  the CommittedResourceRegistry BEFORE the CP-SAT model is built:
    - Room already booked at slot?   → remove
    - Faculty already teaching at slot? → remove
    - Any student already in class at slot? → remove

  CP-SAT then sees a reduced, feasibility-guaranteed domain.

  DeptTimetableResult wraps the output for the merger and registry phases.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from models.timetable_models import Course, Faculty, Room, TimeSlot
from engine.cpsat.solver import AdaptiveCPSATSolver
from engine.cpsat.committed_registry import CommittedResourceRegistry

logger = logging.getLogger(__name__)

_GREEDY_SENTINEL = "__UNSCHEDULED__"


# ---------------------------------------------------------------------------
# Result data class
# ---------------------------------------------------------------------------

@dataclass
class DeptTimetableResult:
    """Output of one department-scoped solve pass."""

    dept_id: str
    solution: Dict                   # {(course_id, session_idx): (slot_id, room_id)}
    solved_count: int                # sessions successfully placed
    failed_count: int                # sessions that fell back to sentinel
    elapsed_seconds: float
    courses: List[Course] = field(default_factory=list)


# ---------------------------------------------------------------------------
# CommittedAwareSolver — override domain filter only
# ---------------------------------------------------------------------------

class CommittedAwareSolver(AdaptiveCPSATSolver):
    """
    AdaptiveCPSATSolver that pre-filters variable domains against the registry.

    Only _precompute_valid_domains() is overridden.
    All strategies, HC1-HC6 constraints, and greedy fallback are inherited.
    """

    def __init__(
        self,
        *args,
        registry: CommittedResourceRegistry,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self._registry = registry

    def _precompute_valid_domains(self, cluster: List[Course]) -> Dict:
        """
        Inherit parent domains then remove pairs blocked by the registry.

        For each (course_id, session) key:
          Remove (slot_id, room_id) if:
            room is already committed at slot_id
            faculty is already committed at slot_id
            any enrolled student is already committed at slot_id
        """
        domains = super()._precompute_valid_domains(cluster)

        # course_by_id is set by solve_cluster() before _precompute_valid_domains
        # is called — safe to access here.
        filtered: Dict = {}

        for (course_id, session), pairs in domains.items():
            course = self.course_by_id.get(course_id)
            if course is None:
                filtered[(course_id, session)] = pairs
                continue

            fid = getattr(course, "faculty_id", None)
            blocked_faculty = (
                self._registry.get_blocked_slots_for_faculty(fid)
                if fid else frozenset()
            )
            student_ids = getattr(course, "student_ids", [])

            kept = []
            for (slot_id, room_id) in pairs:
                s = str(slot_id)
                # Teacher check (O(1))
                if s in blocked_faculty:
                    continue
                # Room check (O(1))
                if s in self._registry.get_blocked_slots_for_room(str(room_id)):
                    continue
                # Student check (O(students_per_course), short-circuits)
                if any(
                    s in self._registry.get_blocked_slots_for_student(str(sid))
                    for sid in student_ids
                ):
                    continue
                kept.append((slot_id, room_id))

            filtered[(course_id, session)] = kept

        return filtered


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def solve_department_timetable(
    dept_id: str,
    courses: List[Course],
    rooms: List[Room],
    faculty: Dict[str, Faculty],
    time_slots: List[TimeSlot],
    committed_registry: CommittedResourceRegistry,
    job_id: str = "",
    redis_client=None,
) -> DeptTimetableResult:
    """
    Solve one department's timetable respecting already-committed resources.

    Internally clusters the dept's courses (Louvain) and runs
    CommittedAwareSolver per cluster, which inherits all CP-SAT strategies
    from AdaptiveCPSATSolver including greedy fallback.

    Args:
        dept_id:            Department identifier (for logging + result tagging)
        courses:            Course objects belonging to this department
        rooms:              Full room catalog (domain filtering narrows to valid)
        faculty:            Full faculty dict from saga data['faculty']
        time_slots:         Universal 54-slot grid
        committed_registry: Already-committed slots (populated by earlier depts)
        job_id:             For structured logging
        redis_client:       For per-dept progress pushes (optional)

    Returns:
        DeptTimetableResult with solution dict and stats.
    """
    t0 = time.perf_counter()

    logger.info(
        "[DeptSolver] START dept_id=%s  courses=%d  rooms=%d  slots=%d  job_id=%s",
        dept_id, len(courses), len(rooms), len(time_slots), job_id,
    )

    if not courses:
        logger.info(
            "[DeptSolver] No courses for dept -- skipping",
            extra={"dept_id": dept_id, "job_id": job_id},
        )
        return DeptTimetableResult(
            dept_id=dept_id,
            solution={}, solved_count=0, failed_count=0, elapsed_seconds=0.0,
        )

    from engine.cpsat.constraints import build_student_course_index
    from engine.stage1_clustering import LouvainClusterer

    student_index = build_student_course_index(courses)

    # Create solver once; cluster the dept's courses internally
    solver = CommittedAwareSolver(
        courses=courses,
        rooms=rooms,
        time_slots=time_slots,
        faculty=faculty,
        registry=committed_registry,
        job_id=job_id,
        redis_client=redis_client,
        student_course_index=student_index,
    )

    try:
        clusterer = LouvainClusterer(target_cluster_size=10)
        clusters = list(clusterer.cluster_courses(courses).values())
    except Exception as exc:
        logger.warning(
            "[DeptSolver] Clustering failed — single cluster fallback",
            extra={"dept_id": dept_id, "error": str(exc)},
        )
        chunk = 10
        clusters = [courses[i:i + chunk] for i in range(0, len(courses), chunk)]

    solution: Dict = {}
    for cluster in clusters:
        result = solver.solve_cluster(cluster)
        if result:
            solution.update(result)
        else:
            fb_room = rooms[0].room_id if rooms else None
            for c in cluster:
                for s in range(max(c.duration, 1)):
                    solution[(c.course_id, s)] = (_GREEDY_SENTINEL, fb_room)

    solved = sum(1 for v in solution.values() if v[0] != _GREEDY_SENTINEL)
    failed = len(solution) - solved
    elapsed = time.perf_counter() - t0

    logger.info(
        "[DeptSolver] Done",
        extra={
            "dept_id": dept_id, "job_id": job_id,
            "solved": solved, "failed": failed,
            "elapsed_s": round(elapsed, 2),
            "clusters": len(clusters),
        },
    )
    return DeptTimetableResult(
        dept_id=dept_id,
        solution=solution,
        solved_count=solved,
        failed_count=failed,
        elapsed_seconds=elapsed,
        courses=courses,
    )
