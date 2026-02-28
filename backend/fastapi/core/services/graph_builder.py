"""
GraphBuilder — builds OfferingConflictGraph from EnrollmentDTO and OfferingDTO lists.

Performance design (for BHU scale: 19,072 students × ≈5 courses):
  Student conflicts:
    Group offerings by student_id → combinations(sorted, 2)
    O(S × K²) where S = unique students, K = avg courses/student ≈ 5
    For BHU: ~19k × 10 = ~190k pairs — well under Python's ~10M/s set insert rate.
    Target: < 2 seconds for 95k enrollments.

  Teacher conflicts:
    Group offerings by teacher_id → combinations(sorted, 2)
    O(T × K²) where T = unique teachers ≈ 2,320, K = avg offerings/teacher ≈ 3
    For BHU: ~20k pairs — negligible.

  NOT O(N²):
    A naive double-loop over all enrollments would be:
    95,000 × 95,000 = 9 billion comparisons ← rejected.
    The groupby approach is O(N × K) ← correct.

No DB calls here. Receives already-fetched DTOs as input.
Pure function — fully testable in isolation.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from itertools import combinations
from typing import List, Set, Tuple

from models.dtos import EnrollmentDTO, OfferingDTO
from models.offering_conflict_graph import OfferingConflictGraph, _canonical

logger = logging.getLogger(__name__)


def build_student_conflict_pairs(
    enrollments: List[EnrollmentDTO],
) -> Set[Tuple[str, str]]:
    """
    Build conflict pairs from student enrollment data.

    Only ENROLLED status creates conflicts.
    DROPPED / WITHDRAWN / COMPLETED are explicitly excluded.

    Algorithm:
      1. Group offering_ids by student_id  (one pass, O(N))
      2. For each student with ≥2 offerings: combinations(sorted, 2)
      3. Add canonical tuple to pairs set
    """
    student_offerings: dict = defaultdict(list)
    for e in enrollments:
        if e.enrollment_status == "ENROLLED":
            student_offerings[e.student_id].append(e.offering_id)

    pairs: Set[Tuple[str, str]] = set()
    multi_course_students = 0
    for offerings in student_offerings.values():
        if len(offerings) < 2:
            continue
        multi_course_students += 1
        for a, b in combinations(sorted(offerings), 2):
            pairs.add(_canonical(a, b))

    logger.info(
        "[GraphBuilder] Student conflict pairs built",
        extra={
            "pairs": len(pairs),
            "enrolled_students": len(student_offerings),
            "students_with_multi_course": multi_course_students,
        },
    )
    return pairs


def build_teacher_conflict_pairs(
    offerings: List[OfferingDTO],
) -> Set[Tuple[str, str]]:
    """
    Build conflict pairs from teacher assignments.

    co_faculty_ids are treated identically to primary_faculty_id —
    all named teachers are busy for the full duration of the offering.

    Algorithm:
      1. Group offering_ids by teacher_id  (one pass over offerings × teachers)
      2. For each teacher with ≥2 offerings: combinations(sorted, 2)
    """
    teacher_offerings: dict = defaultdict(list)
    for o in offerings:
        for fid in o.all_faculty_ids:
            if fid:
                teacher_offerings[fid].append(o.offering_id)

    pairs: Set[Tuple[str, str]] = set()
    for oid_list in teacher_offerings.values():
        if len(oid_list) < 2:
            continue
        for a, b in combinations(sorted(oid_list), 2):
            pairs.add(_canonical(a, b))

    logger.info(
        "[GraphBuilder] Teacher conflict pairs built",
        extra={"pairs": len(pairs), "teachers_tracked": len(teacher_offerings)},
    )
    return pairs


def build_graph(
    enrollments: List[EnrollmentDTO],
    offerings: List[OfferingDTO],
) -> OfferingConflictGraph:
    """
    Build the complete OfferingConflictGraph.

    Union of student-conflict pairs and teacher-conflict pairs.
    Called ONCE per generation job. The resulting graph is passed
    read-only to all solver phases — never rebuilt per constraint check.

    Args:
        enrollments: All active enrollments for this semester (ENROLLED only)
        offerings:   All active offerings for this semester

    Returns:
        Immutable OfferingConflictGraph ready for CP-SAT constraint injection.
    """
    student_pairs = build_student_conflict_pairs(enrollments)
    teacher_pairs = build_teacher_conflict_pairs(offerings)
    all_pairs = student_pairs | teacher_pairs

    logger.info(
        "[GraphBuilder] Full graph built",
        extra={
            "student_pairs": len(student_pairs),
            "teacher_pairs": len(teacher_pairs),
            "total_unique_pairs": len(all_pairs),
            "enrollments_processed": len(enrollments),
            "offerings_processed": len(offerings),
        },
    )
    return OfferingConflictGraph(all_pairs)
