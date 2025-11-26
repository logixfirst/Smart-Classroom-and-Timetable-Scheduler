"""
Celery tasks for distributed Island GA
"""
from celery import Task
import logging

logger = logging.getLogger(__name__)

try:
    from celery import Celery
    import os
    
    broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    celery_app = Celery('timetable_ga', broker=broker_url, backend=broker_url)
    
    @celery_app.task(name='evolve_island_task', bind=True)
    def evolve_island_task(self, island_id, courses, rooms, time_slots, faculty, initial_solution, population_size, generations, job_id):
        """Evolve single island in distributed worker"""
        from engine.stage2_ga import GeneticAlgorithmOptimizer
        from models.timetable_models import Course, Room, TimeSlot, Faculty
        
        # Reconstruct objects from dicts
        courses_obj = [Course(**c) for c in courses]
        rooms_obj = [Room(**r) for r in rooms]
        time_slots_obj = [TimeSlot(**t) for t in time_slots]
        faculty_obj = {k: Faculty(**v) for k, v in faculty.items()}
        
        logger.info(f"Island {island_id}: Starting evolution with pop={population_size}, gen={generations}")
        
        ga = GeneticAlgorithmOptimizer(
            courses=courses_obj,
            rooms=rooms_obj,
            time_slots=time_slots_obj,
            faculty=faculty_obj,
            students={},
            initial_solution=initial_solution,
            population_size=population_size,
            generations=generations
        )
        
        best_solution = ga.evolve(job_id=f"{job_id}_island_{island_id}")
        fitness = ga.fitness(best_solution)
        
        logger.info(f"Island {island_id}: Complete with fitness={fitness:.2f}")
        
        return {
            'island_id': island_id,
            'solution': best_solution,
            'fitness': fitness
        }
    
    logger.info("[OK] Celery tasks registered for distributed GA")
    
except ImportError:
    logger.warning("[WARN] Celery not available - distributed GA disabled")
    celery_app = None
    evolve_island_task = None
