"""
Models package - Modular structure following Google/Meta best practices

This package splits the original 793-line models.py god file into:
- base.py (111 lines) - Organization, Building
- academic_structure.py (148 lines) - School, Department, Program
- course.py (157 lines) - Course, CourseOffering, CourseEnrollment
- faculty.py (130 lines) - Faculty
- student.py (150 lines) - Student, Batch
- room.py (70 lines) - Room (Classroom, Lab)
- timetable.py (140 lines) - TimeSlot, GenerationJob, Timetable, TimetableSlot
- user.py (48 lines) - User

All imports preserved for backward compatibility.
"""

# Base models
from .base import (
    Organization,
    Building,
    Campus,  # Backward compat alias
)

# Academic structure
from .academic_structure import (
    School,
    Department,
    Program,
)

# Course models
from .course import (
    Course,
    Subject,  # Backward compat alias
    CourseOffering,
    CourseEnrollment,
)

# Faculty model
from .faculty import Faculty

# Student models
from .student import (
    Student,
    Batch,
)

# Room models
from .room import (
    Room,
    Classroom,  # Backward compat alias
    Lab,  # Backward compat alias
)

# Timetable models
from .timetable import (
    TimeSlot,
    GenerationJob,
    Timetable,
    TimetableSlot,
)

# User model
from .user import User, UserSession

# Export all models for backward compatibility
__all__ = [
    # Base
    'Organization',
    'Building',
    'Campus',
    # Academic structure
    'School',
    'Department',
    'Program',
    # Courses
    'Course',
    'Subject',
    'CourseOffering',
    'CourseEnrollment',
    # Faculty
    'Faculty',
    # Students
    'Student',
    'Batch',
    # Rooms
    'Room',
    'Classroom',
    'Lab',
    # Timetable
    'TimeSlot',
    'GenerationJob',
    'Timetable',
    'TimetableSlot',
    # User
    'User',
    'UserSession',
]
