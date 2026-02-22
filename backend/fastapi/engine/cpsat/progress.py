"""
CP-SAT Progress Logging
Logging helpers for CP-SAT solver events.
Following Google/Meta standards: One file = one responsibility
"""
import logging

logger = logging.getLogger(__name__)


def log_cluster_start(cluster_id: int, course_count: int, slot_count: int) -> None:
    """Log cluster solving start"""
    logger.info(f"[CP-SAT] Starting cluster {cluster_id}: {course_count} courses, {slot_count} slots")


def log_cluster_success(cluster_id: int, solve_time: float) -> None:
    """Log successful cluster solve"""
    logger.info(f"[CP-SAT] Cluster {cluster_id} solved in {solve_time:.2f}s")
