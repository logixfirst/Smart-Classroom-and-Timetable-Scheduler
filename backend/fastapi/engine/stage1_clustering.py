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
    
    def __init__(self, target_cluster_size: int = 10, edge_threshold: float = None, progress_tracker=None):
        self.target_cluster_size = target_cluster_size
        self.progress_tracker = progress_tracker
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
        # Set total work items (3 phases: graph=50%, louvain=30%, optimize=20%)
        total_work = 100
        if self.progress_tracker:
            self.progress_tracker.stage_items_total = total_work
            self.progress_tracker.stage_items_done = 0
        
        # Build constraint graph (0-50%)
        G = self._build_constraint_graph(courses)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(50)
        
        # Run Louvain clustering (50-80%)
        partition = self._run_louvain(G)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(80)
        
        # Optimize cluster sizes (80-100%)
        final_clusters = self._optimize_cluster_sizes(partition, courses)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(100)
        
        logger.info(f"[STAGE1] Louvain clustering: {len(final_clusters)} clusters from {len(courses)} courses")
        return final_clusters
    
    def _build_constraint_graph(self, courses: List[Course]) -> nx.Graph:
        """Build weighted constraint graph with parallel edge computation"""
        import multiprocessing
        from concurrent.futures import ProcessPoolExecutor
        
        G = nx.Graph()
        
        # Add nodes
        for course in courses:
            G.add_node(course.course_id)
        
        # Parallel edge computation
        num_workers = min(multiprocessing.cpu_count(), 8)
        logger.info(f"Building constraint graph for {len(courses)} courses with {num_workers} workers...")
        
        # Split courses into chunks for parallel processing
        chunk_size = max(1, len(courses) // num_workers)
        chunks = [(i, min(i + chunk_size, len(courses))) for i in range(0, len(courses), chunk_size)]
        
        # Parallel edge computation with progress tracking
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = [
                executor.submit(self._compute_edges_for_chunk, courses, start, end)
                for start, end in chunks
            ]
            
            edges_added = 0
            completed_chunks = 0
            for future in futures:
                edges = future.result()
                G.add_weighted_edges_from(edges)
                edges_added += len(edges)
                
                # Update progress (graph building is 0-50% of clustering)
                completed_chunks += 1
                if self.progress_tracker:
                    progress = int(50 * completed_chunks / len(chunks))
                    self.progress_tracker.update_work_progress(progress)
        
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
        """Compute weighted edge between courses with early termination"""
        weight = 0.0
        
        # Faculty sharing (high weight) - EARLY RETURN for strong edges
        if getattr(course_i, 'faculty_id', None) == getattr(course_j, 'faculty_id', None):
            return 10.0  # Early termination on strong edge
        
        # Student overlap (NEP 2020 critical)
        students_i = set(getattr(course_i, 'student_ids', []))
        students_j = set(getattr(course_j, 'student_ids', []))
        if students_i and students_j:
            overlap = len(students_i & students_j) / max(len(students_i), len(students_j))
            weight += 10.0 * overlap
        
        # Department affinity
        if getattr(course_i, 'department_id', None) == getattr(course_j, 'department_id', None):
            weight += 5.0
        
        # Room competition (same required features)
        features_i = set(getattr(course_i, 'required_features', []))
        features_j = set(getattr(course_j, 'required_features', []))
        if features_i and features_j and features_i & features_j:
            weight += 3.0
        
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
        Optimize cluster sizes for CP-SAT feasibility
        Target: 10-12 courses per cluster
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
        
        # Optimize sizes
        final_clusters = {}
        final_id = 0
        small_clusters = []
        
        for cluster_courses in raw_clusters.values():
            if len(cluster_courses) > 12:
                # Split large clusters
                for i in range(0, len(cluster_courses), self.target_cluster_size):
                    final_clusters[final_id] = cluster_courses[i:i+self.target_cluster_size]
                    final_id += 1
            elif len(cluster_courses) < 5:
                # Collect small clusters for merging
                small_clusters.extend(cluster_courses)
            else:
                # Keep medium-sized clusters
                final_clusters[final_id] = cluster_courses
                final_id += 1
        
        # Clear raw_clusters to free memory
        raw_clusters.clear()
        
        # Merge small clusters
        if small_clusters:
            for i in range(0, len(small_clusters), 8):
                final_clusters[final_id] = small_clusters[i:i+8]
                final_id += 1
        
        # Log cluster size distribution
        sizes = [len(cluster) for cluster in final_clusters.values()]
        avg_size = sum(sizes) / len(sizes) if sizes else 0
        logger.info(f"Cluster sizes: min={min(sizes) if sizes else 0}, max={max(sizes) if sizes else 0}, avg={avg_size:.1f}")
        
        return final_clusters
