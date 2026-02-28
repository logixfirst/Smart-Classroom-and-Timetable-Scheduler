"""
CommittedResourceRegistry — thread-safe store of already-scheduled assignments.

Populated by Phase 2 (DeptSolvers, one per department) and read by Phase 3
(CrossDeptSolver). Also consumed by CommittedAwareSolver._precompute_valid_domains()
which pre-filters CP-SAT variable domains BEFORE model construction — eliminating
(slot, room) pairs that are already taken, so CP-SAT never wastes search time on
provably infeasible assignments.

Thread safety model:
  - commit_solution() acquires _lock (write path, called once per dept)
  - get_blocked_* methods are lock-free (read path, called thousands of times)
  - Reads return frozenset copies so callers can iterate without holding the lock

One registry per generation job. Created by saga, passed to all phases.
Never reset between phases — each phase adds to it, next phase reads it.
"""
from __future__ import annotations

import logging
import threading
from collections import defaultdict
from typing import Dict, FrozenSet, List, Set, Tuple

from models.timetable_models import Course

logger = logging.getLogger(__name__)

# Sentinel from saga.py — greedy-fallback assignments are NOT committed
_UNSCHEDULED_SENTINEL = "__UNSCHEDULED__"


class CommittedResourceRegistry:
    """
    Thread-safe registry of slots already committed in this generation job.

    Three resource dimensions tracked independently:
      _faculty_slots[faculty_id]  → set of slot_ids where this teacher is busy
      _room_slots[room_id]        → set of slot_ids where this room is taken
      _student_slots[student_id]  → set of slot_ids where this student is busy

    Cross-cluster, cross-dept, and cross-phase resource exclusion is enforced
    by filtering the CP-SAT variable domain against these three sets before
    the model is even built — no constraint is needed for already-committed slots.
    """

    def __init__(self) -> None:
        self._faculty_slots: Dict[str, Set[str]] = defaultdict(set)
        self._room_slots:    Dict[str, Set[str]] = defaultdict(set)
        self._student_slots: Dict[str, Set[str]] = defaultdict(set)
        # Full assignment log for merger phase
        self._assignments:   Dict[str, List[Tuple[str, str]]] = defaultdict(list)
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Write path (locked)
    # ------------------------------------------------------------------

    def commit_solution(
        self,
        solution: Dict[Tuple[str, int], Tuple[str, str]],
        courses: List[Course],
    ) -> None:
        """
        Register all assignments from a solver solution.

        Args:
            solution: {(course_id, session_idx): (slot_id, room_id)}
                      (same format returned by AdaptiveCPSATSolver.solve_cluster)
            courses:  Course objects whose course_id appear in this solution
                      (provides faculty_id and student_ids for indexing)
        """
        course_map = {c.course_id: c for c in courses}
        with self._lock:
            for (course_id, _session), (slot_id, room_id) in solution.items():
                if slot_id == _UNSCHEDULED_SENTINEL:
                    continue  # greedy-fallback: course not scheduled — nothing to commit

                course = course_map.get(course_id)
                if course is None:
                    continue

                s = str(slot_id)

                # Faculty
                fid = getattr(course, "faculty_id", None)
                if fid:
                    self._faculty_slots[str(fid)].add(s)

                # Room
                if room_id:
                    self._room_slots[str(room_id)].add(s)

                # Students
                for sid in getattr(course, "student_ids", []):
                    self._student_slots[str(sid)].add(s)

                # Assignment log
                self._assignments[course_id].append((s, str(room_id) if room_id else ""))

        logger.debug(
            "[Registry] Solution committed",
            extra={
                "course_count": len(course_map),
                "assignments": len(solution),
            },
        )

    # ------------------------------------------------------------------
    # Read path (lock-free — returns frozenset copies)
    # ------------------------------------------------------------------

    def get_blocked_slots_for_faculty(self, faculty_id: str) -> FrozenSet[str]:
        """Slots where faculty_id is already teaching. O(1) lookup."""
        return frozenset(self._faculty_slots.get(str(faculty_id), set()))

    def get_blocked_slots_for_room(self, room_id: str) -> FrozenSet[str]:
        """Slots where room_id is already occupied. O(1) lookup."""
        return frozenset(self._room_slots.get(str(room_id), set()))

    def get_blocked_slots_for_student(self, student_id: str) -> FrozenSet[str]:
        """Slots already occupied by student_id. O(1) lookup."""
        return frozenset(self._student_slots.get(str(student_id), set()))

    def get_all_assignments(self) -> Dict[str, List[Tuple[str, str]]]:
        """
        Shallow copy of all committed course→[(slot, room)] assignments.
        Used by TimetableMerger and for debugging.
        """
        with self._lock:
            return {k: list(v) for k, v in self._assignments.items()}

    def report_stats(self) -> Dict[str, int]:
        """Structured stats for progress logging at each phase boundary."""
        return {
            "faculty_tracked": len(self._faculty_slots),
            "rooms_tracked": len(self._room_slots),
            "students_tracked": len(self._student_slots),
            "total_assignment_entries": sum(
                len(v) for v in self._assignments.values()
            ),
        }

    def __repr__(self) -> str:
        return (
            f"CommittedResourceRegistry("
            f"faculty={len(self._faculty_slots)}, "
            f"rooms={len(self._room_slots)}, "
            f"students={len(self._student_slots)})"
        )
