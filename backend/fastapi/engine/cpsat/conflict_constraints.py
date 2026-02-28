"""
conflict_constraints.py — resource-aware CP-SAT no-overlap constraints.

REPLACES the old "any two courses at the same slot = conflict" logic with:
  "only courses sharing a RESOURCE (student | teacher | room) conflict"

Three separate, independently testable predicates:
  has_teacher_conflict(registry, teacher_id, slot_id)
  has_room_conflict(registry, room_id, slot_id)
  has_student_group_conflict(registry, student_ids, slot_id)

And the main CP-SAT injection function:
  add_no_overlap_constraints(model, slot_vars, conflict_graph, offering_ids)

Key correctness guarantee:
  - If offering pair NOT in conflict_graph.conflict_pairs → NO constraint added
  - Two courses sharing zero resources CAN legally run at the same slot ✓
  - Two courses sharing any resource CANNOT run at the same slot ✓
"""
from __future__ import annotations

import logging
from typing import Dict, List

from ortools.sat.python import cp_model

from models.offering_conflict_graph import OfferingConflictGraph
from engine.cpsat.committed_registry import CommittedResourceRegistry

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Main CP-SAT injection
# ---------------------------------------------------------------------------

def add_no_overlap_constraints(
    model: cp_model.CpModel,
    slot_vars: Dict[str, cp_model.IntVar],
    conflict_graph: OfferingConflictGraph,
    offering_ids: List[str],
) -> int:
    """
    Add no-overlap constraints for all conflicting offering pairs present
    in this CP-SAT model.

    Only pairs in conflict_graph.conflict_pairs receive a constraint.
    Pairs NOT in the graph: no constraint → solver is free to co-schedule.

    Args:
        model:         CP-SAT model being constructed
        slot_vars:     offering_id → IntVar (assigned time-slot index)
        conflict_graph: Pre-built OfferingConflictGraph (built once per job)
        offering_ids:  All offering_ids in this model (for membership filter)

    Returns:
        Number of no-overlap constraints added.
    """
    offering_set = set(offering_ids)
    constraints_added = 0

    for offering_a, offering_b in conflict_graph._pairs:
        # Both must be present in this model's scope
        if offering_a not in offering_set or offering_b not in offering_set:
            continue
        if offering_a not in slot_vars or offering_b not in slot_vars:
            continue
        model.Add(slot_vars[offering_a] != slot_vars[offering_b])
        constraints_added += 1

    logger.info(
        "[conflict_constraints] No-overlap constraints added",
        extra={
            "constraints": constraints_added,
            "offerings_in_model": len(offering_ids),
            "graph_pairs_total": conflict_graph.get_conflict_count(),
        },
    )
    return constraints_added


# ---------------------------------------------------------------------------
# Standalone predicates — used by domain filtering and cross-dept solver
# ---------------------------------------------------------------------------

def has_teacher_conflict(
    registry: CommittedResourceRegistry,
    teacher_id: str,
    slot_id: str,
) -> bool:
    """
    Return True if teacher_id is already committed at slot_id.

    Used by CommittedAwareSolver._precompute_valid_domains() to pre-filter
    (slot, room) pairs before CP-SAT model construction.
    """
    return str(slot_id) in registry.get_blocked_slots_for_faculty(teacher_id)


def has_room_conflict(
    registry: CommittedResourceRegistry,
    room_id: str,
    slot_id: str,
) -> bool:
    """
    Return True if room_id is already occupied at slot_id.

    Called per (slot, room) candidate during domain filtering — O(1) per call.
    """
    return str(slot_id) in registry.get_blocked_slots_for_room(room_id)


def has_student_group_conflict(
    registry: CommittedResourceRegistry,
    student_ids: List[str],
    slot_id: str,
) -> bool:
    """
    Return True if ANY student in student_ids is already scheduled at slot_id.

    Short-circuits on first conflict found (most students are not in conflict,
    so the common case exits after the first iteration).
    """
    s = str(slot_id)
    for sid in student_ids:
        if s in registry.get_blocked_slots_for_student(sid):
            return True
    return False
