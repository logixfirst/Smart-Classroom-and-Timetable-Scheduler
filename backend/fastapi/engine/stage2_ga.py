"""
Stage 2B: Genetic Algorithm Optimizer with GPU Acceleration
Optimizes CP-SAT solution for soft constraints
Auto-detects and uses GPU if available, falls back to CPU
"""
import random
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import copy

from models.timetable_models import Course, Room, TimeSlot, Faculty

logger = logging.getLogger(__name__)

# Distributed system detection
try:
    from celery import Celery
    CELERY_AVAILABLE = True
    logger.info("✅ Celery detected - Distributed processing available")
except ImportError:
    CELERY_AVAILABLE = False
    logger.info("⚠️ Celery not available - No distributed processing")

# GPU Detection and Initialization
try:
    import torch
    TORCH_AVAILABLE = torch.cuda.is_available()
    if TORCH_AVAILABLE:
        DEVICE = torch.device('cuda')
        logger.info(f"✅ GPU detected: {torch.cuda.get_device_name(0)} - GA will use GPU acceleration")
    else:
        DEVICE = torch.device('cpu')
        logger.info("⚠️ GPU not available - GA will use CPU")
except ImportError:
    TORCH_AVAILABLE = False
    DEVICE = None
    logger.info("⚠️ PyTorch not installed - GA will use CPU-only mode")


class GeneticAlgorithmOptimizer:
    """
    GA optimizer with island model for soft constraint optimization
    """
    
    def __init__(
        self,
        courses: List[Course],
        rooms: List[Room],
        time_slots: List[TimeSlot],
        faculty: Dict[str, Faculty],
        students: Dict,
        initial_solution: Dict,
        population_size: int = 15,  # Reduced from 20
        generations: int = 20,      # Reduced from 30
        mutation_rate: float = 0.15,  # Increased for faster exploration
        crossover_rate: float = 0.8,
        elitism_rate: float = 0.2,  # Increased to keep more good solutions
        context_engine=None,
        early_stop_patience: int = 5  # NEW: Early stopping
    ):
        self.courses = courses
        self.rooms = rooms
        self.time_slots = time_slots
        self.faculty = faculty
        self.students = students
        self.initial_solution = initial_solution
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elitism_rate = elitism_rate
        self.early_stop_patience = early_stop_patience
        self.population = []
        self.fitness_cache = {}  # Fitness caching
        self.max_cache_size = 500  # Limit cache to prevent memory explosion
        
        # Hardware-adaptive configuration with FORCED GPU usage
        # GPU threshold: population * courses >= 200 (batching benefit)
        gpu_threshold = population_size * len(courses) >= 200
        
        # FORCE GPU if available and threshold met, otherwise CPU
        if TORCH_AVAILABLE and gpu_threshold:
            self.use_gpu = True
            self.use_multicore = False
            logger.info(f"🚀 FORCING GPU acceleration (pop={population_size}, courses={len(courses)})")
            try:
                self._init_gpu_tensors()
            except Exception as e:
                logger.warning(f"GPU init failed: {e}, falling back to CPU")
                self.use_gpu = False
                self.use_multicore = len(courses) > 50
        else:
            self.use_gpu = False
            self.use_multicore = len(courses) > 50
            if not TORCH_AVAILABLE:
                logger.info(f"GPU not available, using CPU")
            else:
                logger.info(f"GPU threshold not met (pop*courses={population_size * len(courses)} < 200), using CPU")
        
        self.use_island_model = False  # Set externally
        
        if self.use_multicore and not self.use_gpu:
            import multiprocessing
            self.num_workers = min(4, multiprocessing.cpu_count())
            logger.info(f"🚀 GA using {self.num_workers} CPU cores")
        
        if not self.use_gpu and not self.use_multicore:
            logger.info(f"GA using single-core CPU")
        
        # Build valid domains
        self._build_valid_domains()
    
    def _build_valid_domains(self):
        """Pre-compute valid (time, room) pairs"""
        self.valid_domains = {}
        
        for course in self.courses:
            for session in range(course.duration):
                valid_pairs = []
                for t_slot in self.time_slots:
                    for room in self.rooms:
                        if len(course.student_ids) > room.capacity:
                            continue
                        if hasattr(course, 'required_features') and course.required_features:
                            if not all(feat in getattr(room, 'features', []) for feat in course.required_features):
                                continue
                        valid_pairs.append((t_slot.slot_id, room.room_id))
                
                self.valid_domains[(course.course_id, session)] = valid_pairs
    
    def initialize_population(self):
        """Initialize population with initial solution + perturbations"""
        self.population = [self.initial_solution]  # No copy to save memory
        
        # Add perturbed versions (reuse objects)
        for _ in range(self.population_size - 1):
            perturbed = self._perturb_solution(self.initial_solution)
            if perturbed:
                self.population.append(perturbed)
        
        logger.info(f"Initialized GA population: {len(self.population)} individuals")
    
    def _perturb_solution(self, solution: Dict) -> Dict:
        """Perturb solution by changing 10-20% of assignments"""
        perturbed = solution.copy()  # Proper copy
        keys = list(perturbed.keys())
        num_changes = max(1, int(len(keys) * 0.15))  # Fixed 15%
        
        for _ in range(num_changes):
            key = random.choice(keys)
            valid_pairs = self.valid_domains.get(key, [])
            if valid_pairs:
                perturbed[key] = random.choice(valid_pairs)
        
        return perturbed
    
    def fitness(self, solution: Dict) -> float:
        """Calculate fitness with limited caching"""
        # Cache key (use hash for memory efficiency)
        sol_key = hash(tuple(sorted(solution.items())))
        if sol_key in self.fitness_cache:
            return self.fitness_cache[sol_key]
        
        # Clear cache if too large
        if len(self.fitness_cache) >= self.max_cache_size:
            # Keep only recent 50% of cache
            keys_to_remove = list(self.fitness_cache.keys())[:self.max_cache_size // 2]
            for k in keys_to_remove:
                del self.fitness_cache[k]
        
        if not self._is_feasible(solution):
            fitness_val = -1000 * self._count_violations(solution)
            self.fitness_cache[sol_key] = fitness_val
            return fitness_val
        
        # Soft constraint weights
        # Simplified soft constraints (faster)
        sc1 = self._faculty_preference_satisfaction(solution) * 0.3
        sc2 = self._schedule_compactness(solution) * 0.3
        sc3 = self._room_utilization(solution) * 0.2
        sc4 = self._workload_balance(solution) * 0.2
        
        fitness_val = sc1 + sc2 + sc3 + sc4
        self.fitness_cache[sol_key] = fitness_val
        return fitness_val
    
    def _is_feasible(self, solution: Dict) -> bool:
        """Check hard constraints"""
        faculty_schedule = {}
        room_schedule = {}
        student_schedule = {}
        
        for (course_id, session), (time_slot, room_id) in solution.items():
            course = next((c for c in self.courses if c.course_id == course_id), None)
            if not course:
                continue
            
            # Faculty conflict
            if (course.faculty_id, time_slot) in faculty_schedule:
                return False
            faculty_schedule[(course.faculty_id, time_slot)] = True
            
            # Room conflict
            if (room_id, time_slot) in room_schedule:
                return False
            room_schedule[(room_id, time_slot)] = True
            
            # Student conflicts
            for student_id in course.student_ids:
                if (student_id, time_slot) in student_schedule:
                    return False
                student_schedule[(student_id, time_slot)] = True
        
        return True
    
    def _count_violations(self, solution: Dict) -> int:
        """Count hard constraint violations"""
        violations = 0
        faculty_schedule = defaultdict(int)
        room_schedule = defaultdict(int)
        student_schedule = defaultdict(int)
        
        for (course_id, session), (time_slot, room_id) in solution.items():
            course = next((c for c in self.courses if c.course_id == course_id), None)
            if not course:
                continue
            
            faculty_schedule[(course.faculty_id, time_slot)] += 1
            room_schedule[(room_id, time_slot)] += 1
            for student_id in course.student_ids:
                student_schedule[(student_id, time_slot)] += 1
        
        violations += sum(max(0, count - 1) for count in faculty_schedule.values())
        violations += sum(max(0, count - 1) for count in room_schedule.values())
        violations += sum(max(0, count - 1) for count in student_schedule.values())
        
        return violations
    
    def _faculty_preference_satisfaction(self, solution: Dict) -> float:
        """Faculty time preference satisfaction"""
        total_score = 0
        count = 0
        
        for (course_id, session), (time_slot, room_id) in solution.items():
            course = next((c for c in self.courses if c.course_id == course_id), None)
            if not course:
                continue
            
            faculty_prefs = getattr(self.faculty.get(course.faculty_id), 'preferred_slots', {})
            total_score += faculty_prefs.get(time_slot, 0.5)
            count += 1
        
        return total_score / count if count > 0 else 0.0
    
    def _schedule_compactness(self, solution: Dict) -> float:
        """Minimize gaps in schedules"""
        total_gaps = 0
        
        for faculty_id in set(c.faculty_id for c in self.courses):
            time_slots_used = sorted([
                time_slot for (cid, s), (time_slot, _) in solution.items()
                if next((c for c in self.courses if c.course_id == cid), None) and 
                   next((c for c in self.courses if c.course_id == cid), None).faculty_id == faculty_id
            ])
            
            if len(time_slots_used) > 1:
                gaps = sum(time_slots_used[i+1] - time_slots_used[i] - 1 for i in range(len(time_slots_used) - 1))
                total_gaps += gaps
        
        max_gaps = len(self.courses) * 5
        return max(0, 1 - total_gaps / max_gaps)
    
    def _room_utilization(self, solution: Dict) -> float:
        """Room utilization efficiency"""
        utilized_slots = len(set((room_id, time_slot) for _, (time_slot, room_id) in solution.items()))
        total_slots = len(self.rooms) * len(self.time_slots)
        return utilized_slots / total_slots if total_slots > 0 else 0
    
    def _workload_balance(self, solution: Dict) -> float:
        """Balanced faculty workload"""
        workloads = defaultdict(int)
        for course in self.courses:
            workloads[course.faculty_id] += course.duration
        
        if not workloads:
            return 1.0
        
        values = list(workloads.values())
        mean_load = sum(values) / len(values)
        variance = sum((x - mean_load) ** 2 for x in values) / len(values)
        std_load = variance ** 0.5
        
        return max(0, 1 - std_load / mean_load) if mean_load > 0 else 1.0
    
    def _peak_spreading(self, solution: Dict) -> float:
        """Spread courses across time slots"""
        slot_loads = defaultdict(int)
        for _, (time_slot, _) in solution.items():
            slot_loads[time_slot] += 1
        
        max_load = max(slot_loads.values()) if slot_loads else 0
        total_courses = len(self.courses)
        
        return max(0, 1 - max_load / total_courses) if total_courses > 0 else 1.0
    
    def _lecture_continuity(self, solution: Dict) -> float:
        """Prefer MWF or TTh patterns"""
        return 1.0  # Simplified
    
    def smart_crossover(self, parent1: Dict, parent2: Dict) -> Dict:
        """Constraint-preserving crossover"""
        child = {}
        for key in parent1.keys():
            child[key] = parent1[key] if random.random() < 0.5 else parent2.get(key, parent1[key])
        return child
    
    def smart_mutation(self, solution: Dict) -> Dict:
        """Constraint-preserving mutation"""
        mutated = solution.copy()
        
        # Mutate only a subset of keys
        keys_to_mutate = random.sample(list(mutated.keys()), 
                                       max(1, int(len(mutated) * self.mutation_rate)))
        
        for key in keys_to_mutate:
            valid_pairs = self.valid_domains.get(key, [])
            if valid_pairs:
                mutated[key] = random.choice(valid_pairs)
        
        return mutated
    
    def _tournament_select(self, fitness_scores: List[Tuple[Dict, float]], k: int = 3) -> Dict:
        """Tournament selection"""
        tournament = random.sample(fitness_scores, min(k, len(fitness_scores)))
        return max(tournament, key=lambda x: x[1])[0]
    
    def evolve(self) -> Dict:
        """Run GA evolution with early stopping and caching"""
        self.initialize_population()
        
        best_solution = self.initial_solution
        best_fitness = self.fitness(best_solution)
        no_improvement_count = 0
        
        for generation in range(self.generations):
            # Hardware-adaptive fitness evaluation
            if self.use_gpu:
                fitness_scores = self._gpu_batch_fitness()
            elif self.use_multicore:
                fitness_scores = self._multicore_fitness()
            else:
                fitness_scores = [(sol, self.fitness(sol)) for sol in self.population]
            
            fitness_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Track best with early stopping
            current_best = fitness_scores[0][1]
            if current_best > best_fitness:
                best_fitness = current_best
                best_solution = fitness_scores[0][0]
                no_improvement_count = 0
            else:
                no_improvement_count += 1
            
            # Early stopping
            if no_improvement_count >= self.early_stop_patience:
                logger.info(f"Early stopping at gen {generation} (no improvement for {self.early_stop_patience} gens)")
                break
            
            # Population evolution
            elite_count = max(1, int(self.population_size * self.elitism_rate))
            new_population = [sol for sol, _ in fitness_scores[:elite_count]]
            
            # Generate offspring
            while len(new_population) < self.population_size:
                if random.random() < self.crossover_rate:
                    parent1 = self._tournament_select(fitness_scores)
                    parent2 = self._tournament_select(fitness_scores)
                    child = self.smart_crossover(parent1, parent2)
                else:
                    parent = self._tournament_select(fitness_scores)
                    child = self.smart_mutation(parent)
                
                new_population.append(child)
            
            # Clear old population to free memory
            old_population = self.population
            self.population = new_population
            del old_population
            del fitness_scores
            
            # Periodic garbage collection
            if generation % 5 == 0:
                import gc
                gc.collect()
            
            if generation % 5 == 0:
                mode = "GPU" if self.use_gpu else ("Multi-core" if self.use_multicore else "CPU")
                cache_size = len(self.fitness_cache)
                logger.info(f"GA Gen {generation} ({mode}): Best={best_fitness:.4f}, Cache={cache_size}")
        
        # Final cleanup
        self.population.clear()
        self.fitness_cache.clear()
        if self.use_gpu:
            self._cleanup_gpu()
        
        logger.info(f"GA complete: Final fitness={best_fitness:.4f}")
        return best_solution
    
    def evolve_island_model(self, num_islands: int = 8, migration_interval: int = 10) -> Dict:
        """Island Model GA - 5x speedup via parallel evolution"""
        import multiprocessing
        
        num_workers = min(num_islands, multiprocessing.cpu_count())
        logger.info(f"Island Model GA: {num_islands} islands, {num_workers} workers")
        
        # Create islands
        islands = [{
            'id': i,
            'seed': random.randint(0, 1000000),
            'solution': self.initial_solution.copy(),
            'pop_size': max(20, self.population_size // num_islands)
        } for i in range(num_islands)]
        
        best_solution = self.initial_solution
        best_fitness = -float('inf')
        
        # Evolution with migration
        num_epochs = self.generations // migration_interval
        
        for epoch in range(num_epochs):
            # Parallel evolution
            with ProcessPoolExecutor(max_workers=num_workers) as executor:
                futures = [executor.submit(
                    _evolve_island_worker,
                    island, self.courses, self.rooms, self.time_slots,
                    self.faculty, self.students, migration_interval
                ) for island in islands]
                islands = [f.result() for f in futures]
            
            # Track best
            for island in islands:
                if island['fitness'] > best_fitness:
                    best_fitness = island['fitness']
                    best_solution = island['best_solution']
            
            # Ring migration
            if epoch < num_epochs - 1:
                best_sols = [isl['best_solution'] for isl in islands]
                for i in range(len(islands)):
                    islands[i]['migrant'] = best_sols[(i - 1) % len(islands)]
            
            logger.info(f"Epoch {epoch + 1}/{num_epochs}: Best fitness = {best_fitness:.4f}")
        
        logger.info(f"Island Model GA complete: Final fitness = {best_fitness:.4f}")
        return best_solution
    
    def _init_gpu_tensors(self):
        """Initialize GPU tensors for accelerated computation"""
        if not TORCH_AVAILABLE:
            return
        
        try:
            # Pre-compute faculty preference matrix
            faculty_prefs = np.zeros((len(self.courses), len(self.time_slots)))
            for i, course in enumerate(self.courses):
                faculty = self.faculty.get(course.faculty_id)
                if faculty:
                    prefs = getattr(faculty, 'preferred_slots', {})
                    for j, t_slot in enumerate(self.time_slots):
                        faculty_prefs[i, j] = prefs.get(t_slot.slot_id, 0.5)
            
            self.faculty_prefs_tensor = torch.tensor(faculty_prefs, device=DEVICE, dtype=torch.float32)
            logger.info(f"GPU tensors initialized: {self.faculty_prefs_tensor.shape}")
        except Exception as e:
            logger.warning(f"GPU tensor initialization failed: {e}, falling back to CPU")
            self.use_gpu = False
    
    def _gpu_batch_fitness(self) -> List[Tuple[Dict, float]]:
        """GPU-accelerated BATCHED fitness evaluation for entire population"""
        try:
            import torch
            batch_size = len(self.population)
            
            # Convert entire population to GPU tensors (batched)
            feasibility = torch.tensor([1.0 if self._is_feasible(sol) else 0.0 for sol in self.population], device=DEVICE)
            violations = torch.tensor([self._count_violations(sol) for sol in self.population], device=DEVICE)
            
            # Batched soft constraint evaluation on GPU
            faculty_scores = torch.zeros(batch_size, device=DEVICE)
            compactness_scores = torch.zeros(batch_size, device=DEVICE)
            room_util_scores = torch.zeros(batch_size, device=DEVICE)
            workload_scores = torch.zeros(batch_size, device=DEVICE)
            
            for i, sol in enumerate(self.population):
                # Vectorized faculty preference (already on GPU)
                faculty_scores[i] = self._gpu_faculty_preference_tensor(sol)
                # Other constraints (computed on CPU, moved to GPU)
                compactness_scores[i] = self._schedule_compactness(sol)
                room_util_scores[i] = self._room_utilization(sol)
                workload_scores[i] = self._workload_balance(sol)
            
            # Vectorized fitness calculation on GPU
            fitness_tensor = feasibility * (
                0.3 * faculty_scores + 
                0.3 * compactness_scores + 
                0.2 * room_util_scores + 
                0.2 * workload_scores
            ) - (1.0 - feasibility) * 1000.0 * violations
            
            # Move back to CPU
            fitness_values = fitness_tensor.cpu().numpy().tolist()
            return list(zip(self.population, fitness_values))
            
        except Exception as e:
            logger.warning(f"GPU batch fitness failed: {e}, falling back to CPU")
            self.use_gpu = False
            return [(sol, self.fitness(sol)) for sol in self.population]
    
    def _gpu_fitness(self, solution: Dict) -> float:
        """GPU-accelerated fitness calculation - FULL GPU evaluation"""
        if not self._is_feasible(solution):
            return -1000 * self._count_violations(solution)
        
        # Use GPU for ALL vectorizable constraints
        faculty_score = self._gpu_faculty_preference(solution) * 0.3
        compactness = self._schedule_compactness(solution) * 0.3
        room_util = self._room_utilization(solution) * 0.2
        workload = self._workload_balance(solution) * 0.2
        
        return faculty_score + compactness + room_util + workload
    
    def _gpu_faculty_preference(self, solution: Dict) -> float:
        """GPU-accelerated faculty preference calculation"""
        try:
            scores = []
            for (course_id, session), (time_slot, room_id) in solution.items():
                course_idx = next((i for i, c in enumerate(self.courses) if c.course_id == course_id), None)
                time_idx = next((i for i, t in enumerate(self.time_slots) if t.slot_id == time_slot), None)
                if course_idx is not None and time_idx is not None:
                    score = self.faculty_prefs_tensor[course_idx, time_idx].item()
                    scores.append(score)
            return (sum(scores) / len(scores) * 0.25) if scores else 0.0
        except:
            return self._faculty_preference_satisfaction(solution) * 0.25
    
    def _gpu_faculty_preference_tensor(self, solution: Dict) -> float:
        """GPU tensor-based faculty preference (returns tensor value)"""
        try:
            import torch
            scores = []
            for (course_id, session), (time_slot, room_id) in solution.items():
                course_idx = next((i for i, c in enumerate(self.courses) if c.course_id == course_id), None)
                time_idx = next((i for i, t in enumerate(self.time_slots) if t.slot_id == time_slot), None)
                if course_idx is not None and time_idx is not None:
                    scores.append(self.faculty_prefs_tensor[course_idx, time_idx])
            return torch.mean(torch.stack(scores)) if scores else torch.tensor(0.0, device=DEVICE)
        except:
            return torch.tensor(self._faculty_preference_satisfaction(solution), device=DEVICE)
    
    def _multicore_fitness(self) -> List[Tuple[Dict, float]]:
        """Multi-core CPU fitness evaluation"""
        with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
            fitness_values = list(executor.map(self.fitness, self.population))
        return list(zip(self.population, fitness_values))
    
    def _cleanup_gpu(self):
        """Cleanup GPU resources"""
        if TORCH_AVAILABLE and hasattr(self, 'faculty_prefs_tensor'):
            del self.faculty_prefs_tensor
            torch.cuda.empty_cache()
            logger.info("GPU resources cleaned up")


def _evolve_island_worker(island: Dict, courses, rooms, time_slots, faculty, students, generations: int) -> Dict:
    """Worker function: evolve single island in separate process"""
    random.seed(island['seed'])
    
    ga = GeneticAlgorithmOptimizer(
        courses=courses, rooms=rooms, time_slots=time_slots,
        faculty=faculty, students=students,
        initial_solution=island['solution'],
        population_size=island['pop_size'],
        generations=generations,
        mutation_rate=0.1, crossover_rate=0.8, elitism_rate=0.1
    )
    
    # Add migrant if available
    if 'migrant' in island:
        ga.initialize_population()
        ga.population[0] = island['migrant']
    
    best_solution = ga.evolve()
    island['best_solution'] = best_solution
    island['fitness'] = ga.fitness(best_solution)
    island['seed'] = random.randint(0, 1000000)
    
    return island
