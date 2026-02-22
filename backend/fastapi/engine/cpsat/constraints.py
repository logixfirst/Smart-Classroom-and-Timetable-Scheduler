"""
CP-SAT Constraint Building
Handles faculty, room, student, and workload constraints
Following Google/Meta standards: One file = constraint logic
"""
import logging
from ortools.sat.python import cp_model
from typing import List, Dict, Optional
from collections import defaultdict
from models.timetable_models import Course

logger = logging.getLogger(__name__)


def add_faculty_constraints(
    model: cp_model.CpModel,
    variables: Dict,
    cluster: List[Course],
    faculty_of_course: Dict[str, str]
) -> None:
    """
    Add faculty conflict constraints (HC1)
    Ensures a faculty member teaches only one course at a time
    Uses index for O(1) faculty lookup instead of O(N) scan
    """
    try:
        faculty_schedule = defaultdict(list)

        # Use index instead of scanning cluster for each variable
        for (c_id, s_idx, t_slot_id, r_id), var in variables.items():
            faculty_id = faculty_of_course.get(c_id)
            if faculty_id:
                faculty_schedule[(faculty_id, t_slot_id)].append(var)

        conflict_count = 0
        for (faculty_id, t_slot_id), vars_list in faculty_schedule.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)
                conflict_count += 1

        logger.info(f"[Constraints] Added {conflict_count} faculty conflict constraints")

    except Exception as e:
        logger.error(f"[Constraints] Faculty constraints failed: {e}")
        raise


def add_room_constraints(model: cp_model.CpModel, variables: Dict, cluster: List[Course]) -> None:
    """
    Add room capacity constraints (HC2)
    Ensures only one course per room per time slot
    Optimized: direct iteration over variables (no cluster scan)
    """
    try:
        room_schedule = defaultdict(list)

        # Direct iteration - no cluster scan needed
        for (c_id, s_idx, t_slot_id, r_id), var in variables.items():
            room_schedule[(t_slot_id, r_id)].append(var)

        conflict_count = 0
        for (t_slot_id, r_id), vars_list in room_schedule.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)
                conflict_count += 1

        logger.info(f"[Constraints] Added {conflict_count} room conflict constraints")

    except Exception as e:
        logger.error(f"[Constraints] Room constraints failed: {e}")
        raise


def add_workload_constraints(
    model: cp_model.CpModel,
    variables: Dict,
    cluster: List[Course],
    faculty_of_course: Dict[str, str],
    faculty_dict: Dict,
    slots_per_day: int = 9,
    working_days: int = 6
) -> None:
    """
    Add faculty workload constraints (HC3)
    Ensures no faculty member exceeds their max_hours_per_week.

    Each scheduled session = 1 hour. We cap total sessions per faculty
    across the full week to faculty.max_hours_per_week.

    BUG 2 FIX: This was removed citing O(N²) issues. Re-introduced with
    an index-based approach that is O(N) in variable count.
    """
    try:
        # Group all session variables by faculty
        faculty_vars: Dict[str, list] = defaultdict(list)

        for (c_id, s_idx, t_slot_id, r_id), var in variables.items():
            faculty_id = faculty_of_course.get(c_id)
            if faculty_id:
                faculty_vars[faculty_id].append(var)

        workload_count = 0
        for faculty_id, vars_list in faculty_vars.items():
            fac = faculty_dict.get(faculty_id)
            max_hours = fac.max_hours_per_week if fac else 18  # Default 18h/week

            if len(vars_list) > max_hours:
                # At most max_hours sessions can be assigned to this faculty
                model.Add(sum(vars_list) <= max_hours)
                workload_count += 1
                logger.debug(
                    f"[Constraints] Faculty {faculty_id}: "
                    f"{len(vars_list)} vars, max={max_hours}h/week"
                )

        logger.info(
            f"[Constraints] Added {workload_count} faculty workload constraints "
            f"(HC3 — max hours/week)"
        )

    except Exception as e:
        logger.error(f"[Constraints] Workload constraints failed: {e}")
        # Non-fatal: log and continue rather than failing the whole cluster
        logger.warning("[Constraints] Continuing without workload constraints")


def add_student_constraints(
    model: cp_model.CpModel,
    variables: Dict,
    cluster: List[Course],
    student_priority: str = "ALL",
    students_of_course: Dict[str, set] = None
) -> int:
    """
    Add student conflict constraints (HC4).

    BUG 1 FIX: Previous implementation was 100% skipped (both branches
    returned 0 with a TODO comment). Now fully implemented.

    Ensures no student is scheduled in two different classes at the same
    time slot. Uses an index-based approach:
      student_schedule[(student_id, t_slot_id)] = [var1, var2, ...]
    then constrains sum <= 1 for any group with >1 variable.

    Args:
        student_priority:
            "ALL"      → constrain every student (default, correct)
            "CRITICAL" → only students enrolled in 5+ courses this cluster
            "NONE"     → skip (emergency performance mode only)

    Returns:
        Number of constraints added
    """
    try:
        students_of_course = students_of_course or {}

        if student_priority == "NONE":
            logger.warning("[Constraints] Student constraints DISABLED (NONE mode)")
            return 0

        # Determine which students to constrain
        if student_priority == "CRITICAL":
            # Only constrain students enrolled in 5+ courses in this cluster
            student_course_count: Dict[str, int] = defaultdict(int)
            for student_set in students_of_course.values():
                for sid in student_set:
                    student_course_count[sid] += 1
            target_students = {
                sid for sid, cnt in student_course_count.items() if cnt >= 5
            }
            logger.info(
                f"[Constraints] CRITICAL mode: constraining "
                f"{len(target_students)} students with 5+ courses"
            )
        else:
            # ALL mode — constrain every student
            target_students = None  # None = include all

        # Build index: (student_id, t_slot_id) → list of CP-SAT vars
        student_schedule: Dict[tuple, list] = defaultdict(list)

        for (c_id, s_idx, t_slot_id, r_id), var in variables.items():
            enrolled_students = students_of_course.get(c_id, set())
            for student_id in enrolled_students:
                if target_students is None or student_id in target_students:
                    student_schedule[(student_id, t_slot_id)].append(var)

        # Add sum <= 1 constraint for every (student, slot) with conflicts
        conflict_count = 0
        for (student_id, t_slot_id), vars_list in student_schedule.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)
                conflict_count += 1

        logger.info(
            f"[Constraints] Added {conflict_count} student conflict constraints "
            f"(HC4 — no student double-booking, mode={student_priority})"
        )
        return conflict_count

    except Exception as e:
        logger.error(f"[Constraints] Student constraints failed: {e}")
        return 0


def add_max_sessions_per_day_constraints(
    model: cp_model.CpModel,
    variables: Dict,
    cluster: List[Course],
    time_slots_by_id: Dict,
    max_sessions_per_day: int = 2
) -> None:
    """
    Add per-course per-day session limit (SIH requirement: 'Maximum number
    of classes per day').

    MISS 6 FIX: Previously missing. Now constrains each course to at most
    `max_sessions_per_day` sessions on any single day of the week.

    Args:
        time_slots_by_id: Dict mapping slot_id (str) → TimeSlot object
        max_sessions_per_day: Default 2 (most universities allow 1–2 sessions
                              of the same course per day maximum).
    """
    try:
        # Group vars by (course_id, day_of_week)
        # Key: (c_id, day_int) → list of vars
        course_day_vars: Dict[tuple, list] = defaultdict(list)

        for (c_id, s_idx, t_slot_id, r_id), var in variables.items():
            slot = time_slots_by_id.get(str(t_slot_id))
            if slot is not None:
                course_day_vars[(c_id, slot.day)].append(var)

        constraint_count = 0
        for (c_id, day), vars_list in course_day_vars.items():
            if len(vars_list) > max_sessions_per_day:
                model.Add(sum(vars_list) <= max_sessions_per_day)
                constraint_count += 1

        logger.info(
            f"[Constraints] Added {constraint_count} max-sessions-per-day constraints "
            f"(SIH HC5 — max {max_sessions_per_day} sessions/course/day)"
        )

    except Exception as e:
        logger.error(f"[Constraints] Max-sessions-per-day constraints failed: {e}")
        logger.warning("[Constraints] Continuing without per-day session limits")


def add_fixed_slot_constraints(
    model: cp_model.CpModel,
    variables: Dict,
    cluster: List[Course]
) -> int:
    """
    Add hard constraints for courses with pre-fixed time slots (SIH requirement:
    'Special classes that have fixed slots in timetable').

    MISS 2 FIX: Previously missing. Courses that have a `fixed_slot_id` set
    must be scheduled ONLY at that specific time slot.

    The Course model uses `required_features` list. A fixed slot is indicated
    by a feature string starting with 'fixed_slot:' followed by the slot_id,
    e.g. 'fixed_slot:5' means the course must be at slot_id=5.

    Returns:
        Number of fixed-slot constraints added
    """
    try:
        fixed_count = 0

        for course in cluster:
            # Check for fixed slot marker in required_features
            fixed_slot_id = None
            for feature in getattr(course, 'required_features', []):
                if isinstance(feature, str) and feature.startswith('fixed_slot:'):
                    fixed_slot_id = feature.split(':', 1)[1].strip()
                    break

            if fixed_slot_id is None:
                continue  # No fixed slot for this course

            logger.info(
                f"[Constraints] Course {course.course_code} has fixed slot: {fixed_slot_id}"
            )

            for session in range(course.duration):
                # Find all variables for this course+session
                session_vars_by_slot: Dict[str, list] = defaultdict(list)
                for (c_id, s_idx, t_slot_id, r_id), var in variables.items():
                    if c_id == course.course_id and s_idx == session:
                        session_vars_by_slot[str(t_slot_id)].append(var)

                # Force variables NOT in the fixed slot to be 0
                for t_slot_id_key, vars_list in session_vars_by_slot.items():
                    if t_slot_id_key != str(fixed_slot_id):
                        for var in vars_list:
                            model.Add(var == 0)
                    # Variables in the fixed slot: sum must equal 1 (one room chosen)
                    else:
                        if vars_list:
                            model.Add(sum(vars_list) == 1)
                        else:
                            logger.warning(
                                f"[Constraints] Course {course.course_code} session {session}: "
                                f"no variables at fixed slot {fixed_slot_id}. "
                                f"Check room availability at this slot."
                            )

                fixed_count += 1

        logger.info(
            f"[Constraints] Added fixed-slot constraints for {fixed_count} sessions "
            f"(SIH HC6 — special class fixed slots)"
        )
        return fixed_count

    except Exception as e:
        logger.error(f"[Constraints] Fixed-slot constraints failed: {e}")
        return 0
