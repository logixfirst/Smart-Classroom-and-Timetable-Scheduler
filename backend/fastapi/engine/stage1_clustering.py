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
            logger.info(
                "[CLUSTER] Adaptive edge threshold=%.2f  available_ram=%.1f GB",
                self.EDGE_THRESHOLD, available_gb,
            )
        else:
            self.EDGE_THRESHOLD = edge_threshold
    
    def cluster_courses(self, courses: List[Course]) -> Dict[int, List[Course]]:
        """
        Cluster courses using Louvain community detection
        Returns: Dictionary mapping cluster_id -> list of courses
        
        NOTE: Cancellation handled by CancellationToken in saga (Google/Meta pattern)
        This method focuses on clustering logic only
        """
        import time as _t

        logger.info(
            "[CLUSTER] cluster_courses START  courses=%d  target_size=%d"
            "  edge_threshold=%.2f",
            len(courses), self.target_cluster_size, self.EDGE_THRESHOLD,
        )

        # Build constraint graph
        _t0 = _t.perf_counter()
        logger.info(
            "[CLUSTER] Building constraint graph  courses=%d", len(courses)
        )
        G = self._build_constraint_graph(courses)
        logger.info(
            "[CLUSTER] Constraint graph built  nodes=%d  edges=%d  elapsed=%.2fs",
            len(G.nodes), len(G.edges), _t.perf_counter() - _t0,
        )

        # Run Louvain clustering
        _t0 = _t.perf_counter()
        logger.info("[CLUSTER] Running Louvain community detection")
        partition = self._run_louvain(G)
        n_raw_communities = len(set(partition.values())) if partition else 0
        logger.info(
            "[CLUSTER] Louvain done  raw_communities=%d  elapsed=%.2fs",
            n_raw_communities, _t.perf_counter() - _t0,
        )

        # Optimize cluster sizes
        _t0 = _t.perf_counter()
        logger.info(
            "[CLUSTER] Optimizing cluster sizes  raw_communities=%d",
            n_raw_communities,
        )
        final_clusters = self._optimize_cluster_sizes(partition, courses)
        logger.info(
            "[CLUSTER] Cluster optimization done  final_clusters=%d  elapsed=%.2fs",
            len(final_clusters), _t.perf_counter() - _t0,
        )

        logger.info(
            "[CLUSTER] cluster_courses DONE  clusters=%d  total_courses=%d",
            len(final_clusters), len(courses),
        )
        return final_clusters
    
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
        logger.info(
            "[CLUSTER-GRAPH] Building constraint graph  courses=%d  workers=%d",
            len(courses), num_workers,
        )
        
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

        logger.info(
            "[CLUSTER-GRAPH] Graph complete  nodes=%d  edges_added=%d",
            len(G.nodes), edges_added,
        )
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
        NEP 2020 FIX: Student-overlap driven clustering for cross-enrollment support
        
        Priority:
        1. Student overlap (PRIMARY) - Courses with shared students MUST be in same cluster
        2. Faculty sharing (SECONDARY) - Same faculty courses should cluster together
        3. Room features (TERTIARY) - Special room requirements
        4. Department boundaries REMOVED - No longer relevant for NEP 2020
        """
        weight = 0.0
        
        # PRIMARY: Student overlap (NEP 2020 cross-enrollment is critical)
        students_i = set(getattr(course_i, 'student_ids', []))
        students_j = set(getattr(course_j, 'student_ids', []))
        
        if students_i and students_j:
            shared = len(students_i & students_j)
            
            if shared > 0:
                # Use smaller class size as denominator for overlap ratio
                min_size = min(len(students_i), len(students_j))
                student_overlap_ratio = shared / min_size  # 0.0 to 1.0
                
                # HIGH weight: 100x base (10x higher than before)
                # This ensures cross-enrolled students' courses are in SAME cluster
                # so CP-SAT can prevent conflicts
                weight += 100.0 * student_overlap_ratio
                
                # Extra weight for high overlap (lab sections, etc.)
                if student_overlap_ratio > 0.5:
                    weight += 50.0
        
        # SECONDARY: Faculty sharing
        # Courses by same faculty should be in same cluster (easier to schedule)
        if getattr(course_i, 'faculty_id', None) == getattr(course_j, 'faculty_id', None):
            weight += 50.0
        
        # TERTIARY: Room features (only for specialized equipment)
        # Courses needing same special rooms should cluster together
        features_i = set(getattr(course_i, 'required_features', []))
        features_j = set(getattr(course_j, 'required_features', []))
        if features_i and features_j and features_i & features_j:
            weight += 10.0
        
        # REMOVED: Department affinity
        # NEP 2020: Department boundaries don't matter for scheduling
        # Students take courses across departments - no more silos!
        
        return weight
    
    def _run_louvain(self, G: nx.Graph) -> Dict:
        """Run Louvain community detection.

        Falls back to sequential-index partitioning on *any* failure so that
        a missing package, an isolated-node graph (which raises ValueError in
        community_louvain), or any other runtime error never surfaces as the
        "[DeptSolver] Clustering failed" warning that forces a single-cluster
        fallback and stresses CP-SAT.
        """
        try:
            import community as community_louvain

            # best_partition raises ValueError on empty / fully-isolated graphs
            if len(G.nodes) == 0:
                return {}

            # Run Louvain with fixed seed for reproducibility
            partition = community_louvain.best_partition(G, weight='weight', random_state=42)

            # Calculate modularity
            modularity = community_louvain.modularity(partition, G, weight='weight')
            logger.debug(f"Louvain modularity: {modularity:.3f}")

            return partition

        except ImportError:
            logger.warning("python-louvain not available, using sequential-chunk fallback")
            return self._sequential_fallback(G)
        except Exception as exc:
            logger.warning(
                "Louvain partitioning failed (%s: %s) — using sequential-chunk fallback",
                type(exc).__name__, exc,
            )
            return self._sequential_fallback(G)

    def _sequential_fallback(self, G: nx.Graph) -> Dict:
        """Assign nodes to clusters in insertion order in chunks of target_cluster_size.

        Returns a partition dict identical in shape to community_louvain output
        (node_id → cluster_int).  This is a deterministic O(N) operation that
        never fails, replacing the old _department_fallback which required a
        'course' attribute on graph nodes that was never actually set.
        """
        partition = {}
        for idx, node_id in enumerate(G.nodes()):
            partition[node_id] = idx // self.target_cluster_size
        return partition
    
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
        
        # Target: 10-15 courses per cluster (Google/Meta standard)
        MAX_CLUSTER_SIZE = 15  # Reduced from 25
        MIN_CLUSTER_SIZE = 5   # Reduced from 8
        MERGE_SIZE = 10        # Reduced from 12
        
        for cluster_courses in raw_clusters.values():
            if len(cluster_courses) > MAX_CLUSTER_SIZE:
                # Split very large clusters into 10-15 course chunks
                for i in range(0, len(cluster_courses), 12):
                    chunk = cluster_courses[i:i+12]
                    if len(chunk) >= MIN_CLUSTER_SIZE or i + 12 >= len(cluster_courses):
                        final_clusters[final_id] = chunk
                        final_id += 1
            elif len(cluster_courses) < MIN_CLUSTER_SIZE:
                # Collect small clusters for merging
                small_clusters.extend(cluster_courses)
            else:
                # Keep medium-sized clusters (5-15 courses)
                final_clusters[final_id] = cluster_courses
                final_id += 1
        
        # Clear raw_clusters to free memory
        raw_clusters.clear()
        
        # Merge small clusters into ~10 course groups
        if small_clusters:
            for i in range(0, len(small_clusters), MERGE_SIZE):
                final_clusters[final_id] = small_clusters[i:i+MERGE_SIZE]
                final_id += 1
        
        # Log cluster size distribution
        sizes = [len(cluster) for cluster in final_clusters.values()]
        avg_size = sum(sizes) / len(sizes) if sizes else 0
        logger.info(f"Cluster sizes: min={min(sizes) if sizes else 0}, max={max(sizes) if sizes else 0}, avg={avg_size:.1f}")
        
        return final_clusters
