"""
Celery Tasks for Distributed Timetable Generation
Enables cloud-scale parallelization across multiple workers
"""
import logging
from typing import Dict, List
from celery import Celery
import os

from models.timetable_models import Course, Faculty, Room, TimeSlot, Student
from engine.stage2_hybrid import CPSATSolver, GeneticAlgorithmOptimizer
from engine.context_engine import MultiDimensionalContextEngine

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    'timetable',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    worker_prefetch_multiplier=1,
)


@celery_app.task(bind=True, name='tasks.schedule_department_task')
def schedule_department_task(
    self,
    courses: List[Dict],
    existing_schedule: Dict,
    dept_id: str,
    rooms: List[Dict],
    time_slots: List[Dict],
    faculty: Dict[str, Dict],
    students: Dict[str, Dict]
) -> Dict:
    """
    Celery task to schedule a single department
    Runs on distributed worker machines
    """
    try:
        logger.info(f"Worker {self.request.id}: Scheduling department {dept_id}")

        # Reconstruct objects from dictionaries
        course_objects = [Course(**c) for c in courses]
        room_objects = [Room(**r) for r in rooms]
        time_slot_objects = [TimeSlot(**t) for t in time_slots]
        faculty_objects = {k: Faculty(**v) for k, v in faculty.items()}
        student_objects = {k: Student(**v) for k, v in students.items()}

        # Initialize context engine
        context_engine = MultiDimensionalContextEngine()
        context_engine.initialize_context(
            course_objects,
            faculty_objects,
            student_objects,
            room_objects,
            time_slot_objects
        )

        # CP-SAT for feasibility
        solver = CPSATSolver(
            courses=course_objects,
            rooms=room_objects,
            time_slots=time_slot_objects,
            faculty=faculty_objects,
            timeout_seconds=20
        )

        feasible_solution = solver.solve()

        if not feasible_solution:
            logger.error(f"Worker {self.request.id}: Department {dept_id} infeasible")
            return {}

        # GA for optimization
        optimizer = GeneticAlgorithmOptimizer(
            courses=course_objects,
            rooms=room_objects,
            time_slots=time_slot_objects,
            faculty=faculty_objects,
            students=student_objects,
            initial_solution=feasible_solution,
            population_size=30,
            generations=50,
            context_engine=context_engine
        )

        optimized_solution = optimizer.evolve()

        logger.info(f"Worker {self.request.id}: Department {dept_id} complete - {len(optimized_solution)} sessions")

        return optimized_solution

    except Exception as e:
        logger.error(f"Worker {self.request.id}: Failed to schedule {dept_id}: {e}")
        return {}
