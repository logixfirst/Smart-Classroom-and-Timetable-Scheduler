"""
Stage 1: Louvain Community Detection Clustering
Graph-based clustering with weighted constraint graph
"""
import logging
import networkx as nx
import random
from typing import List, Dict, Tuple
from models.timetable_models import Course

logger = logging.getLogger(__name__)


class LouvainClusterer:
    """
    Louvain community detection for course clustering
    Optimizes cluster sizes for CP-SAT feasibility
    """
    
    def __init__(self, target_cluster_size: int = 10, edge_threshold: float = None):
        self.target_cluster_size = target_cluster_size
        self.progress_tracker = None  # Set externally for progress updates
        self.job_id = None
        self.redis_client = None
        # Adaptive edge threshold based on RAM
        if edge_threshold is None:
            import psutil
            mem = psutil.virtual_memory()
            available_gb = mem.available / (1024**3)
            if available_gb < 3.0:
                self.EDGE_THRESHOLD = 1.0  # Very sparse
            elif available_gb < 5.0:
                self.EDGE_THRESHOLD = 0.5  # Sparse
            elif available_gb < 8.0:
                self.EDGE_THRESHOLD = 0.3  # Medium
            else:
                self.EDGE_THRESHOLD = 0.1  # Dense
            logger.info(f"Adaptive edge threshold: {self.EDGE_THRESHOLD} (RAM: {available_gb:.1f}GB)")
        else:
            self.EDGE_THRESHOLD = edge_threshold
    
    def cluster_courses(self, courses: List[Course]) -> Dict[int, List[Course]]:
        """
        Cluster courses using Louvain community detection
        Returns: Dictionary mapping cluster_id -> list of courses
        """
        # Check cancellation at start
        if self._check_cancellation():
            raise InterruptedError("Job cancelled by user during clustering")
        
        # Build constraint graph (with progress update)
        logger.info(f"[STAGE1] Building constraint graph for {len(courses)} courses...")
        self._update_progress("Building constraint graph...")
        G = self._build_constraint_graph(courses)
        
        # Check cancellation after graph building
        if self._check_cancellation():
            raise InterruptedError("Job cancelled by user during clustering")
        
        # Run Louvain clustering (with progress update)
        logger.info(f"[STAGE1] Running Louvain community detection...")
        self._update_progress("Running Louvain detection...")
        partition = self._run_louvain(G)
        
        # Check cancellation after Louvain
        if self._check_cancellation():
            raise InterruptedError("Job cancelled by user during clustering")
        
        # Optimize cluster sizes (with progress update)
        logger.info(f"[STAGE1] Optimizing cluster sizes...")
        self._update_progress("Optimizing cluster sizes...")
        final_clusters = self._optimize_cluster_sizes(partition, courses)
        
        logger.info(f"[STAGE1] Louvain clustering: {len(final_clusters)} clusters from {len(courses)} courses")
        return final_clusters
    
    def _check_cancellation(self) -> bool:
        """Check if job has been cancelled via Redis"""
        try:
            if self.redis_client and self.job_id:
                cancel_flag = self.redis_client.get(f"cancel:job:{self.job_id}")
                if cancel_flag is not None and cancel_flag:
                    logger.info(f"[STAGE1] Cancellation detected for job {self.job_id}")
                    return True
        except Exception as e:
            logger.debug(f"[STAGE1] Cancellation check failed: {e}")
        return False
    
    def _update_progress(self, message: str):
        """Update progress via Redis for real-time updates"""
        try:
            if self.redis_client and self.job_id:
                import json
                from datetime import datetime, timezone
                progress_data = {
                    'job_id': self.job_id,
                    'stage': 'clustering',
                    'message': message,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                self.redis_client.publish(f"progress:{self.job_id}", json.dumps(progress_data))
                logger.info(f"[LOUVAIN] {message}")
        except Exception as e:
            logger.debug(f"Progress update failed: {e}")
    
    def _build_constraint_graph(self, courses: List[Course]) -> nx.Graph:
        """Build weighted constraint graph with parallel edge computation"""
        import multiprocessing
        from concurrent.futures import ThreadPoolExecutor
        
        G = nx.Graph()
        
        # Add nodes
        for course in courses:
            G.add_node(course.course_id)
        
        # Parallel edge computation (ThreadPoolExecutor to avoid pickle issues)
        num_workers = min(multiprocessing.cpu_count(), 8)
        logger.info(f"Building constraint graph for {len(courses)} courses with {num_workers} workers...")
        
        # Split courses into chunks for parallel processing
        chunk_size = max(1, len(courses) // num_workers)
        chunks = [(i, min(i + chunk_size, len(courses))) for i in range(0, len(courses), chunk_size)]
        
        # Parallel edge computation with ThreadPoolExecutor (shares memory, no pickle)
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [
                executor.submit(self._compute_edges_for_chunk, courses, start, end)
                for start, end in chunks
            ]
            
            edges_added = 0
            for future in futures:
                edges = future.result()
                G.add_weighted_edges_from(edges)
                edges_added += len(edges)
        
        logger.info(f"Built graph: {len(G.nodes)} nodes, {edges_added} edges")
        return G
    
    def _compute_edges_for_chunk(self, courses: List[Course], start: int, end: int) -> List[Tuple]:
        """Compute edges for a chunk of courses (runs in separate process)"""
        edges = []
        for i in range(start, end):
            course_i = courses[i]
            for j in range(i + 1, len(courses)):
                course_j = courses[j]
                weight = self._compute_constraint_weight(course_i, course_j)
                # SPARSE: Only add significant edges
                if weight > self.EDGE_THRESHOLD:
                    edges.append((course_i.course_id, course_j.course_id, weight))
        return edges
    
    def _compute_constraint_weight(self, course_i: Course, course_j: Course) -> float:
        """
        NEP 2020 FIX: Lighter clustering for interdisciplinary education
        Instead of forcing shared-student courses into same cluster,
        use softer weights that allow CP-SAT to handle cross-cluster conflicts
        """
        weight = 0.0
        
        # Student overlap - REDUCED for interdisciplinary education
        students_i = set(getattr(course_i, 'student_ids', []))
        students_j = set(getattr(course_j, 'student_ids', []))
        
        if students_i and students_j:
            shared = len(students_i & students_j)
            
            if shared > 0:
                # Use smaller class size as denominator
                min_size = min(len(students_i), len(students_j))
                student_overlap_ratio = shared / min_size  # 0.0 to 1.0
                
                # REDUCED: 10x base weight (was 100x) - softer clustering
                weight += 10.0 * student_overlap_ratio
                
                # Only cluster together if VERY high overlap (>80% of class)
                # This handles lab sections, not interdisciplinary electives
                if student_overlap_ratio > 0.8:
                    weight += 20.0
        
        # Faculty sharing (now PRIMARY for NEP 2020)
        # Courses by same faculty should be in same cluster (easier to schedule)
        if getattr(course_i, 'faculty_id', None) == getattr(course_j, 'faculty_id', None):
            weight += 50.0
        
        # Department affinity (secondary)
        # Same department courses likely have similar constraints
        if getattr(course_i, 'department_id', None) == getattr(course_j, 'department_id', None):
            weight += 15.0
        
        # Room features (tertiary)
        # Courses needing same special rooms should cluster together
        features_i = set(getattr(course_i, 'required_features', []))
        features_j = set(getattr(course_j, 'required_features', []))
        if features_i and features_j and features_i & features_j:
            weight += 8.0
        
        return weight
    
    def _run_louvain(self, G: nx.Graph) -> Dict:
        """Run Louvain community detection"""
        try:
            import community as community_louvain
            
            # Run Louvain with fixed seed for reproducibility
            partition = community_louvain.best_partition(G, weight='weight', random_state=42)
            
            # Calculate modularity
            modularity = community_louvain.modularity(partition, G, weight='weight')
            logger.info(f"Louvain modularity: {modularity:.3f}")
            
            return partition
            
        except ImportError:
            logger.warning("python-louvain not available, using department fallback")
            return self._department_fallback(G)
    
    def _department_fallback(self, G: nx.Graph) -> Dict:
        """Fallback clustering by department"""
        partition = {}
        dept_map = {}
        cluster_id = 0
        
        for node_id in G.nodes():
            course = G.nodes[node_id].get('course')
            if course:
                dept = getattr(course, 'department_id', 'default')
                if dept not in dept_map:
                    dept_map[dept] = cluster_id
                    cluster_id += 1
                partition[node_id] = dept_map[dept]
        
        return partition
    
    def _optimize_cluster_sizes(self, partition: Dict, courses: List[Course]) -> Dict[int, List[Course]]:
        """
        NEP 2020 FIX: Optimize cluster sizes for interdisciplinary education
        Target: Larger clusters (15-20 courses) to reduce cross-cluster conflicts
        """
        # Group courses by cluster (use course_id lookup dict for speed)
        course_map = {c.course_id: c for c in courses}
        raw_clusters = {}
        
        for course_id, cluster_id in partition.items():
            if cluster_id not in raw_clusters:
                raw_clusters[cluster_id] = []
            course = course_map.get(course_id)
            if course:
                raw_clusters[cluster_id].append(course)
        
        # Clear course_map to free memory
        del course_map
        
        # Optimize sizes - LARGER clusters for interdisciplinary
        final_clusters = {}
        final_id = 0
        small_clusters = []
        
        # Target: 15-20 courses per cluster (reduces cross-cluster conflicts)
        MAX_CLUSTER_SIZE = 25
        MIN_CLUSTER_SIZE = 8
        MERGE_SIZE = 12
        
        for cluster_courses in raw_clusters.values():
            if len(cluster_courses) > MAX_CLUSTER_SIZE:
                # Split very large clusters into 15-20 course chunks
                for i in range(0, len(cluster_courses), 18):
                    chunk = cluster_courses[i:i+18]
                    if len(chunk) >= MIN_CLUSTER_SIZE or i + 18 >= len(cluster_courses):
                        final_clusters[final_id] = chunk
                        final_id += 1
            elif len(cluster_courses) < MIN_CLUSTER_SIZE:
                # Collect small clusters for merging
                small_clusters.extend(cluster_courses)
            else:
                # Keep medium-sized clusters (8-25 courses)
                final_clusters[final_id] = cluster_courses
                final_id += 1
        
        # Clear raw_clusters to free memory
        raw_clusters.clear()
        
        # Merge small clusters into ~12 course groups
        if small_clusters:
            for i in range(0, len(small_clusters), MERGE_SIZE):
                final_clusters[final_id] = small_clusters[i:i+MERGE_SIZE]
                final_id += 1
        
        # Log cluster size distribution
        sizes = [len(cluster) for cluster in final_clusters.values()]
        avg_size = sum(sizes) / len(sizes) if sizes else 0
        logger.info(f"[NEP 2020] Cluster sizes: min={min(sizes) if sizes else 0}, max={max(sizes) if sizes else 0}, avg={avg_size:.1f}, total={len(final_clusters)}")
        
        return final_clusters
