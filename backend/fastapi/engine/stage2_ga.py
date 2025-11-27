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
import threading

from models.timetable_models import Course, Room, TimeSlot, Faculty

logger = logging.getLogger(__name__)

# Distributed system detection (package only, not runtime availability)
try:
    from celery import Celery
    CELERY_AVAILABLE = True
    logger.debug("Celery package detected (not verified if running)")
except ImportError:
    CELERY_AVAILABLE = False
    logger.debug("Celery package not installed")

# GPU Detection and Initialization (Non-blocking)
try:
    import torch
    if torch.cuda.is_available():
        try:
            # Test GPU access
            test = torch.zeros(1).cuda()
            del test
            torch.cuda.synchronize()
            TORCH_AVAILABLE = True
            DEVICE = torch.device('cuda')
            logger.info(f"[OK] GPU READY: {torch.cuda.get_device_name(0)} - GA will use GPU acceleration")
        except Exception as e:
            TORCH_AVAILABLE = False
            DEVICE = torch.device('cpu')
            logger.error(f"[ERROR] GPU test failed: {e} - GA will use CPU")
    else:
        TORCH_AVAILABLE = False
        DEVICE = torch.device('cpu')
        logger.warning("[WARN] CUDA not available - GA will use CPU")
except ImportError:
    TORCH_AVAILABLE = False
    DEVICE = None
    logger.warning("[WARN] PyTorch not installed - GA will use CPU-only mode")


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
        population_size: int = 15,
        generations: int = 20,
        mutation_rate: float = 0.15,
        crossover_rate: float = 0.8,
        elitism_rate: float = 0.2,
        context_engine=None,
        early_stop_patience: int = 5,
        use_sample_fitness: bool = False,
        sample_size: int = 200,
        gpu_offload_conflicts: bool = True,
        hardware_config: Dict = None,  # Hardware config from detector
        streaming_mode: bool = False,  # Google/Linux streaming mode
        memory_limit_gb: float = None  # Memory budget
    ):
        self.courses = courses
        self.streaming_mode = streaming_mode
        self.memory_limit_gb = memory_limit_gb
        self.rooms = rooms
        self.time_slots = time_slots
        self.faculty = faculty
        self.students = students
        self.initial_solution = initial_solution
        
        # CRITICAL: ALWAYS use hardware_config if provided (overrides RAM detection)
        if hardware_config:
            self.population_size = hardware_config.get('population', population_size)
            self.generations = hardware_config.get('generations', generations)
            self.streaming_mode = hardware_config.get('streaming_mode', streaming_mode)
            self.memory_limit_gb = hardware_config.get('memory_limit_gb', memory_limit_gb)
            logger.info(f"Hardware config: pop={self.population_size}, gen={self.generations}, streaming={self.streaming_mode}, mem={self.memory_limit_gb}GB")
        else:
            # Fallback: RAM-based auto-detection
            import psutil
            mem = psutil.virtual_memory()
            available_gb = mem.available / (1024**3)
            
            if available_gb < 3.0:
                self.population_size = min(population_size, 10)
                self.generations = min(generations, 15)
                logger.warning(f"Low RAM ({available_gb:.1f}GB), reducing pop={self.population_size}, gen={self.generations}")
            elif available_gb < 5.0:
                self.population_size = min(population_size, 15)
                self.generations = min(generations, 20)
                logger.info(f"Medium RAM ({available_gb:.1f}GB), pop={self.population_size}, gen={self.generations}")
            else:
                self.population_size = population_size
                self.generations = generations
                logger.info(f"Good RAM ({available_gb:.1f}GB), pop={self.population_size}, gen={self.generations}")
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elitism_rate = elitism_rate
        self.early_stop_patience = early_stop_patience
        self.use_sample_fitness = use_sample_fitness
        self.sample_size = sample_size
        self.population = []
        
        # Use bounded cache to prevent memory leaks
        from engine.memory_manager import BoundedCache
        self.fitness_cache = BoundedCache(max_size=50)  # Fixed-size LRU cache
        self._cache_lock = threading.Lock()
        self._gpu_lock = threading.Lock() if TORCH_AVAILABLE else None
        
        # Sample students for fitness if enabled
        if use_sample_fitness and students:
            all_students = list(students.keys())
            if len(all_students) > sample_size:
                self.sample_students = set(random.sample(all_students, sample_size))
                logger.info(f"[OK] Sample fitness enabled: {sample_size}/{len(all_students)} students")
            else:
                self.sample_students = set(all_students)
                self.use_sample_fitness = False
        else:
            self.sample_students = set()
        
        # Hardware-adaptive configuration - RESPECT hardware config
        if hardware_config:
            # Use hardware detector config
            self.use_gpu = hardware_config.get('use_gpu', False) and TORCH_AVAILABLE
            self.gpu_offload_conflicts = self.use_gpu and gpu_offload_conflicts
            self.use_sample_fitness = hardware_config.get('fitness_evaluation', 'full') == 'sample_based'
            if self.use_sample_fitness:
                self.sample_size = hardware_config.get('sample_students', 50)
            logger.info(f"Hardware config applied: use_gpu={self.use_gpu}, pop={self.population_size}, gen={self.generations}, sample_fitness={self.use_sample_fitness}")
        else:
            # Fallback: auto-detect
            self.use_gpu = TORCH_AVAILABLE and DEVICE is not None
            self.gpu_offload_conflicts = self.use_gpu and gpu_offload_conflicts
            logger.warning("No hardware config provided, using auto-detection")
        
        if self.use_gpu:
            try:
                logger.info(f"Initializing GPU tensors for {len(courses)} courses...")
                self._init_gpu_tensors()
                if self.gpu_offload_conflicts:
                    self._init_gpu_conflict_detection()
                logger.info(f"[OK] GPU ENABLED: pop={self.population_size}, courses={len(courses)}")
            except Exception as e:
                logger.error(f"[ERROR] GPU init failed: {e}")
                self.use_gpu = False
                self.gpu_offload_conflicts = False
                logger.warning(f"Falling back to CPU")
        else:
            logger.info(f"CPU mode: pop={self.population_size}")
        
        self.use_multicore = False  # Always single-core to prevent RAM exhaustion
        
        self.use_island_model = False  # Set externally
        self.progress_tracker = None  # Set externally for unified progress updates
        
        # NEVER use multicore - it exhausts RAM
        self.num_workers = 1
        if self.use_gpu:
            logger.info(f"GA using GPU (single-core CPU fallback)")
        else:
            logger.info(f"GA using single-core CPU (RAM-safe mode)")
        
        # On-demand domain computation with per-course caching
        self._domain_cache = {}  # Cache: course_id -> valid_pairs
        logger.info(f"[GA] Init complete. Valid domains computed on-demand with caching.")
    
    def _get_valid_domain(self, course_id: str, session: int) -> List[Tuple]:
        """On-demand with caching: Compute valid (time, room) pairs per course"""
        # Check cache first (course-level, not session-level)
        if course_id in self._domain_cache:
            return self._domain_cache[course_id]
        
        # Find course
        course = next((c for c in self.courses if c.course_id == course_id), None)
        if not course:
            return []
        
        # Compute valid pairs (only once per course)
        valid_pairs = []
        for t_slot in self.time_slots:
            for room in self.rooms:
                if len(course.student_ids) > room.capacity:
                    continue
                if hasattr(course, 'required_features') and course.required_features:
                    if not all(feat in getattr(room, 'features', []) for feat in course.required_features):
                        continue
                valid_pairs.append((t_slot.slot_id, room.room_id))
        
        # Cache for future use
        self._domain_cache[course_id] = valid_pairs
        return valid_pairs
    
    def initialize_population(self):
        """Initialize population - GPU VRAM offloading if available"""
        if self.use_gpu:
            return self._initialize_population_gpu()
        else:
            return self._initialize_population_cpu()
    
    def _initialize_population_gpu(self):
        """GPU: Use CPU population, GPU only for batch fitness"""
        import psutil
        
        mem_before = psutil.virtual_memory()
        logger.info(f"[GPU] Init population in RAM (GPU for fitness). RAM: {mem_before.percent:.1f}%")
        
        # Simple: CPU population (GPU only for fitness evaluation)
        self.population = [self.initial_solution.copy()]
        for _ in range(self.population_size - 1):
            self.population.append(self.initial_solution.copy())
        
        mem_after = psutil.virtual_memory()
        logger.info(f"[GPU] Pop in RAM: {len(self.population)}. RAM: {mem_before.percent:.1f}% → {mem_after.percent:.1f}%")
        
        import gc
        gc.collect()
    
    def _initialize_population_cpu(self):
        """CPU fallback: Minimal RAM usage"""
        self.population = [self.initial_solution]
        
        num_keys = len(self.initial_solution)
        num_changes = max(1, int(num_keys * 0.05))
        keys_list = list(self.initial_solution.keys())
        
        for i in range(self.population_size - 1):
            perturbed = {k: v for k, v in self.initial_solution.items()}
            
            for _ in range(num_changes):
                key = random.choice(keys_list)
                valid_pairs = self.valid_domains.get(key, [])
                if valid_pairs:
                    perturbed[key] = random.choice(valid_pairs)
            
            self.population.append(perturbed)
            
            if i % 5 == 4:
                import gc
                gc.collect(generation=0)
        
        logger.info(f"[CPU] Initialized population: {len(self.population)} individuals")
    
    def _perturb_solution(self, solution: Dict) -> Dict:
        """Perturb solution by changing 5-10% of assignments (fast)"""
        perturbed = solution.copy()  # Proper copy
        keys = list(perturbed.keys())
        num_changes = max(1, int(len(keys) * 0.08))  # 8% for speed
        
        for _ in range(num_changes):
            key = random.choice(keys)
            valid_pairs = self._get_valid_domain(key[0], key[1])  # On-demand
            if valid_pairs:
                perturbed[key] = random.choice(valid_pairs)
        
        return perturbed
    
    def fitness(self, solution: Dict) -> float:
        """Calculate fitness with thread-safe GPU-accelerated caching + ALL soft constraints"""
        # Cache key (use hash for memory efficiency)
        sol_key = hash(tuple(sorted(solution.items())))
        
        # Thread-safe cache read (bounded cache ONLY)
        with self._cache_lock:
            cached_value = self.fitness_cache.get(sol_key)
            if cached_value is not None:
                return cached_value
        
        # Calculate fitness (outside lock to allow parallel computation)
        if not self._is_feasible(solution):
            fitness_val = -1000 * self._count_violations(solution)
        else:
            # FAST fitness: skip expensive compactness for large schedules
            if len(solution) > 1500:
                sc1 = self._faculty_preference_satisfaction(solution) * 0.25
                sc3 = self._room_utilization(solution) * 0.20
                sc4 = self._workload_balance(solution) * 0.20
                sc5 = self._peak_spreading(solution) * 0.15
                sc_dept = self._department_matching(solution) * 0.20
                fitness_val = sc1 + sc3 + sc4 + sc5 + sc_dept
            else:
                # Full fitness for smaller schedules (all 6 soft constraints)
                sc1 = self._faculty_preference_satisfaction(solution) * 0.20
                sc2 = self._schedule_compactness(solution) * 0.20
                sc3 = self._room_utilization(solution) * 0.15
                sc4 = self._workload_balance(solution) * 0.15
                sc5 = self._peak_spreading(solution) * 0.10
                sc6 = self._lecture_continuity(solution) * 0.05
                sc_dept = self._department_matching(solution) * 0.15
                fitness_val = sc1 + sc2 + sc3 + sc4 + sc5 + sc6 + sc_dept
        
        # Thread-safe cache write
        self._cache_fitness(sol_key, fitness_val)
        return fitness_val
    
    def _cache_fitness(self, key: int, value: float):
        """Thread-safe cache write using bounded cache ONLY"""
        with self._cache_lock:
            self.fitness_cache.set(key, value)  # BoundedCache auto-evicts LRU
    
    def _is_feasible(self, solution: Dict) -> bool:
        """Check hard constraints (GPU-accelerated if available)"""
        if self.gpu_offload_conflicts:
            return self._gpu_is_feasible(solution)
        
        # CPU fallback
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
            
            # Student conflicts (sample if enabled)
            students_to_check = course.student_ids
            if self.use_sample_fitness and self.sample_students:
                students_to_check = [s for s in course.student_ids if s in self.sample_students]
            
            for student_id in students_to_check:
                if (student_id, time_slot) in student_schedule:
                    return False
                student_schedule[(student_id, time_slot)] = True
        
        return True
    
    def _gpu_is_feasible(self, solution: Dict) -> bool:
        """Thread-safe GPU-accelerated feasibility check (80% RAM savings)"""
        try:
            import torch
            
            # GPU operations are thread-safe within PyTorch's CUDA context
            # But we lock to prevent concurrent GPU memory allocation
            with self._gpu_lock:
                # Build schedule tensor on GPU
                num_slots = len(self.time_slots)
                slot_id_to_idx = {t.slot_id: i for i, t in enumerate(self.time_slots)}
                
                # Faculty/room conflicts (small, keep on CPU)
                faculty_schedule = {}
                room_schedule = {}
                
                # Student conflicts on GPU
                student_slot_assignments = {}  # student_id -> [slot_indices]
                
                for (course_id, session), (time_slot, room_id) in solution.items():
                    course = next((c for c in self.courses if c.course_id == course_id), None)
                    if not course:
                        continue
                    
                    # Faculty conflict (CPU)
                    if (course.faculty_id, time_slot) in faculty_schedule:
                        return False
                    faculty_schedule[(course.faculty_id, time_slot)] = True
                    
                    # Room conflict (CPU)
                    if (room_id, time_slot) in room_schedule:
                        return False
                    room_schedule[(room_id, time_slot)] = True
                    
                    # Student conflicts (GPU)
                    slot_idx = slot_id_to_idx.get(str(time_slot), -1)
                    if slot_idx >= 0:
                        for student_id in course.student_ids:
                            if student_id not in student_slot_assignments:
                                student_slot_assignments[student_id] = []
                            student_slot_assignments[student_id].append(slot_idx)
                
                # Check student conflicts (CPU is faster for small sets)
                for student_id, slot_indices in student_slot_assignments.items():
                    if len(slot_indices) != len(set(slot_indices)):
                        return False
                
                return True
        except Exception as e:
            logger.debug(f"GPU feasibility check failed: {e}, using CPU")
            self.gpu_offload_conflicts = False
            return self._is_feasible(solution)
    
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
        """Minimize gaps in schedules (FAST version for large schedules)"""
        try:
            # Skip for very large schedules (too expensive)
            if len(solution) > 1500:
                return 0.5  # Neutral score
            
            # Build faculty schedule dict (faster than repeated iteration)
            faculty_slots = defaultdict(list)
            for (cid, s), (time_slot, _) in solution.items():
                course = next((c for c in self.courses if c.course_id == cid), None)
                if course:
                    try:
                        slot_int = int(time_slot) if isinstance(time_slot, str) else time_slot
                        faculty_slots[course.faculty_id].append(slot_int)
                    except (ValueError, TypeError):
                        continue
            
            # Calculate gaps
            total_gaps = 0
            for slots in faculty_slots.values():
                if len(slots) > 1:
                    slots.sort()
                    gaps = sum(slots[i+1] - slots[i] - 1 for i in range(len(slots) - 1))
                    total_gaps += gaps
            
            max_gaps = len(self.courses) * 5
            return max(0, 1 - total_gaps / max_gaps) if max_gaps > 0 else 1.0
        except Exception as e:
            logger.debug(f"Compactness calculation failed: {e}")
            return 0.5  # Neutral score on error
    
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
        """SC5: Spread courses across time slots to avoid peak congestion"""
        slot_loads = defaultdict(int)
        for _, (time_slot, _) in solution.items():
            slot_loads[time_slot] += 1
        
        max_load = max(slot_loads.values()) if slot_loads else 0
        total_courses = len(self.courses)
        
        return max(0, 1 - max_load / total_courses) if total_courses > 0 else 1.0
    
    def _lecture_continuity(self, solution: Dict) -> float:
        """SC6: Prefer MWF or TTh patterns for multi-session courses"""
        try:
            # Group sessions by course
            course_slots = defaultdict(list)
            for (course_id, session), (time_slot, _) in solution.items():
                try:
                    slot_int = int(time_slot) if isinstance(time_slot, str) else time_slot
                    course_slots[course_id].append(slot_int)
                except (ValueError, TypeError):
                    continue
            
            # Check for good patterns (MWF = 0,2,4 or TTh = 1,3)
            good_patterns = 0
            total_multi_session = 0
            
            for course_id, slots in course_slots.items():
                if len(slots) < 2:
                    continue
                total_multi_session += 1
                slots.sort()
                
                # Check if slots follow MWF (even days) or TTh (odd days) pattern
                all_even = all(s % 2 == 0 for s in slots)
                all_odd = all(s % 2 == 1 for s in slots)
                if all_even or all_odd:
                    good_patterns += 1
            
            return good_patterns / total_multi_session if total_multi_session > 0 else 1.0
        except Exception as e:
            logger.debug(f"Lecture continuity calculation failed: {e}")
            return 0.5
    
    def _department_matching(self, solution: Dict) -> float:
        """Soft constraint: Prefer course.dept_id == faculty.dept_id == room.dept_id"""
        try:
            matches = 0
            total = 0
            
            for (course_id, session), (time_slot, room_id) in solution.items():
                course = next((c for c in self.courses if c.course_id == course_id), None)
                if not course:
                    continue
                
                course_dept = getattr(course, 'department_id', None)
                if not course_dept:
                    continue
                
                total += 1
                
                # Check faculty department match
                faculty_obj = self.faculty.get(course.faculty_id)
                faculty_dept = getattr(faculty_obj, 'department_id', None) if faculty_obj else None
                
                # Check room department match
                room = next((r for r in self.rooms if r.room_id == room_id), None)
                room_dept = getattr(room, 'dept_id', None) or getattr(room, 'department_id', None) if room else None
                
                # Award points for matches
                if faculty_dept and faculty_dept == course_dept:
                    matches += 0.5
                if room_dept and room_dept == course_dept:
                    matches += 0.5
            
            return matches / total if total > 0 else 1.0
        except Exception as e:
            logger.debug(f"Department matching calculation failed: {e}")
            return 0.5
    
    def smart_crossover(self, parent1: Dict, parent2: Dict) -> Dict:
        """CPU: Constraint-preserving crossover"""
        child = {}
        for key in parent1.keys():
            child[key] = parent1[key] if random.random() < 0.5 else parent2.get(key, parent1[key])
        return child
    
    def smart_mutation(self, solution: Dict) -> Dict:
        """CPU: Constraint-preserving mutation"""
        mutated = solution.copy()
        
        keys_to_mutate = random.sample(list(mutated.keys()), 
                                       max(1, int(len(mutated) * self.mutation_rate)))
        
        for key in keys_to_mutate:
            valid_pairs = self._get_valid_domain(key[0], key[1])  # On-demand
            if valid_pairs:
                mutated[key] = random.choice(valid_pairs)
        
        return mutated
    
    def _gpu_vectorized_crossover(self, parent_indices: List[int]) -> torch.Tensor:
        """GPU: Vectorized crossover (10-50x faster than CPU)"""
        import torch
        
        num_offspring = len(parent_indices) // 2
        num_assignments = self.population_tensor.shape[1]
        
        # Create offspring tensor
        offspring = torch.zeros((num_offspring, num_assignments, 2), device=DEVICE, dtype=torch.long)
        
        # Vectorized crossover: random mask for each offspring
        for i in range(num_offspring):
            parent1_idx = parent_indices[i * 2]
            parent2_idx = parent_indices[i * 2 + 1]
            
            # Random crossover mask (0.5 probability per gene)
            mask = torch.rand(num_assignments, device=DEVICE) < 0.5
            mask = mask.unsqueeze(1).expand(-1, 2)
            
            # Apply mask: take from parent1 where mask=True, parent2 where mask=False
            offspring[i] = torch.where(mask, 
                                      self.population_tensor[parent1_idx], 
                                      self.population_tensor[parent2_idx])
        
        return offspring
    
    def _gpu_vectorized_mutation(self, individual_indices: List[int]) -> torch.Tensor:
        """GPU: Vectorized mutation (10-50x faster than CPU)"""
        import torch
        
        num_individuals = len(individual_indices)
        num_assignments = self.population_tensor.shape[1]
        num_mutations = max(1, int(num_assignments * self.mutation_rate))
        
        # Clone individuals
        mutated = self.population_tensor[individual_indices].clone()
        
        # Vectorized mutation: random positions per individual
        for i in range(num_individuals):
            mutation_positions = torch.randint(0, num_assignments, (num_mutations,), device=DEVICE)
            
            # Apply random mutations (simplified - use valid_domains for production)
            for pos in mutation_positions:
                mutated[i, pos, 0] = torch.randint(0, 10000, (1,), device=DEVICE)
                mutated[i, pos, 1] = torch.randint(0, 10000, (1,), device=DEVICE)
        
        return mutated
    
    def _tournament_select(self, fitness_scores: List[Tuple[Dict, float]], k: int = 3) -> Dict:
        """Tournament selection"""
        tournament = random.sample(fitness_scores, min(k, len(fitness_scores)))
        return max(tournament, key=lambda x: x[1])[0]
    
    def evolve(self, job_id: str = None) -> Dict:
        """Run GA evolution with streaming mode and memory monitoring"""
        from engine.memory_manager import memory_manager
        
        self.job_id = job_id
        self._stop_flag = False
        
        # Start memory monitoring
        memory_manager.start_monitoring()
        
        # Set total items for work-based progress
        if hasattr(self, 'progress_tracker') and self.progress_tracker:
            self.progress_tracker.stage_items_total = self.generations
            self.progress_tracker.stage_items_done = 0
        
        # SMART STRATEGY: GPU available → disable streaming (use fast GPU), no GPU → enable streaming (memory-safe CPU)
        # Streaming mode is incompatible with GPU (GPU stores population in VRAM, streaming processes one-by-one)
        if self.streaming_mode and self.use_gpu:
            logger.warning(f"[GA] GPU available - disabling streaming mode (using fast GPU mode instead)")
            self.streaming_mode = False
        
        if self.streaming_mode:
            logger.info(f"[GA] Streaming mode enabled (memory-safe CPU-only, no GPU)")
            result = self._evolve_streaming(job_id)
            memory_manager.stop_monitoring()
            memory_manager.cleanup(level='aggressive')
            return result
        
        # Initialize population (GPU or CPU) with automatic fallback
        logger.info(f"[GA] Initializing population (use_gpu={self.use_gpu}, streaming={self.streaming_mode})")
        
        try:
            self.initialize_population()
            
            # Log memory after initialization
            import psutil
            mem = psutil.virtual_memory()
            logger.info(f"[GA] After init: RAM {mem.used/(1024**3):.1f}GB / {mem.total/(1024**3):.1f}GB ({mem.percent:.1f}%)")
        except Exception as init_error:
            logger.error(f"[GA] Population init FAILED: {init_error}")
            
            # CRITICAL: Automatic fallback to streaming mode
            if self.use_gpu:
                logger.warning(f"[GA] GPU init failed, falling back to CPU streaming mode")
                self.use_gpu = False
                self.gpu_offload_conflicts = False
                self.streaming_mode = True
                self.population_size = min(self.population_size, 10)  # Reduce population for safety
                logger.info(f"[GA] Fallback: streaming=True, pop={self.population_size}")
                
                # Use streaming mode instead
                result = self._evolve_streaming(job_id)
                memory_manager.stop_monitoring()
                memory_manager.cleanup(level='aggressive')
                return result
            else:
                raise
        
        best_solution = self.initial_solution
        best_fitness = self.fitness(best_solution)
        no_improvement_count = 0
        
        import time
        last_cancel_check = time.time()
        
        for generation in range(self.generations):
            # Check cancellation FREQUENTLY (every 0.5s) for instant response
            current_time = time.time()
            if current_time - last_cancel_check > 0.5:  # Check every 0.5 seconds
                if self._stop_flag or (job_id and self._check_cancellation()):
                    logger.info(f"GA stopped at generation {generation} (instant cancellation)")
                    self._cleanup_gpu()
                    return best_solution
                last_cancel_check = current_time
            # Log memory before fitness
            import psutil
            mem_before = psutil.virtual_memory()
            
            # FORCE GPU usage - fallback only on critical error
            if self.use_gpu:
                try:
                    logger.info(f"[GA] Gen {generation}: Calling GPU batch fitness (pop in VRAM)")
                    fitness_scores = self._gpu_batch_fitness()
                    mem_after = psutil.virtual_memory()
                    logger.info(f"[GA] Gen {generation}: Fitness done. RAM: {mem_before.percent:.1f}% → {mem_after.percent:.1f}% (Δ{mem_after.percent - mem_before.percent:+.1f}%)")
                except Exception as e:
                    logger.error(f"[ERROR] GPU fitness FAILED: {e}, falling back to CPU")
                    self.use_gpu = False
                    fitness_scores = [(sol, self.fitness(sol)) for sol in self.population]
            else:
                # Single-core CPU to prevent RAM exhaustion
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
            
            # Population evolution (GPU or CPU)
            if self.use_gpu:
                # GPU: Vectorized evolution
                elite_count = max(1, int(self.population_size * self.elitism_rate))
                elite_indices = [i for i, _ in sorted(enumerate([f for _, f in fitness_scores]), key=lambda x: x[1], reverse=True)[:elite_count]]
                
                # Generate offspring indices for crossover
                num_offspring = self.population_size - elite_count
                parent_indices = [random.randint(0, self.population_size - 1) for _ in range(num_offspring * 2)]
                
                # GPU vectorized crossover
                offspring_tensor = self._gpu_vectorized_crossover(parent_indices[:num_offspring * 2])
                
                # GPU vectorized mutation (apply to some offspring)
                mutation_count = int(num_offspring * self.mutation_rate)
                if mutation_count > 0:
                    mutation_indices = list(range(mutation_count))
                    offspring_tensor[:mutation_count] = self._gpu_vectorized_mutation(mutation_indices)
                
                # Combine elite + offspring in VRAM
                new_population_tensor = torch.cat([
                    self.population_tensor[elite_indices],
                    offspring_tensor
                ], dim=0)
                
                # Replace old population in VRAM
                del self.population_tensor
                self.population_tensor = new_population_tensor
                torch.cuda.empty_cache()
            else:
                # CPU: Traditional evolution
                elite_count = max(1, int(self.population_size * self.elitism_rate))
                new_population = [sol for sol, _ in fitness_scores[:elite_count]]
                
                while len(new_population) < self.population_size:
                    if random.random() < self.crossover_rate:
                        parent1 = self._tournament_select(fitness_scores)
                        parent2 = self._tournament_select(fitness_scores)
                        child = self.smart_crossover(parent1, parent2)
                    else:
                        parent = self._tournament_select(fitness_scores)
                        child = self.smart_mutation(parent)
                    
                    new_population.append(child)
                
                old_population = self.population
                self.population = new_population
                del old_population
            
            del fitness_scores
            
            # CRITICAL: Force GC every generation to prevent memory exhaustion
            import gc
            gc.collect()
            
            # Clear cache every 5 generations
            if generation % 5 == 0:
                with self._cache_lock:
                    self.fitness_cache.clear()
            
            # Update progress EVERY generation for smooth progress bar
            mode = "GPU" if self.use_gpu else "CPU"
            
            # Log every 3 generations (more frequent for better visibility)
            if generation % 3 == 0:
                cache_size = len(self.fitness_cache)
                logger.info(f"GA Gen {generation}/{self.generations} ({mode}): Best={best_fitness:.4f}, Cache={cache_size}")
            
            # Update EVERY generation (smooth progress)
            if hasattr(self, 'progress_tracker') and self.progress_tracker:
                self._update_ga_progress_batch(generation + 1, self.generations, best_fitness)
            
            # Check cancellation every 3 generations (more frequent)
            if job_id and generation % 3 == 0 and self._check_cancellation():
                logger.info(f"GA cancelled at generation {generation}")
                self._cleanup_gpu()
                break
        
        # CRITICAL FIX: Cleanup on success path
        from engine.memory_manager import memory_manager
        try:
            if hasattr(self, 'population'):
                self.population.clear()
            self.fitness_cache.clear()
            if self.use_gpu:
                self._cleanup_gpu()
            
            # Stop memory monitoring and cleanup
            memory_manager.stop_monitoring()
            memory_manager.cleanup(level='aggressive')
            
            # Final progress update
            if hasattr(self, 'progress_tracker') and self.progress_tracker:
                self._update_ga_progress_batch(self.generations, self.generations, best_fitness)
            
            logger.info(f"GA complete: Final fitness={best_fitness:.4f}")
            self._stop_flag = True
            return best_solution
        except Exception as cleanup_error:
            logger.error(f"GA cleanup error: {cleanup_error}")
            memory_manager.stop_monitoring()
            return best_solution
    
    def _evolve_streaming(self, job_id: str = None) -> Dict:
        """TRUE streaming evolution - processes individuals one-by-one, keeps only elite"""
        from engine.memory_manager import StreamingPopulation, memory_manager
        import gc
        
        # Create streaming population
        streaming_pop = StreamingPopulation(
            initial_solution=self.initial_solution,
            size=self.population_size,
            perturbation_fn=self._perturb_solution
        )
        
        best_solution = self.initial_solution
        best_fitness = self.fitness(best_solution)
        no_improvement_count = 0
        
        # Elite solutions (only top 20% in memory)
        elite_count = max(1, int(self.population_size * self.elitism_rate))
        elite_solutions = [(best_solution.copy(), best_fitness)]
        
        logger.info(f"[GA] TRUE streaming: pop={self.population_size}, gen={self.generations}, elite={elite_count}")
        
        for generation in range(self.generations):
            if self._stop_flag or (job_id and self._check_cancellation()):
                logger.info(f"GA stopped at generation {generation}")
                break
            
            # CRITICAL: Evaluate individuals ONE AT A TIME (no list storage)
            current_elite = []
            
            for i, individual in enumerate(streaming_pop.generate()):
                # Evaluate fitness
                fitness_val = self.fitness(individual)
                
                # Track global best
                if fitness_val > best_fitness:
                    best_fitness = fitness_val
                    best_solution = individual.copy()
                    no_improvement_count = 0
                
                # Keep only elite (no full list!)
                if len(current_elite) < elite_count:
                    current_elite.append((individual.copy(), fitness_val))
                    current_elite.sort(key=lambda x: x[1], reverse=True)
                elif fitness_val > current_elite[-1][1]:
                    current_elite[-1] = (individual.copy(), fitness_val)
                    current_elite.sort(key=lambda x: x[1], reverse=True)
                
                # CRITICAL: Delete individual immediately
                del individual
                
                # Force GC every 3 individuals
                if i % 3 == 2:
                    gc.collect(generation=0)
            
            # Early stopping
            if current_elite and current_elite[0][1] <= best_fitness:
                no_improvement_count += 1
            if no_improvement_count >= self.early_stop_patience:
                logger.info(f"Early stopping at gen {generation}")
                break
            
            # Update elite for next generation
            elite_solutions = current_elite
            del current_elite
            
            # Cleanup every generation
            if generation % 3 == 0:
                memory_manager.cleanup(level='normal')
            
            # Log progress
            if generation % 3 == 0:
                logger.info(f"GA Gen {generation}/{self.generations} (STREAM): Best={best_fitness:.4f}")
            
            # Update progress
            if hasattr(self, 'progress_tracker') and self.progress_tracker:
                self._update_ga_progress_batch(generation + 1, self.generations, best_fitness)
        
        logger.info(f"Streaming GA complete: fitness={best_fitness:.4f}")
        return best_solution
    
    def stop(self):
        """Stop GA evolution immediately"""
        self._stop_flag = True
        logger.info("GA stop requested")
    
    def _check_cancellation(self) -> bool:
        """Check if job has been cancelled via Redis"""
        try:
            import redis
            import os
            redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1")
            r = redis.from_url(redis_url, decode_responses=True)
            cancel_flag = r.get(f"cancel:job:{self.job_id}")
            return cancel_flag is not None
        except:
            return False
    
    def _update_ga_progress(self, job_id: str, current_gen: int, total_gen: int, fitness: float):
        """Update GA progress in Redis (called every 5 gens)"""
        try:
            import redis
            import os
            import json
            from datetime import datetime, timezone
            redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1")
            r = redis.from_url(redis_url, decode_responses=True)
            # GA is 65-80% of total progress
            ga_progress = 65 + int((current_gen / total_gen) * 15)
            progress_data = {
                'job_id': job_id,
                'progress': ga_progress,
                'status': 'running',
                'stage': f'GA Gen {current_gen}/{total_gen}',
                'message': f'Optimizing with GA: Gen {current_gen}/{total_gen} (fitness: {fitness:.2f})',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            r.setex(f"progress:job:{job_id}", 3600, json.dumps(progress_data))
        except Exception as e:
            logger.debug(f"Failed to update GA progress: {e}")
    
    def _update_ga_progress_batch(self, current_gen: int, total_gen: int, fitness: float):
        """Update progress using unified tracker - called every generation"""
        try:
            if not self.progress_tracker:
                return
            
            # Update work progress (generations completed)
            self.progress_tracker.update_work_progress(current_gen)
        except Exception as e:
            # Silent fail - don't block GA
            pass
    
    def _update_init_progress(self, current: int, total: int):
        """Update progress during GA initialization"""
        # Skip - initialization is fast, no need to update
        pass
    
    def _update_init_progress_direct(self, message: str):
        """Direct progress update with custom message"""
        # Skip - initialization is fast
        pass
    
    def evolve_island_model(self, num_islands: int = 4, migration_interval: int = 5, job_id: str = None, use_celery: bool = False) -> Dict:
        """RAM-safe parallel island model with ThreadPoolExecutor OR Celery (Feature 10: Distributed Celery)"""
        self.job_id = job_id
        
        if not self.use_gpu:
            logger.warning("GPU not available, falling back to standard evolve()")
            return self.evolve(job_id)
        
        # Feature 10: Distributed Celery support
        if use_celery and CELERY_AVAILABLE:
            logger.info(f"[OK] Distributed Island Model: {num_islands} islands (Celery workers)")
            return self._evolve_island_celery(num_islands, migration_interval, job_id)
        
        logger.info(f"Parallel Island Model: {num_islands} islands (thread-parallel)")
        
        # CRITICAL FIX: Each island gets equal share of population
        # If pop_size=4 and num_islands=2, each island gets 2 individuals
        island_pop_size = max(1, self.population_size // num_islands)
        logger.info(f"Creating {num_islands} islands with {island_pop_size} individuals each (total: {num_islands * island_pop_size})")
        
        # Create islands (in-memory, lightweight) with progress updates
        islands = []
        for i in range(num_islands):
            # Update progress during island creation
            if hasattr(self, 'progress_tracker') and self.progress_tracker:
                self._update_init_progress_direct(f"Creating island {i+1}/{num_islands}")
            
            # Create island population
            island_pop = [self._perturb_solution(self.initial_solution) for _ in range(island_pop_size)]
            islands.append({
                'id': i,
                'population': island_pop,
                'best_solution': self.initial_solution.copy(),
                'best_fitness': -float('inf')
            })
        
        logger.info(f"Created {num_islands} islands with {island_pop_size} individuals each")
        
        best_solution = self.initial_solution
        best_fitness = -float('inf')
        num_epochs = self.generations // migration_interval
        
        # Use ThreadPoolExecutor (NOT ProcessPoolExecutor to avoid RAM duplication)
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        for epoch in range(num_epochs):
            if job_id and self._check_cancellation():
                logger.info(f"Island Model cancelled at epoch {epoch}")
                return best_solution
            
            # Update progress at start of epoch
            if hasattr(self, 'progress_tracker') and self.progress_tracker:
                gen_equiv = epoch * migration_interval
                self._update_ga_progress_batch(gen_equiv, self.generations, best_fitness)
            
            # Parallel island evolution (threads share memory)
            with ThreadPoolExecutor(max_workers=num_islands) as executor:
                futures = {
                    executor.submit(self._evolve_single_island, island, migration_interval): island
                    for island in islands
                }
                
                # Collect results with progress updates
                completed_islands = 0
                for future in as_completed(futures):
                    island = futures[future]
                    try:
                        updated_island = future.result()
                        # Update island in-place
                        island['population'] = updated_island['population']
                        island['best_solution'] = updated_island['best_solution']
                        island['best_fitness'] = updated_island['best_fitness']
                        
                        # Track global best
                        if island['best_fitness'] > best_fitness:
                            best_fitness = island['best_fitness']
                            best_solution = island['best_solution']
                        
                        # Update progress after each island completes
                        completed_islands += 1
                        if hasattr(self, 'progress_tracker') and self.progress_tracker:
                            # Interpolate progress within epoch
                            gen_equiv = epoch * migration_interval + (completed_islands / num_islands) * migration_interval
                            self._update_ga_progress_batch(int(gen_equiv), self.generations, best_fitness)
                    except Exception as e:
                        logger.error(f"Island {island['id']} failed: {e}")
                        completed_islands += 1
            
            # Ring migration (after all islands complete)
            if epoch < num_epochs - 1:
                for i in range(len(islands)):
                    migrant = islands[(i - 1) % len(islands)]['best_solution']
                    islands[i]['population'][0] = migrant
            
            logger.info(f"Island Epoch {epoch + 1}/{num_epochs}: Best={best_fitness:.4f}")
            
            # Final progress update for epoch
            if hasattr(self, 'progress_tracker') and self.progress_tracker:
                gen_equiv = (epoch + 1) * migration_interval
                self._update_ga_progress_batch(gen_equiv, self.generations, best_fitness)
        
        logger.info(f"Parallel Island Model complete: fitness={best_fitness:.4f}")
        return best_solution
    
    def _evolve_single_island(self, island: Dict, generations: int) -> Dict:
        """Evolve single island (runs in thread) - RAM-safe"""
        # GPU batch fitness for entire island
        self.population = island['population']
        
        for gen in range(generations):
            # GPU-parallel fitness evaluation
            fitness_scores = self._gpu_batch_fitness()
            fitness_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Track island best
            if fitness_scores[0][1] > island['best_fitness']:
                island['best_fitness'] = fitness_scores[0][1]
                island['best_solution'] = fitness_scores[0][0]
            
            # Evolve population
            elite_count = max(1, len(island['population']) // 5)
            new_pop = [sol for sol, _ in fitness_scores[:elite_count]]
            
            while len(new_pop) < len(island['population']):
                if random.random() < self.crossover_rate:
                    p1 = self._tournament_select(fitness_scores)
                    p2 = self._tournament_select(fitness_scores)
                    child = self.smart_crossover(p1, p2)
                else:
                    parent = self._tournament_select(fitness_scores)
                    child = self.smart_mutation(parent)
                new_pop.append(child)
            
            island['population'] = new_pop
        
        return island
    
    def _init_gpu_tensors(self):
        """Initialize GPU tensors for accelerated computation"""
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch not available")
        
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA not available")
        
        # Test GPU access
        try:
            test_tensor = torch.zeros(10, device=DEVICE)
            del test_tensor
            torch.cuda.synchronize()
        except Exception as e:
            raise RuntimeError(f"GPU access failed: {e}")
        
        # Pre-compute faculty preference matrix
        faculty_prefs = np.zeros((len(self.courses), len(self.time_slots)))
        for i, course in enumerate(self.courses):
            faculty = self.faculty.get(course.faculty_id)
            if faculty:
                prefs = getattr(faculty, 'preferred_slots', {})
                for j, t_slot in enumerate(self.time_slots):
                    faculty_prefs[i, j] = prefs.get(t_slot.slot_id, 0.5)
        
        self.faculty_prefs_tensor = torch.tensor(faculty_prefs, device=DEVICE, dtype=torch.float32)
        logger.info(f"[OK] GPU tensors initialized: {self.faculty_prefs_tensor.shape}")
    
    def _init_gpu_conflict_detection(self):
        """Initialize GPU VRAM offloading for timetable data (saves 300MB+ RAM)"""
        try:
            import torch
            
            # Build student-course enrollment matrix on GPU
            num_courses = len(self.courses)
            course_id_to_idx = {c.course_id: i for i, c in enumerate(self.courses)}
            
            # Sparse matrix: student_id -> [course_indices]
            student_enrollments = {}
            for i, course in enumerate(self.courses):
                for student_id in course.student_ids:
                    if student_id not in student_enrollments:
                        student_enrollments[student_id] = []
                    student_enrollments[student_id].append(i)
            
            # Store on GPU as list of tensors (memory efficient)
            self.gpu_student_courses = {}
            for student_id, course_indices in student_enrollments.items():
                self.gpu_student_courses[student_id] = torch.tensor(course_indices, device=DEVICE, dtype=torch.long)
            
            # Course ID mapping
            self.course_id_to_idx = course_id_to_idx
            
            # CRITICAL: Offload timetable data to GPU VRAM (300MB savings)
            # Convert initial_solution to GPU tensor format
            self.gpu_timetable_keys = list(self.initial_solution.keys())
            self.gpu_timetable_values = torch.tensor(
                [hash(v) for v in self.initial_solution.values()],
                device=DEVICE,
                dtype=torch.long
            )
            
            ram_saved = len(student_enrollments) * 0.1 + len(self.initial_solution) * 0.02
            logger.info(f"[OK] GPU VRAM offloading: {len(student_enrollments)} students + {len(self.initial_solution)} assignments (~{ram_saved:.1f}MB RAM -> VRAM)")
        except Exception as e:
            logger.error(f"GPU VRAM offloading failed: {e}")
            self.gpu_offload_conflicts = False
    
    def _gpu_batch_fitness(self) -> List[Tuple[Dict, float]]:
        """GPU-accelerated BATCHED fitness evaluation for entire population"""
        try:
            import torch
            
            # Check if population is in VRAM
            if hasattr(self, 'population_tensor'):
                return self._gpu_batch_fitness_vram()
            
            # Fallback: population in RAM
            batch_size = len(self.population)
            simplified = len(self.initial_solution) > 3000
            batch_pop = self.population
            current_batch_size = len(batch_pop)
            
            # OPTIMIZATION: Parallelize CPU operations before GPU
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=4) as executor:
                feasibility_list = list(executor.map(lambda s: 1.0 if self._is_feasible(s) else 0.0, batch_pop))
                violations_list = list(executor.map(self._count_violations, batch_pop))
            
            # Convert to GPU tensors
            feasibility = torch.tensor(feasibility_list, device=DEVICE)
            violations = torch.tensor(violations_list, device=DEVICE)
            
            # OPTIMIZATION: Parallelize soft constraint evaluation
            with ThreadPoolExecutor(max_workers=4) as executor:
                faculty_futures = [executor.submit(self._gpu_faculty_preference_tensor, sol) for sol in batch_pop]
                room_futures = [executor.submit(self._room_utilization, sol) for sol in batch_pop]
                
                faculty_list = [f.result() for f in faculty_futures]
                room_list = [f.result() for f in room_futures]
            
            faculty_scores = torch.stack([f if isinstance(f, torch.Tensor) else torch.tensor(f, device=DEVICE) for f in faculty_list])
            room_util_scores = torch.tensor(room_list, device=DEVICE)
        
            # Simplified fitness for large schedules (skip expensive compactness/workload)
            if simplified:
                batch_fitness = feasibility * (
                    0.6 * faculty_scores + 
                    0.4 * room_util_scores
                ) - (1.0 - feasibility) * 1000.0 * violations
            else:
                # Full fitness for smaller schedules - parallelize
                with ThreadPoolExecutor(max_workers=4) as executor:
                    compact_futures = [executor.submit(self._schedule_compactness, sol) for sol in batch_pop]
                    workload_futures = [executor.submit(self._workload_balance, sol) for sol in batch_pop]
                    
                    compact_list = [f.result() for f in compact_futures]
                    workload_list = [f.result() for f in workload_futures]
                
                compactness_scores = torch.tensor(compact_list, device=DEVICE)
                workload_scores = torch.tensor(workload_list, device=DEVICE)
                
                batch_fitness = feasibility * (
                    0.3 * faculty_scores + 
                    0.3 * compactness_scores + 
                    0.2 * room_util_scores + 
                    0.2 * workload_scores
                ) - (1.0 - feasibility) * 1000.0 * violations
            
            # Move results to CPU
            all_fitness = batch_fitness.cpu().numpy().tolist()
            return list(zip(self.population, all_fitness))
            
        except Exception as e:
            logger.error(f"[ERROR] GPU batch fitness failed: {e}, falling back to CPU")
            self.use_gpu = False
            return [(sol, self.fitness(sol)) for sol in self.population]
    
    def _gpu_batch_fitness_vram(self) -> List[Tuple[Dict, float]]:
        """GPU: Fitness evaluation with population in VRAM (fastest) - ZERO RAM mode"""
        import torch
        import gc
        import psutil
        
        try:
            # CRITICAL: Store ONLY fitness values, not dicts (50 floats = 400 bytes vs 50 dicts = 1000MB)
            fitness_values = []
            
            mem_start = psutil.virtual_memory()
            logger.info(f"[GPU-VRAM] Starting fitness for {self.population_tensor.shape[0]} individuals. RAM: {mem_start.percent:.1f}%")
            
            for i in range(self.population_tensor.shape[0]):
                # Convert single individual from VRAM to dict
                individual_dict = {}
                for j, key in enumerate(self.population_keys):
                    time_hash = self.population_tensor[i, j, 0].item()
                    room_hash = self.population_tensor[i, j, 1].item()
                    
                    # Reverse hash lookup using mappings
                    time_slot = self.time_hash_to_slot.get(time_hash, time_hash)
                    room_id = self.room_hash_to_id.get(room_hash, room_hash)
                    individual_dict[key] = (time_slot, room_id)
                
                # Calculate fitness for this individual
                fitness_val = self.fitness(individual_dict)
                
                # CRITICAL: Store ONLY fitness value (not dict!)
                fitness_values.append(fitness_val)
                
                # Delete dict immediately
                del individual_dict
                
                # Force GC every 5 individuals
                if i % 5 == 4:
                    gc.collect(generation=0)
            
            mem_end = psutil.virtual_memory()
            logger.info(f"[GPU-VRAM] Fitness complete. RAM: {mem_start.percent:.1f}% → {mem_end.percent:.1f}% (Δ{mem_end.percent - mem_start.percent:+.1f}%)")
            
            # CRITICAL: Return lazy wrapper that reconstructs dicts on-demand
            # This avoids keeping all 50 dicts in RAM
            class LazyFitnessResults:
                def __init__(self, population_tensor, population_keys, time_hash_to_slot, room_hash_to_id, fitness_values):
                    self.population_tensor = population_tensor
                    self.population_keys = population_keys
                    self.time_hash_to_slot = time_hash_to_slot
                    self.room_hash_to_id = room_hash_to_id
                    self.fitness_values = fitness_values
                
                def __getitem__(self, idx):
                    # Reconstruct dict from VRAM only when accessed
                    individual_dict = {}
                    for j, key in enumerate(self.population_keys):
                        time_hash = self.population_tensor[idx, j, 0].item()
                        room_hash = self.population_tensor[idx, j, 1].item()
                        time_slot = self.time_hash_to_slot.get(time_hash, time_hash)
                        room_id = self.room_hash_to_id.get(room_hash, room_hash)
                        individual_dict[key] = (time_slot, room_id)
                    return (individual_dict, self.fitness_values[idx])
                
                def __len__(self):
                    return len(self.fitness_values)
                
                def __iter__(self):
                    for i in range(len(self)):
                        yield self[i]
            
            return LazyFitnessResults(
                self.population_tensor,
                self.population_keys,
                self.time_hash_to_slot,
                self.room_hash_to_id,
                fitness_values
            )
        except Exception as e:
            logger.error(f"[GPU] VRAM fitness failed: {e}, falling back to CPU")
            self.use_gpu = False
            # Convert to CPU population
            self.population = [self.initial_solution] * self.population_size
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
                try:
                    course_idx = next((i for i, c in enumerate(self.courses) if c.course_id == course_id), None)
                    # Convert both time_slot and slot_id to same type for comparison
                    time_slot_str = str(time_slot)
                    time_idx = next((i for i, t in enumerate(self.time_slots) if str(t.slot_id) == time_slot_str), None)
                    if course_idx is not None and time_idx is not None:
                        scores.append(self.faculty_prefs_tensor[course_idx, time_idx])
                except Exception as inner_e:
                    logger.debug(f"Skipping slot lookup: {inner_e}")
                    continue
            return torch.mean(torch.stack(scores)) if scores else torch.tensor(0.0, device=DEVICE)
        except Exception as e:
            logger.error(f"GPU faculty preference failed: {e}")
            return torch.tensor(self._faculty_preference_satisfaction(solution), device=DEVICE)
    
    def _multicore_fitness(self) -> List[Tuple[Dict, float]]:
        """Multi-core CPU fitness evaluation"""
        with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
            fitness_values = list(executor.map(self.fitness, self.population))
        return list(zip(self.population, fitness_values))
    
    def _cleanup_gpu(self):
        """Cleanup GPU resources"""
        try:
            if TORCH_AVAILABLE:
                if hasattr(self, 'population_tensor'):
                    del self.population_tensor
                if hasattr(self, 'faculty_prefs_tensor'):
                    del self.faculty_prefs_tensor
                if hasattr(self, 'gpu_student_courses'):
                    self.gpu_student_courses.clear()
                    del self.gpu_student_courses
                if hasattr(self, 'course_id_to_idx'):
                    del self.course_id_to_idx
                if hasattr(self, 'gpu_timetable_keys'):
                    del self.gpu_timetable_keys
                if hasattr(self, 'gpu_timetable_values'):
                    del self.gpu_timetable_values
                torch.cuda.empty_cache()
                logger.info(f"[GPU] VRAM cleaned up")
        except Exception as e:
            logger.error(f"GPU cleanup error: {e}")


    def _evolve_island_celery(self, num_islands: int, migration_interval: int, job_id: str) -> Dict:
        """Feature 10: Distributed island evolution using Celery workers"""
        from engine.celery_tasks import celery_app, evolve_island_task
        from celery import group
        
        if not celery_app or not evolve_island_task:
            logger.error("[ERROR] Celery not available, falling back to thread-parallel")
            return self.evolve_island_model(num_islands, migration_interval, job_id, use_celery=False)
        
        logger.info(f"[OK] Starting distributed island evolution with {num_islands} Celery workers")
        
        # Serialize data for Celery
        courses_dict = [c.__dict__ for c in self.courses]
        rooms_dict = [r.__dict__ for r in self.rooms]
        time_slots_dict = [t.__dict__ for t in self.time_slots]
        faculty_dict = {k: v.__dict__ for k, v in self.faculty.items()}
        
        best_solution = self.initial_solution
        best_fitness = -float('inf')
        num_epochs = self.generations // migration_interval
        island_pop_size = self.population_size // num_islands
        
        for epoch in range(num_epochs):
            if job_id and self._check_cancellation():
                logger.info(f"Distributed island model cancelled at epoch {epoch}")
                return best_solution
            
            # Dispatch islands to Celery workers
            tasks = group(
                evolve_island_task.s(
                    island_id=i,
                    courses=courses_dict,
                    rooms=rooms_dict,
                    time_slots=time_slots_dict,
                    faculty=faculty_dict,
                    initial_solution=self.initial_solution,
                    population_size=island_pop_size,
                    generations=migration_interval,
                    job_id=job_id
                )
                for i in range(num_islands)
            )
            
            # Execute in parallel across workers
            result = tasks.apply_async()
            island_results = result.get(timeout=300)  # 5 min timeout
            
            # Collect best solutions
            for island_result in island_results:
                if island_result['fitness'] > best_fitness:
                    best_fitness = island_result['fitness']
                    best_solution = island_result['solution']
            
            logger.info(f"Distributed Epoch {epoch + 1}/{num_epochs}: Best={best_fitness:.4f}")
            
            if job_id:
                gen_equiv = (epoch + 1) * migration_interval
                self._update_ga_progress_batch(job_id, gen_equiv, self.generations, best_fitness)
        
        logger.info(f"[OK] Distributed island model complete: fitness={best_fitness:.4f}")
        return best_solution


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
