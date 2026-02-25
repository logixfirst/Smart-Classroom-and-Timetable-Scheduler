"""
CP-SAT Solver Strategies
Progressive relaxation — each strategy layer adds constraints.
Updated to include new constraint flags for BUG 1/2 and MISS 6 fixes.
"""
from typing import List, Dict


# Strategy 0: Full constraints — all hard constraints active
# Strategy 1: Relax student (CRITICAL only) + skip workload
# Strategy 2: Minimum — faculty + room only, no per-day or workload
# Timeout ladder (OPT3): 30s → 45s → 60s → 90s (ascending — fail fast, escalate time)
# Observed: strategy 1 finds solution in 18-27s; 30s gives 3-12s buffer.
# If strategy 1 fails in >30s it was infeasible anyway — move to relaxed sooner.
# Normal case: 18-27s (unchanged). Failure path: 225s vs old 240s (15s faster).
STRATEGIES: List[Dict] = [
    {
        "name": "Full Constraints",
        "student_priority": "ALL",          # HC4: all student conflicts
        "faculty_conflicts": True,           # HC1
        "room_capacity": True,               # HC2
        "workload_constraints": True,        # HC3 (BUG 2 FIX)
        "max_sessions_per_day": True,        # HC5 (MISS 6 FIX)
        "timeout": 30,                       # OPT3: was 60 — solutions found in 18-27s
        "max_constraints": 10000,
        "student_limit": None
    },
    {
        "name": "Relaxed Student (Critical Only)",
        "student_priority": "CRITICAL",     # HC4: only students in 5+ courses
        "faculty_conflicts": True,
        "room_capacity": True,
        "workload_constraints": True,        # HC3 still enforced
        "max_sessions_per_day": True,        # HC5 still enforced
        "timeout": 45,                       # OPT3: was 60 — ascending ladder
        "max_constraints": 8000,
        "student_limit": 500
    },
    {
        "name": "Faculty + Room Only",
        "student_priority": "NONE",         # HC4: skip (performance mode)
        "faculty_conflicts": True,
        "room_capacity": True,
        "workload_constraints": False,       # Relax workload
        "max_sessions_per_day": False,       # Relax per-day limit
        "timeout": 60,                       # OPT3: was 45 — ascending ladder
        "max_constraints": 5000,
        "student_limit": 0
    },
    {
        "name": "Minimal Hard Constraints Only",
        "student_priority": "NONE",
        "faculty_conflicts": True,           # HC1 always enforced
        "room_capacity": False,              # Relax room
        "workload_constraints": False,
        "max_sessions_per_day": False,
        "timeout": 90,                       # OPT3: was 30 — emergency fallback needs most time
        "max_constraints": 1000,
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
    Select appropriate starting strategy based on cluster size.
    Smaller clusters can afford full constraints; larger ones start relaxed.
    """
    if cluster_size <= 10:
        return STRATEGIES[0]   # Full constraints
    elif cluster_size <= 20:
        return STRATEGIES[1]   # Relaxed student
    elif cluster_size <= 30:
        return STRATEGIES[2]   # Faculty + Room
    else:
        return STRATEGIES[3]   # Minimal
