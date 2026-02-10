"""
Genetic Algorithm - CPU-Only Optimizer (Production-Safe)
Single population, CPU-only execution per DESIGN FREEZE
Removed: GPU, Island Model, Distributed modes (experimental features)
"""
import logging
import copy
from typing import List, Dict

from models.timetable_models import Course, Room, TimeSlot, Faculty
from .fitness import evaluate_fitness_simple
from .operators import crossover, mutate, tournament_selection

logger = logging.getLogger(__name__)


class GeneticAlgorithmOptimizer:
    """
    Production Genetic Algorithm - CPU-only, single population
    
    DESIGN FREEZE: Removed GPU/Island/Distributed modes for production correctness
    - CPU-only execution (no GPU dependencies)
    - Single population (no threading/multiprocessing)
    - Deterministic and testable
    """
    
    def __init__(
        self,
        courses: List[Course],
        rooms: List[Room],
        time_slots: List[TimeSlot],
        faculty: Dict[str, Faculty],
        students: Dict,
        initial_solution: Dict,
        population_size: int = 15,
        generations: int = 20,
        mutation_rate: float = 0.15,
        crossover_rate: float = 0.7,
        elitism_rate: float = 0.2
    ):
        self.courses = courses
        self.rooms = rooms
        self.time_slots = time_slots
        self.faculty = faculty
        self.students = students
        self.initial_solution = initial_solution
        
        # HARD CAPS (following MNC best practices)
        self.population_size = min(population_size, 20)  # Cap at 20
        self.generations = min(generations, 25)  # Cap at 25 for production
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elitism_rate = elitism_rate
        
        logger.info(f"[GA] CPU-only mode: pop={self.population_size}, gen={self.generations}")
    
    def optimize(self) -> Dict:
        """
        Run genetic algorithm optimization (CPU-only)
        """
        return self._optimize_simple()
    
    def _optimize_simple(self) -> Dict:
        """
        CPU-only optimization (production implementation)
        """
        logger.info(f"[GA] Starting: {self.population_size} individuals, {self.generations} gens")
        
        # Initialize population
        population = self._initialize_population()
        
        best_solution = copy.deepcopy(self.initial_solution)
        best_fitness = float('-inf')
        
        # Evolution loop (single population, CPU-only)
        # Google/Meta pattern: Check cancellation externally in saga between generations
        for generation in range(self.generations):
            # Evaluate fitness for all individuals
            fitness_scores = [
                evaluate_fitness_simple(ind, self.courses, self.faculty, self.time_slots, self.rooms)
                for ind in population
            ]
            
            # Track best
            max_idx = max(range(len(fitness_scores)), key=lambda i: fitness_scores[i])
            if fitness_scores[max_idx] > best_fitness:
                best_fitness = fitness_scores[max_idx]
                best_solution = copy.deepcopy(population[max_idx])
                logger.info(f"[GA] Gen {generation+1}: fitness={best_fitness:.2f}")
            
            # Build next generation
            population = self._evolve_generation(population, fitness_scores)
        
        logger.info(f"[GA] Complete. Best fitness: {best_fitness:.2f}")
        return best_solution
    
    def _initialize_population(self) -> List[Dict]:
        """Create initial population with small variations"""
        population = [copy.deepcopy(self.initial_solution)]
        
        # Generate variations (light mutations)
        for _ in range(self.population_size - 1):
            individual = copy.deepcopy(self.initial_solution)
            individual = mutate(individual, self.courses, self.rooms, self.time_slots, 0.2)
            population.append(individual)
        
        return population
    
    def _evolve_generation(self, population: List[Dict], fitness_scores: List[float]) -> List[Dict]:
        """Evolve population for one generation"""
        # Elitism: keep best individuals
        elite_count = max(1, int(len(population) * self.elitism_rate))
        elite_indices = sorted(range(len(population)), 
                              key=lambda i: fitness_scores[i], 
                              reverse=True)[:elite_count]
        next_population = [copy.deepcopy(population[i]) for i in elite_indices]
        
        # Generate offspring
        while len(next_population) < len(population):
            # Tournament selection
            parent1 = tournament_selection(population, fitness_scores)
            parent2 = tournament_selection(population, fitness_scores)
            
            # Crossover
            offspring1, offspring2 = crossover(parent1, parent2, self.courses, self.crossover_rate)
            
            # Mutation
            offspring1 = mutate(offspring1, self.courses, self.rooms, self.time_slots, self.mutation_rate)
            offspring2 = mutate(offspring2, self.courses, self.rooms, self.time_slots, self.mutation_rate)
            
            next_population.append(offspring1)
            if len(next_population) < len(population):
                next_population.append(offspring2)
        
        return next_population
    
    def fitness(self, solution: Dict) -> float:
        """Evaluate single solution (for external callers)"""
        return evaluate_fitness_simple(solution, self.courses, self.faculty, self.time_slots, self.rooms)
    
    def evolve(self, job_id: str = None) -> Dict:
        """Alias for optimize() for backward compatibility"""
        return self.optimize()
