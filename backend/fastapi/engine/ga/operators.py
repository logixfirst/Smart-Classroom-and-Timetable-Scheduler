"""
Genetic Algorithm - Genetic Operators
Following Google/Meta standards: Crossover and mutation separated
"""
import random
import logging
from typing import Dict, List, Tuple
import copy

from models.timetable_models import Course, Room, TimeSlot

logger = logging.getLogger(__name__)


def crossover(
    parent1: Dict,
    parent2: Dict,
    courses: List[Course],
    crossover_rate: float = 0.8
) -> Tuple[Dict, Dict]:
    """
    Single-point crossover operator
    Returns two offspring
    """
    if random.random() > crossover_rate:
        return copy.deepcopy(parent1), copy.deepcopy(parent2)
    
    offspring1 = {}
    offspring2 = {}
    
    # Get all course IDs — guard against non-2-tuple keys defensively
    course_ids = []
    for _k in parent1.keys():
        if isinstance(_k, tuple) and len(_k) == 2:
            course_ids.append(_k[0])
    course_ids = list(set(course_ids))
    if not course_ids:
        return copy.deepcopy(parent1), copy.deepcopy(parent2)
    
    # Single-point crossover
    crossover_point = random.randint(0, len(course_ids))
    split_courses = set(course_ids[:crossover_point])
    
    # Build offspring — skip any non-canonical keys
    for key in parent1.keys():
        if not (isinstance(key, tuple) and len(key) == 2):
            continue
        c_id, _ = key
        if c_id in split_courses:
            offspring1[key] = parent1[key]
            offspring2[key] = parent2[key] if key in parent2 else parent1[key]
        else:
            offspring1[key] = parent2[key] if key in parent2 else parent1[key]
            offspring2[key] = parent1[key]
    
    return offspring1, offspring2


def mutate(
    solution: Dict,
    courses: List[Course],
    rooms: List[Room],
    time_slots: List[TimeSlot],
    mutation_rate: float = 0.15
) -> Dict:
    """
    Mutation operator - randomly changes time slot or room
    Returns mutated solution
    """
    mutated = copy.deepcopy(solution)
    
    for course in courses:
        for session in range(course.duration):
            if random.random() < mutation_rate:
                key = (course.course_id, session)
                if key in mutated:
                    # Randomly change time slot or room
                    if random.random() < 0.5:
                        # Change time slot
                        new_t_slot = random.choice(time_slots)
                        _, room_id = mutated[key]
                        mutated[key] = (new_t_slot.slot_id, room_id)
                    else:
                        # Change room
                        new_room = random.choice(rooms)
                        t_slot_id, _ = mutated[key]
                        mutated[key] = (t_slot_id, new_room.room_id)
    
    return mutated


def tournament_selection(
    population: List[Dict],
    fitness_scores: List[float],
    tournament_size: int = 3
) -> Dict:
    """
    Tournament selection operator
    Returns selected individual
    """
    tournament_indices = random.sample(range(len(population)), tournament_size)
    best_idx = max(tournament_indices, key=lambda i: fitness_scores[i])
    return copy.deepcopy(population[best_idx])
