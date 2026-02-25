"""
Genetic Algorithm - Fitness Evaluation
BUG 7 FIX: t_slot_id is a str; cast to int before arithmetic.
Now evaluates 4 metrics:
  1. Faculty preferences (35%)
  2. Room utilization (25%)
  3. Peak spreading (25%)
  4. Student conflict penalty (15%)  ← NEW: catches any conflicts GA introduces
"""
import logging
from typing import Dict, List
from collections import defaultdict

from models.timetable_models import Course, Faculty, Room, TimeSlot

logger = logging.getLogger(__name__)


def evaluate_fitness_simple(
    solution: Dict,
    courses: List[Course],
    faculty: Dict[str, Faculty],
    time_slots: List[TimeSlot],
    rooms: List[Room],
    weights: Dict = None
) -> float:
    """
    Fitness evaluation with 4 metrics.

    BUG 7 FIX: slot_id was declared as str in the Pydantic model but
    was being used with % (modulo) as if it were an int, causing a
    TypeError at runtime. Now casts to int safely before arithmetic.

    Returns:
        float score (higher = better). Returns 0.0 on any crash.
    """
    try:
        score = 0.0

        # Merge caller-supplied weights with defaults
        _w = {'faculty': 0.35, 'room': 0.25, 'spread': 0.25, 'student': 0.15}
        if weights:
            _w.update(weights)

        # Build lookup maps once (avoids repeated list scans)
        slot_by_id: Dict[str, TimeSlot] = {str(ts.slot_id): ts for ts in time_slots}
        room_capacity_map: Dict[str, int] = {r.room_id: r.capacity for r in rooms}

        # Metric 1: Faculty preferences
        faculty_score = _evaluate_faculty_preferences(solution, courses, slot_by_id)
        score += _w['faculty'] * faculty_score

        # Metric 2: Room utilization
        room_score = _evaluate_room_utilization(solution, courses, room_capacity_map)
        score += _w['room'] * room_score

        # Metric 3: Peak spreading
        spread_score = _evaluate_peak_spreading(solution, courses)
        score += _w['spread'] * spread_score

        # Metric 4: Student conflict penalty
        # Even though CP-SAT enforces HC4, GA mutations can temporarily violate it.
        # This metric penalises any violations GA introduces so evolution pressure
        # steers away from student double-booking.
        student_score = _evaluate_student_conflicts(solution, courses)
        score += _w['student'] * student_score

        return score

    except Exception as e:
        logger.error(f"[GA-Fitness] Evaluation failed: {e}")
        return 0.0


def _safe_slot_int(t_slot_id) -> int:
    """
    BUG 7 FIX: safely convert slot_id to int.
    slot_id is declared as str in TimeSlot Pydantic model.
    """
    try:
        return int(t_slot_id)
    except (TypeError, ValueError):
        return 0


def _evaluate_faculty_preferences(
    solution: Dict,
    courses: List[Course],
    slot_by_id: Dict[str, "TimeSlot"]
) -> float:
    """
    Faculty preference scoring (higher = better).

    Uses the TimeSlot.period field (0-indexed period within a day) to
    determine whether a slot is early-morning or late-evening.
    Penalise: period 0 (first slot of day) and last two periods of day.
    Reward: mid-morning and early-afternoon periods (1–5).

    BUG 7 FIX: Previously did `t_slot_id % 10` on a str, which crashes.
    Now looks up the TimeSlot object by ID and uses .period (int).
    """
    score = 100.0

    for course in courses:
        for session in range(course.duration):
            key = (course.course_id, session)
            if key not in solution:
                continue

            t_slot_id, _ = solution[key]
            slot = slot_by_id.get(str(t_slot_id))

            if slot is None:
                continue

            period = slot.period  # 0-indexed int, always valid

            # Penalise very early (period 0 = first class of day)
            if period == 0:
                score -= 5.0
            # Penalise late periods (period 7+ in a 9-period day)
            elif period >= 7:
                score -= 3.0
            # Bonus for prime teaching hours (periods 1–5)
            elif 1 <= period <= 5:
                score += 1.0

    return max(0.0, score)


def _evaluate_room_utilization(
    solution: Dict,
    courses: List[Course],
    room_capacity_map: Dict[str, int]
) -> float:
    """
    Room utilization scoring (higher = better).
    Prefer rooms with capacity close to enrolled students.
    Penalise rooms that are way too big (wasted capacity).
    """
    score = 100.0

    for course in courses:
        for session in range(course.duration):
            key = (course.course_id, session)
            if key not in solution:
                continue

            _, room_id = solution[key]
            room_capacity = room_capacity_map.get(room_id, 100)
            enrolled = getattr(course, 'enrolled_students', 0) or len(
                getattr(course, 'student_ids', [])
            )

            if enrolled == 0:
                continue

            # Heavy penalty if room is way too big (>2x enrolled students)
            if room_capacity > enrolled * 2:
                score -= 5.0
            # Small penalty if slightly oversized (1.5x–2x)
            elif room_capacity > enrolled * 1.5:
                score -= 2.0
            # Bonus if room is appropriately sized (1.0x–1.5x)
            elif enrolled <= room_capacity <= enrolled * 1.5:
                score += 2.0

    return max(0.0, score)


def _evaluate_peak_spreading(solution: Dict, courses: List[Course]) -> float:
    """
    Peak spreading scoring (higher = better).
    Prefer an even distribution of sessions across time slots.
    Penalise heavy clustering of many sessions in one slot.
    """
    score = 100.0

    # Count sessions per time slot
    slot_counts: Dict[str, int] = defaultdict(int)
    for course in courses:
        for session in range(course.duration):
            key = (course.course_id, session)
            if key in solution:
                t_slot_id, _ = solution[key]
                slot_counts[str(t_slot_id)] += 1

    if slot_counts:
        max_count = max(slot_counts.values())
        avg_count = sum(slot_counts.values()) / len(slot_counts)

        # Heavy penalty for severely overloaded slots (>2× average)
        if max_count > avg_count * 2:
            score -= (max_count - avg_count * 2) * 10.0

    return max(0.0, score)


def _evaluate_student_conflicts(solution: Dict, courses: List[Course]) -> float:
    """
    Student conflict scoring (higher = better, 100 = zero conflicts).

    BUG 3 FIX: GA mutations can break CP-SAT's student conflict guarantees.
    This metric penalises any (student, slot) collisions introduced during
    crossover/mutation so evolutionary pressure steers away from them.
    """
    score = 100.0

    # Build: (student_id, t_slot_id) → count of sessions assigned
    student_slot_count: Dict[tuple, int] = defaultdict(int)

    for course in courses:
        student_ids = getattr(course, 'student_ids', [])
        for session in range(course.duration):
            key = (course.course_id, session)
            if key not in solution:
                continue
            t_slot_id, _ = solution[key]
            for student_id in student_ids:
                student_slot_count[(student_id, str(t_slot_id))] += 1

    # Penalise each student double-booking
    conflicts = sum(
        cnt - 1 for cnt in student_slot_count.values() if cnt > 1
    )
    score -= conflicts * 20.0  # Steep penalty per conflict

    return max(0.0, score)
