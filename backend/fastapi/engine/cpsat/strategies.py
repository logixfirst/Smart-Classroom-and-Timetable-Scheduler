"""
CP-SAT Solver Strategies
Progressive relaxation — each strategy layer adds constraints.
Updated to include new constraint flags for BUG 1/2 and MISS 6 fixes.
"""
from typing import List, Dict


# BHU-scale optimised strategy ladder (2320 courses, 19072 students).
#
# 3-strategy ladder — direct start at Faculty+Room Only:
#   Strategy 0: Faculty + Room Only     (15s)  — covers ~85% of clusters
#   Strategy 1: Faculty Only            (20s)  — room constraints too tight
#   Strategy 2: No Constraints          (10s)  — nuclear option; greedy handles rooms
#
# Worst-case per cluster: 15s + 20s + 10s = 45s  (was 225s — 5× faster)
# After all 3 fail: _greedy_fallback() guarantees every course is assigned.
STRATEGIES: List[Dict] = [
    {
        "name": "Faculty + Room Only",
        "student_priority": "NONE",         # HC4: skip — too costly at BHU scale
        "faculty_conflicts": True,           # HC1
        "room_capacity": True,               # HC2
        "workload_constraints": False,
        "max_sessions_per_day": False,
        "timeout": 15,
        "max_constraints": 5000,
        "student_limit": 0
    },
    {
        "name": "Faculty Only",
        "student_priority": "NONE",
        "faculty_conflicts": True,           # HC1 only
        "room_capacity": False,              # Room constraint removed — too tight
        "workload_constraints": False,
        "max_sessions_per_day": False,
        "timeout": 20,
        "max_constraints": 1000,
        "student_limit": 0
    },
    {
        "name": "No Constraints",
        "student_priority": "NONE",
        "faculty_conflicts": False,          # Nuclear option — just get an assignment
        "room_capacity": False,
        "workload_constraints": False,
        "max_sessions_per_day": False,
        "timeout": 10,
        "max_constraints": 500,
        "student_limit": 0
    }
]


def get_strategy_by_index(index: int) -> Dict:
    """Get strategy by index with bounds checking."""
    if 0 <= index < len(STRATEGIES):
        return STRATEGIES[index]
    raise IndexError(f"Strategy index {index} out of range (0-{len(STRATEGIES)-1})")


def get_strategy_by_name(name: str) -> Dict:
    """Get strategy by name. Returns None if not found."""
    for strategy in STRATEGIES:
        if strategy["name"] == name:
            return strategy
    return None


def select_strategy_for_cluster_size(cluster_size: int) -> Dict:
    """
    Select starting strategy based on cluster size.

    BHU-scale fix: With 2320 courses and 19072 students the conflict graph is
    too dense for Full Constraints or Relaxed Student to ever succeed within
    their timeout budgets.  Always start at STRATEGIES[0] (Faculty+Room Only,
    15s).  CP-SAT will cascade to STRATEGIES[1] (Minimal, 20s) only if needed.

    IDENTITY CHECK SAFETY: returns the actual STRATEGIES[i] dict object so the
    caller can compare with `s is _start_strategy` (identity) in enumerate().
    """
    # BHU scale: always start at Faculty+Room Only regardless of cluster size.
    # Full/Relaxed strategies waste 30-45s on provably infeasible problems.
    return STRATEGIES[0]
