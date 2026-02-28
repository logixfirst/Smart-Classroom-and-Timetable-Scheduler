"""
CP-SAT Module - Public API
Following Google/Meta standards: Clean public interface
"""
from .solver import AdaptiveCPSATSolver
from .strategies import STRATEGIES, get_strategy_by_index, select_strategy_for_cluster_size
from .progress import log_cluster_start, log_cluster_success
from .constraints import (
    add_faculty_constraints,
    add_room_constraints,
    add_student_constraints,
)
from .committed_registry import CommittedResourceRegistry
from .conflict_constraints import (
    add_no_overlap_constraints,
    has_teacher_conflict,
    has_room_conflict,
    has_student_group_conflict,
)
from .dept_solver import CommittedAwareSolver, DeptTimetableResult, solve_department_timetable
from .cross_dept_solver import solve_cross_dept_timetable
from .timetable_merger import merge_timetables, build_department_view

__all__ = [
    # Existing solver
    'AdaptiveCPSATSolver',
    'STRATEGIES',
    'get_strategy_by_index',
    'select_strategy_for_cluster_size',
    'log_cluster_start',
    'log_cluster_success',
    'add_faculty_constraints',
    'add_room_constraints',
    'add_student_constraints',
    # Phase-aware infrastructure
    'CommittedResourceRegistry',
    'CommittedAwareSolver',
    'DeptTimetableResult',
    # Entry points
    'solve_department_timetable',
    'solve_cross_dept_timetable',
    'merge_timetables',
    'build_department_view',
    # Conflict detection
    'add_no_overlap_constraints',
    'has_teacher_conflict',
    'has_room_conflict',
    'has_student_group_conflict',
]
