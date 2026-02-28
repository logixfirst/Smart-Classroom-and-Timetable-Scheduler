"""
Data Transfer Objects for timetable generation pipeline.

Pure Pydantic models — no ORM imports, no DB dependencies.
These are the shared vocabulary between the data-fetch layer
(django_client.py) and all solver/service layers.

Design principles:
  - All UUIDs stored as str (avoids UUID/str mismatch hell with psycopg2)
  - OfferingDTO is the canonical representation of one course offering
  - EnrollmentDTO carries per-student enrollment metadata needed by
    GraphBuilder (enrollment_type, is_cross_program for partitioning)
"""
from __future__ import annotations

import logging
from typing import List, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class EnrollmentDTO(BaseModel):
    """
    One student's enrollment in one course offering.

    Only ENROLLED status records create scheduling conflicts.
    DROPPED / WITHDRAWN / COMPLETED do NOT constrain the solver.
    """

    student_id: str
    offering_id: str
    enrollment_type: str = "CORE"
    # CORE, DEPARTMENTAL_ELECTIVE, MINOR, OPEN_ELECTIVE,
    # SKILL_ENHANCEMENT, AUDIT, EXTRA_CREDIT
    is_cross_program: bool = False
    section_name: Optional[str] = None
    enrollment_status: str = "ENROLLED"


class OfferingDTO(BaseModel):
    """
    One course offering with all data required for scheduling.

    Key invariants:
      - all_faculty_ids includes primary_faculty_id + co_faculty_ids
      - is_cross_dept_offering() drives partitioner classification
      - student_ids / enrollment_types / is_cross_program_flags are
        parallel lists — index i refers to the same enrollment
    """

    offering_id: str
    course_id: str
    course_code: str = ""
    course_name: str = ""
    primary_faculty_id: str
    co_faculty_ids: List[str] = Field(default_factory=list)
    # ↑ co_faculty_ids were missing from the old pipeline — now explicit
    department_id: str
    semester_number: int = 1
    semester_type: str = "ODD"   # ODD | EVEN | SUMMER
    academic_year: str = ""

    # Session count (= course.duration in the solver)
    duration: int = Field(default=3, ge=1, description="Sessions per week")
    credits: int = Field(default=3, ge=1)

    # Parallel per-student lists (same length)
    student_ids: List[str] = Field(default_factory=list)
    enrollment_types: List[str] = Field(default_factory=list)
    is_cross_program_flags: List[bool] = Field(default_factory=list)

    @property
    def all_faculty_ids(self) -> List[str]:
        """All teachers for this offering (primary + co-faculty, deduped)."""
        seen: set = set()
        result: List[str] = []
        for fid in ([self.primary_faculty_id] + self.co_faculty_ids):
            if fid and fid not in seen:
                seen.add(fid)
                result.append(fid)
        return result

    def is_cross_dept_offering(self) -> bool:
        """
        True if this offering has cross-department participation.

        Logic (in priority order):
          1. Any enrolled student has is_cross_program = True
          2. Any enrolled student has a cross-dept enrollment_type
        """
        cross_types = frozenset({
            "OPEN_ELECTIVE", "MINOR",
            "SKILL_ENHANCEMENT", "AUDIT", "EXTRA_CREDIT",
        })
        if any(self.is_cross_program_flags):
            return True
        return any(t.upper() in cross_types for t in self.enrollment_types)
