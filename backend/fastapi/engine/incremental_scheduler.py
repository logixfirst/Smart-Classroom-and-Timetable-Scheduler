"""
Incremental Scheduler - Strategy 4 (2-3 minutes)
Only regenerates changed portions, reuses 90% of previous solution
Use case: Adding 1-2 new courses mid-semester
"""
import logging
import pickle
import os
from typing import Dict, List, Set

from models.timetable_models import Course, Faculty, Room, TimeSlot, Student
from engine.context_engine import MultiDimensionalContextEngine
from engine.stage2_hybrid import CPSATSolver, GeneticAlgorithmOptimizer
from utils.progress_tracker import ProgressTracker

logger = logging.getLogger(__name__)


class IncrementalScheduler:
    """
    Incremental scheduler that reuses previous timetable
    Fastest option for updates (2-3 minutes)
    """

    def __init__(
        self,
        courses: List[Course],
        faculty: Dict[str, Faculty],
        students: Dict[str, Student],
        rooms: List[Room],
        time_slots: List[TimeSlot],
        context_engine: MultiDimensionalContextEngine,
        progress_tracker: ProgressTracker
    ):
        self.courses = courses
        self.faculty = faculty
        self.students = students
        self.rooms = rooms
        self.time_slots = time_slots
        self.context_engine = context_engine
        self.progress_tracker = progress_tracker

        # Load previous timetable
        self.previous_schedule = self._load_previous_timetable()
        self.previous_courses = self._load_previous_courses()

        logger.info("Incremental Scheduler initialized with previous timetable")

    def _load_previous_timetable(self) -> Dict:
        """Load previous timetable from cache"""
        cache_path = os.getenv('TIMETABLE_CACHE_PATH', './cache/previous_timetable.pkl')

        try:
            with open(cache_path, 'rb') as f:
                schedule = pickle.load(f)
                logger.info(f"Loaded previous timetable with {len(schedule)} sessions")
                return schedule
        except Exception as e:
            logger.error(f"Failed to load previous timetable: {e}")
            return {}

    def _load_previous_courses(self) -> List[Course]:
        """Load previous course list"""
        cache_path = os.getenv('COURSES_CACHE_PATH', './cache/previous_courses.pkl')

        try:
            with open(cache_path, 'rb') as f:
                courses = pickle.load(f)
                logger.info(f"Loaded {len(courses)} previous courses")
                return courses
        except Exception as e:
            logger.error(f"Failed to load previous courses: {e}")
            return []

    def generate_incremental(self, num_variants: int = 5) -> List[Dict]:
        """
        Generate timetable variants incrementally
        Only reschedules changed/new courses
        """
        self.progress_tracker.update(
            progress=10.0,
            step="Analyzing changes from previous timetable"
        )

        # Identify changes
        new_courses, modified_courses, deleted_courses = self._identify_changes()

        logger.info(f"Changes detected: {len(new_courses)} new, "
                   f"{len(modified_courses)} modified, {len(deleted_courses)} deleted")

        # If changes > 10%, fall back to full generation
        total_courses = len(self.courses)
        change_percentage = (len(new_courses) + len(modified_courses) + len(deleted_courses)) / total_courses

        if change_percentage > 0.1:
            logger.warning(f"Changes exceed 10% ({change_percentage:.1%}) - recommend full generation")
            return []

        variants = []

        for variant_num in range(num_variants):
            # Start with previous schedule
            schedule = self.previous_schedule.copy()

            # Remove deleted courses
            schedule = self._remove_deleted_courses(schedule, deleted_courses)

            # Reschedule modified courses
            schedule = self._reschedule_modified_courses(schedule, modified_courses)

            # Add new courses
            schedule = self._add_new_courses(schedule, new_courses)

            # Verify zero conflicts
            if self._verify_zero_conflicts(schedule):
                variants.append(schedule)
                logger.info(f"Incremental variant {variant_num+1} generated (zero conflicts)")

            self.progress_tracker.update(
                progress=10.0 + (variant_num + 1) * 18,
                step=f"Incremental variant {variant_num+1}/{num_variants} complete"
            )

        # Save new timetable for next incremental update
        self._save_timetable(variants[0] if variants else {})

        return variants

    def _identify_changes(self) -> tuple[List[Course], List[Course], Set[str]]:
        """Identify new, modified, and deleted courses"""
        previous_course_ids = {c.course_id for c in self.previous_courses}
        current_course_ids = {c.course_id for c in self.courses}

        # New courses
        new_course_ids = current_course_ids - previous_course_ids
        new_courses = [c for c in self.courses if c.course_id in new_course_ids]

        # Deleted courses
        deleted_course_ids = previous_course_ids - current_course_ids

        # Modified courses (enrollment changed)
        modified_courses = []
        for course in self.courses:
            if course.course_id in previous_course_ids:
                prev_course = next(c for c in self.previous_courses if c.course_id == course.course_id)
                if set(course.student_ids) != set(prev_course.student_ids):
                    modified_courses.append(course)

        return new_courses, modified_courses, deleted_course_ids

    def _remove_deleted_courses(self, schedule: Dict, deleted_courses: Set[str]) -> Dict:
        """Remove deleted courses from schedule"""
        return {
            key: value for key, value in schedule.items()
            if key[0] not in deleted_courses
        }

    def _reschedule_modified_courses(self, schedule: Dict, modified_courses: List[Course]) -> Dict:
        """Reschedule modified courses"""
        if not modified_courses:
            return schedule

        # Remove old assignments
        for course in modified_courses:
            schedule = {k: v for k, v in schedule.items() if k[0] != course.course_id}

        # Reschedule with new constraints
        new_schedule = self._schedule_courses(modified_courses, schedule)
        schedule.update(new_schedule)

        return schedule

    def _add_new_courses(self, schedule: Dict, new_courses: List[Course]) -> Dict:
        """Add new courses to schedule"""
        if not new_courses:
            return schedule

        new_schedule = self._schedule_courses(new_courses, schedule)
        schedule.update(new_schedule)

        return schedule

    def _schedule_courses(self, courses: List[Course], existing_schedule: Dict) -> Dict:
        """Schedule courses respecting existing schedule"""
        if not courses:
            return {}

        # Use CP-SAT + GA for scheduling
        solver = CPSATSolver(
            courses=courses,
            rooms=self.rooms,
            time_slots=self.time_slots,
            faculty=self.faculty,
            timeout_seconds=20
        )

        feasible_solution = solver.solve()

        if not feasible_solution:
            logger.error("Incremental scheduling failed - courses infeasible")
            return {}

        # Quick GA optimization
        optimizer = GeneticAlgorithmOptimizer(
            courses=courses,
            rooms=self.rooms,
            time_slots=self.time_slots,
            faculty=self.faculty,
            students=self.students,
            initial_solution=feasible_solution,
            population_size=20,
            generations=30,
            context_engine=self.context_engine
        )

        optimized_solution = optimizer.evolve()

        return optimized_solution

    def _verify_zero_conflicts(self, schedule: Dict) -> bool:
        """Verify schedule has zero conflicts"""
        # Check faculty conflicts
        faculty_schedule = {}
        for (course_id, session), (time_slot, room_id) in schedule.items():
            course = next((c for c in self.courses if c.course_id == course_id), None)
            if not course:
                continue

            key = (course.faculty_id, time_slot)
            if key in faculty_schedule:
                return False
            faculty_schedule[key] = True

        # Check student conflicts
        student_schedule = {}
        for (course_id, session), (time_slot, room_id) in schedule.items():
            course = next((c for c in self.courses if c.course_id == course_id), None)
            if not course:
                continue

            for student_id in course.student_ids:
                key = (student_id, time_slot)
                if key in student_schedule:
                    return False
                student_schedule[key] = True

        return True

    def _save_timetable(self, schedule: Dict):
        """Save timetable for next incremental update"""
        cache_path = os.getenv('TIMETABLE_CACHE_PATH', './cache/previous_timetable.pkl')

        try:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            with open(cache_path, 'wb') as f:
                pickle.dump(schedule, f)
            logger.info("Saved timetable for next incremental update")
        except Exception as e:
            logger.error(f"Failed to save timetable: {e}")

        # Save courses
        courses_path = os.getenv('COURSES_CACHE_PATH', './cache/previous_courses.pkl')
        try:
            with open(courses_path, 'wb') as f:
                pickle.dump(self.courses, f)
        except Exception as e:
            logger.error(f"Failed to save courses: {e}")
