"""
TimetableMerger — assembles Phase 2 + Phase 3 outputs into one final solution.

By construction (CommittedResourceRegistry enforces cross-phase exclusion),
no resource conflicts exist between dept timetables or between dept and cross-dept
timetables.  This module simply collects all (course_id, session) → (slot_id, room_id)
mappings and provides a department-filtered view for the new API endpoint.

Responsibilities:
  merge_timetables()       — combine all phase outputs (compatible with saga output format)
  build_department_view()  — filter full solution to one dept's courses (for API endpoint)
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional

from models.timetable_models import Course
from engine.cpsat.dept_solver import DeptTimetableResult

logger = logging.getLogger(__name__)

_GREEDY_SENTINEL = "__UNSCHEDULED__"


def merge_timetables(
    dept_results: List[DeptTimetableResult],
    cross_dept_solution: Dict,
    courses: List[Course],
) -> Dict:
    """
    Merge all phase outputs into a single solution dict.

    Output format: {(course_id, session_idx): (slot_id, room_id)}
    This format is identical to what AdaptiveCPSATSolver.solve_cluster()
    returns — the downstream _persist_results() in saga.py works unchanged.

    Args:
        dept_results:         One DeptTimetableResult per department (Phase 2)
        cross_dept_solution:  Dict from CrossDeptSolver.solve_cross_dept_timetable (Phase 3)
        courses:              All courses (for logging only)

    Returns:
        Merged solution dict ready for _persist_results().
    """
    merged: Dict = {}

    dept_session_count = 0
    for result in dept_results:
        merged.update(result.solution)
        dept_session_count += len(result.solution)

    merged.update(cross_dept_solution)

    scheduled = sum(1 for v in merged.values() if v[0] != _GREEDY_SENTINEL)
    unscheduled = len(merged) - scheduled

    logger.info(
        "[Merger] Timetable merged",
        extra={
            "dept_sessions": dept_session_count,
            "cross_dept_sessions": len(cross_dept_solution),
            "total_sessions": len(merged),
            "scheduled": scheduled,
            "unscheduled_sentinel": unscheduled,
            "total_courses": len(courses),
        },
    )
    return merged


def build_department_view(
    solution: Dict,
    courses: List[Course],
    dept_id: str,
    slot_by_id: Optional[Dict] = None,
) -> List[Dict]:
    """
    Filter the merged solution to entries belonging to dept_id.

    Returns a list of flat dicts suitable for direct JSON serialization
    by the GET /api/timetables/{job_id}/department/{dept_id}/ endpoint.

    Args:
        solution:    Full merged solution from merge_timetables()
        courses:     All Course objects (for metadata lookup)
        dept_id:     Target department ID to filter to
        slot_by_id:  Optional {slot_id: TimeSlot} for human-readable slot info

    Returns:
        List[Dict] with keys: course_id, course_code, course_name, faculty_id,
          slot_id, room_id, session_number, department_id, day, period, start_time
    """
    course_map = {
        c.course_id: c
        for c in courses
        if getattr(c, "department_id", None) == dept_id
    }

    entries: List[Dict] = []
    for (course_id, session_idx), (slot_id, room_id) in solution.items():
        if slot_id == _GREEDY_SENTINEL:
            continue
        course = course_map.get(course_id)
        if course is None:
            continue

        entry: Dict = {
            "course_id": course_id,
            "course_code": getattr(course, "course_code", ""),
            "course_name": getattr(course, "course_name", ""),
            "faculty_id": getattr(course, "faculty_id", ""),
            "slot_id": str(slot_id),
            "room_id": str(room_id) if room_id else "",
            "session_number": session_idx,
            "department_id": dept_id,
        }

        # Enrich with slot metadata when available
        if slot_by_id is not None:
            slot = slot_by_id.get(str(slot_id))
            if slot:
                entry["day"] = getattr(slot, "day", None)
                entry["period"] = getattr(slot, "period", None)
                entry["start_time"] = getattr(slot, "start_time", "")
                entry["end_time"] = getattr(slot, "end_time", "")
                entry["day_of_week"] = getattr(slot, "day_of_week", "")

        entries.append(entry)

    logger.debug(
        "[Merger] Department view built",
        extra={"dept_id": dept_id, "entries": len(entries)},
    )
    return entries
