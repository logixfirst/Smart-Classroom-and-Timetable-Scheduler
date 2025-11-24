"""
Timetable Data Models - NEP 2020 Compliant
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum


class CourseType(str, Enum):
    LECTURE = "lecture"
    LAB = "lab"
    TUTORIAL = "tutorial"
    SEMINAR = "seminar"


class Course(BaseModel):
    """Course Characterization (NEP 2020-Specific)"""
    course_id: str
    course_code: str
    course_name: str
    faculty_id: str
    student_ids: List[str]
    batch_ids: List[str]
    duration: int = Field(..., ge=1, le=4, description="Sessions per week")
    type: CourseType
    credits: int = Field(..., ge=1, le=4, description="NEP 2020 credit structure")
    required_features: List[str] = Field(default_factory=list)
    department_id: str
    subject_type: str = Field(default="core", description="core, elective, or open_elective")


class Faculty(BaseModel):
    """Faculty Member"""
    faculty_id: str
    name: str
    department_id: str
    max_load: int = Field(default=24, description="Max hours per week")
    available_slots: List[int] = Field(default_factory=list)
    preferred_slots: Dict[int, float] = Field(default_factory=dict)


class Room(BaseModel):
    """Room with heterogeneous capacities and features"""
    room_id: str
    room_code: str
    capacity: int
    features: List[str] = Field(default_factory=list)
    building: Optional[str] = None


class TimeSlot(BaseModel):
    """Time Slot"""
    slot_id: str
    day: int = Field(..., ge=0, le=4, description="0=Mon, 4=Fri")
    period: int = Field(..., ge=0, le=9, description="Period number")
    start_time: str
    end_time: str


class Student(BaseModel):
    """Student"""
    student_id: str
    name: str
    batch_id: str
    enrolled_course_ids: List[str]
    program_id: str


class Batch(BaseModel):
    """Batch/Section"""
    batch_id: str
    batch_code: str
    department_id: str
    program_id: str
    semester: int
    student_count: int


class TimetableEntry(BaseModel):
    """Single timetable entry (one session)"""
    course_id: str
    course_code: str
    course_name: str
    faculty_id: str
    room_id: str
    time_slot_id: str
    session_number: int
    day: int
    start_time: str
    end_time: str
    student_ids: List[str]
    batch_ids: List[str]


class GenerationRequest(BaseModel):
    """
    Request to generate timetable

    ENTERPRISE PATTERN: job_id passed from Django
    - Django creates job_id and workflow record FIRST
    - Django calls FastAPI with this request including job_id
    - FastAPI uses Django's job_id (not generating its own)
    """
    job_id: Optional[str] = None  # Django's job_id (if Django-first architecture)
    organization_id: str
    campus_id: Optional[str] = None
    school_id: Optional[str] = None
    department_id: str
    batch_ids: List[str]
    semester: int
    academic_year: str
    include_electives: bool = True
    user_id: Optional[str] = None  # Make optional for backward compatibility


class GenerationResponse(BaseModel):
    """Response after initiating generation"""
    job_id: str
    status: str
    message: str
    estimated_time_seconds: int


class GenerationStatistics(BaseModel):
    """Generation statistics"""
    total_courses: int
    total_sessions: int
    scheduled_sessions: int
    total_clusters: int
    total_students: int
    total_faculty: int
    total_rooms: int
    total_time_slots: int
    generation_time_seconds: float
    stage1_time: float
    stage2_time: float
    stage3_time: float


class QualityMetrics(BaseModel):
    """Quality metrics"""
    hard_constraint_violations: int
    faculty_conflicts: int
    room_conflicts: int
    student_conflicts: int
    compactness_score: float
    workload_balance_score: float
    room_utilization: float


class TimetableResult(BaseModel):
    """Complete timetable result"""
    job_id: str
    timetable_entries: List[TimetableEntry]
    statistics: GenerationStatistics
    metrics: QualityMetrics
    generation_time_seconds: float
