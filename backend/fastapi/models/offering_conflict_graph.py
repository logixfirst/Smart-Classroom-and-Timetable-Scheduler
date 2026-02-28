"""
OfferingConflictGraph — core data structure for resource-aware conflict detection.

A conflict pair (A, B) exists when offerings A and B share at least ONE resource:
  - A student enrolled in both  → student conflict
  - A teacher assigned to both  → teacher conflict

Two offerings with NO shared students AND NO shared teachers have NO entry in
conflict_pairs — the CP-SAT solver may schedule them at the same time slot.

This is the architectural fix for the root-cause bug:
  OLD: "any two courses in same slot = conflict"  ← WRONG
  NEW: "only courses sharing a resource conflict" ← CORRECT

Design invariants:
  - Built ONCE per generation job
  - Immutable after construction (frozenset)
  - O(1) membership test via frozenset hash lookup
  - O(1) neighbour lookup via pre-built adjacency dict
  - No DB calls, no side effects — purely a data structure
"""
from __future__ import annotations

import logging
from typing import Dict, FrozenSet, Set, Tuple

logger = logging.getLogger(__name__)


def _canonical(a: str, b: str) -> Tuple[str, str]:
    """Return (min, max) so that (A,B) and (B,A) map to the same tuple."""
    return (a, b) if a < b else (b, a)


class OfferingConflictGraph:
    """
    Adjacency set of offerings that must NOT share a time slot.

    Internal storage: FrozenSet[Tuple[str, str]] where each tuple is
    (min_offering_id, max_offering_id) — canonical form ensures uniqueness.

    Membership test `must_not_overlap(A, B)` is O(1) hash lookup.
    Neighbour lookup `get_conflicts_for_offering(X)` is O(1) dict hit.
    """

    def __init__(self, conflict_pairs: Set[Tuple[str, str]]) -> None:
        # Normalize all pairs to canonical form before freezing
        normalized = frozenset(_canonical(a, b) for (a, b) in conflict_pairs)
        self._pairs: FrozenSet[Tuple[str, str]] = normalized

        # Build adjacency index for O(1) neighbour queries
        self._adj: Dict[str, Set[str]] = {}
        for a, b in self._pairs:
            self._adj.setdefault(a, set()).add(b)
            self._adj.setdefault(b, set()).add(a)

        logger.info(
            "[ConflictGraph] Built",
            extra={
                "conflict_pairs": len(self._pairs),
                "offerings_with_conflicts": len(self._adj),
            },
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def must_not_overlap(self, offering_a: str, offering_b: str) -> bool:
        """
        Return True iff A and B share at least one resource.

        Two offerings that return False CAN legally run at the same slot.
        This is the key correctness guarantee of the new architecture.
        """
        return _canonical(offering_a, offering_b) in self._pairs

    def get_conflict_count(self) -> int:
        """Total number of conflict pairs stored."""
        return len(self._pairs)

    def get_conflicts_for_offering(self, offering_id: str) -> Set[str]:
        """
        All offering_ids that conflict with the given one.
        Returns empty set if no conflicts (O(1) dict lookup).
        """
        return self._adj.get(offering_id, set())

    def __repr__(self) -> str:
        return (
            f"OfferingConflictGraph("
            f"pairs={len(self._pairs)}, "
            f"offerings={len(self._adj)})"
        )
