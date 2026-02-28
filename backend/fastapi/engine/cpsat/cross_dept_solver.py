"""
CrossDeptSolver — schedules shared-pool (cross-dept) courses after all department
timetables are committed to the CommittedResourceRegistry.

Design principle:
  Phase 3 consumes the FULLY POPULATED registry from Phase 2.
  CommittedAwareSolver filters every (slot, room) pair against the entire
  registry — so cross-dept courses automatically respect:
    - Every dept-phase faculty commitment         (no double-booking)
    - Every dept-phase room commitment            (no room clash)
    - Every dept-phase student slot commitment    (no student double-booking)

  Two cross-dept courses that share students or teachers still conflict with
  each other — CP-SAT's HC1/HC4 student/teacher constraints handle that
  within each Louvain cluster exactly as they do in the dept phase.

No new logic needed here beyond calling CommittedAwareSolver — the registry
pre-filters make Phase 3 structurally identical to Phase 2 but with a fuller
registry.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List

from models.timetable_models import Course, Faculty, Room, TimeSlot
from engine.cpsat.committed_registry import CommittedResourceRegistry
from engine.cpsat.dept_solver import CommittedAwareSolver, _GREEDY_SENTINEL

logger = logging.getLogger(__name__)


def solve_cross_dept_timetable(
    shared_pool: List[Course],
    rooms: List[Room],
    faculty: Dict[str, Faculty],
    time_slots: List[TimeSlot],
    committed_registry: CommittedResourceRegistry,
    job_id: str = "",
    redis_client=None,
) -> Dict:
    """
    Schedule cross-department courses after all dept timetables are committed.

    Args:
        shared_pool:        Courses classified as cross-dept by CoursePartitioner
        rooms:              Full room catalog
        faculty:            Full faculty dict
        time_slots:         Universal time slot grid
        committed_registry: FULLY POPULATED registry (all dept-phase assignments in)
        job_id:             For structured logging
        redis_client:       For progress pushes

    Returns:
        solution dict: {(course_id, session_idx): (slot_id, room_id)}
        Same format as AdaptiveCPSATSolver output — compatible with TimetableMerger.
    """
    t0 = time.perf_counter()

    if not shared_pool:
        logger.info(
            "[CrossDeptSolver] No shared-pool courses — Phase 3 skipped",
            extra={"job_id": job_id},
        )
        return {}

    from engine.cpsat.constraints import build_student_course_index
    from engine.stage1_clustering import LouvainClusterer

    student_index = build_student_course_index(shared_pool)

    solver = CommittedAwareSolver(
        courses=shared_pool,
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
        clusters = list(clusterer.cluster_courses(shared_pool).values())
    except Exception as exc:
        logger.warning(
            "[CrossDeptSolver] Clustering failed — chunked fallback",
            extra={"error": str(exc), "job_id": job_id},
        )
        chunk = 10
        clusters = [shared_pool[i:i + chunk] for i in range(0, len(shared_pool), chunk)]

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

    elapsed = time.perf_counter() - t0
    solved = sum(1 for v in solution.values() if v[0] != _GREEDY_SENTINEL)
    logger.info(
        "[CrossDeptSolver] Done",
        extra={
            "job_id": job_id,
            "shared_courses": len(shared_pool),
            "solved_sessions": solved,
            "total_sessions": len(solution),
            "elapsed_s": round(elapsed, 2),
        },
    )
    return solution
