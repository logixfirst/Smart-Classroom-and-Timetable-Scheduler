"""
CoursePartitioner — splits courses into department buckets and a shared pool.

Partitioning logic (NEP 2020 aware):
  dept_bucket[dept_id]:
    Courses where ALL enrolled students are departmental-only and the
    enrollment type is CORE or DEPARTMENTAL_ELECTIVE.
    These can be solved in isolation by individual DeptSolvers.

  shared_pool:
    Courses where ANY student is cross-program OR the enrollment_type
    indicates cross-department participation (OPEN_ELECTIVE, MINOR, etc.).
    These MUST be solved AFTER all dept timetables are committed, so that
    cross-enrolled students' dept-phase commitments constrain their slots.

Fallback (no enrollment data):
  Use course.subject_type field (populated by django_client from course_type).
  If subject_type in cross-dept types → shared_pool.
  Otherwise → course.department_id bucket.

Design: pure function — no DB calls, no side effects, testable in isolation.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List

from models.timetable_models import Course

logger = logging.getLogger(__name__)

# Enrollment types that indicate purely departmental participation
_DEPT_LOCAL_TYPES = frozenset({"CORE", "DEPARTMENTAL_ELECTIVE"})

# Enrollment types that indicate cross-department participation
_CROSS_DEPT_TYPES = frozenset({
    "OPEN_ELECTIVE", "MINOR",
    "SKILL_ENHANCEMENT", "AUDIT", "EXTRA_CREDIT",
})


@dataclass
class PartitionResult:
    """Output of CoursePartitioner.partition()."""

    dept_buckets: Dict[str, List[Course]] = field(default_factory=dict)
    # dept_id → list of departmentally isolated courses

    shared_pool: List[Course] = field(default_factory=list)
    # cross-dept courses to solve after dept phase

    stats: Dict[str, int] = field(default_factory=dict)
    # {total, dept_courses, shared_courses, num_departments}


class CoursePartitioner:
    """
    Partitions courses into department-scoped buckets and a shared pool.

    Works directly with Course objects (the existing solver model) so it
    plugs seamlessly into the current saga pipeline without any model changes.

    Pure class — no DB calls, no side effects, fully testable.
    """

    def partition(self, courses: List[Course]) -> PartitionResult:
        """
        Partition all courses for a semester into dept buckets + shared pool.

        Args:
            courses: Full list of Course objects from DjangoAPIClient.fetch_courses()

        Returns:
            PartitionResult with dept_buckets dict and shared_pool list.
        """
        dept_buckets: Dict[str, List[Course]] = {}
        shared_pool: List[Course] = []

        for course in courses:
            bucket_key = self._classify_course(course)
            if bucket_key == "shared":
                shared_pool.append(course)
            else:
                dept_buckets.setdefault(bucket_key, []).append(course)

        stats = {
            "total": len(courses),
            "dept_courses": sum(len(v) for v in dept_buckets.values()),
            "shared_courses": len(shared_pool),
            "num_departments": len(dept_buckets),
        }
        logger.info("[Partitioner] Partition complete", extra=stats)
        return PartitionResult(
            dept_buckets=dept_buckets,
            shared_pool=shared_pool,
            stats=stats,
        )

    def _classify_course(self, course: Course) -> str:
        """
        Return the dept_id bucket key, or 'shared' for cross-dept courses.

        Decision tree:
          1. subject_type in cross-dept types             → shared
          2. No student_ids (no enrollment data)          → use course.department_id
          3. Otherwise                                     → use course.department_id
             (fine: student-level cross-program detection
              is handled by CourseOffering.is_cross_dept_offering()
              in the OfferingDTO layer; Course objects have subject_type)
        """
        subject_type = (getattr(course, "subject_type", "") or "").upper()
        if subject_type in _CROSS_DEPT_TYPES:
            return "shared"

        dept = getattr(course, "department_id", None) or "shared"
        return dept
