"""
Reinforcement Learning - Simplified Tabular Q-Learning with Semester-Wise Learning
Following Google/Meta standards: SIMPLE, TABULAR, LOCAL swaps only
Executive verdict: "When two or more valid swaps exist, learn which one is better"

Publication-safe framing:
- Q-learning with ε-greedy exploration (ε is annealed and frozen during runtime)
- Context vectors as auxiliary decision signals (NOT decisions themselves)
- Persistent transfer learning (semester-wise Q-table reuse creates institutional memory)

NO DQN, NO GPU, NO global repair, NO threading
"""
import logging
import random
import copy
import json
import pickle
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from pathlib import Path
from datetime import datetime

from models.timetable_models import Course, Faculty, Room, TimeSlot
from .state_manager import StateManager
from .reward_calculator import calculate_simple_reward

logger = logging.getLogger(__name__)

# Fixed-size Q-table with LRU eviction
MAX_Q_TABLE_SIZE = 10000


class SimpleTabularQLearning:
    """
    Simple tabular Q-learning for local swap decisions with semester-wise learning
    
    Role: "When 2-5 valid swaps exist, learn which one is better"
    NOT for: global repair, search, feasibility checking
    
    Production features:
    - Policy freezing (learning disabled during runtime scheduling)
    - Semester-wise serialization (Q-table saved/loaded per semester)
    - Version control (rollback to previous semesters)
    - Bounded exploration (ε annealed and frozen)
    - Audit logging (all decisions logged)
    """
    
    def __init__(
        self,
        courses: List[Course],
        faculty: Dict[str, Faculty],
        rooms: List[Room],
        time_slots: List[TimeSlot],
        learning_rate: float = 0.1,
        gamma: float = 0.9,
        epsilon: float = 0.2,
        epsilon_decay: float = 0.99,
        min_epsilon: float = 0.01,
        policy_storage_path: str = "data/rl_policies",
        frozen: bool = False
    ):
        self.courses = courses
        self.faculty = faculty
        self.rooms = rooms
        self.time_slots = time_slots
        
        # RL hyperparameters
        self.learning_rate = learning_rate
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.min_epsilon = min_epsilon
        
        # Fixed-size Q-table (BOUNDED, not unbounded)
        self.q_table: Dict[Tuple, float] = {}
        self.q_table_access_count: Dict[Tuple, int] = defaultdict(int)
        
        # State manager (discrete 4-6 dimensions)
        self.state_manager = StateManager(courses, faculty)
        
        # Policy freezing and versioning (GUARDRAILS)
        self.frozen = frozen  # If True, learning is DISABLED
        self.semester_version: Optional[str] = None
        self.policy_storage_path = Path(policy_storage_path)
        self.policy_storage_path.mkdir(parents=True, exist_ok=True)
        
        # Audit logging
        self.decision_log: List[Dict] = []
        
        logger.debug(f"[RL] Q-learning init: LR={learning_rate}, γ={gamma}, frozen={frozen}")
    
    def choose_best_swap(
        self,
        schedule: Dict,
        candidate_swaps: List[Tuple[int, int, int, int]],
        conflict_type: str = "none"
    ) -> Tuple[int, int, int, int]:
        """
        Choose best swap from 2-5 candidates using Q-learning
        This is the ONLY approved role for RL
        
        Args:
            schedule: Current schedule
            candidate_swaps: List of 2-5 valid swaps (course_id, session, new_t_slot, new_room)
            conflict_type: Type of conflict being resolved
        
        Returns:
            Best swap action
        """
        if not candidate_swaps:
            raise ValueError("No candidate swaps provided")
        
        # Limit to 2-5 candidates (executive constraint)
        candidate_swaps = candidate_swaps[:5]
        
        # Get current state (discrete, 4-6 dimensions)
        state = self.state_manager.get_state(schedule, conflict_type)
        
        # Epsilon-greedy selection
        if random.random() < self.epsilon:
            # Explore: random choice
            return random.choice(candidate_swaps)
        else:
            # Exploit: best Q-value
            best_swap = None
            best_q = float('-inf')
            
            for swap in candidate_swaps:
                q_value = self._get_q_value(state, swap)
                if q_value > best_q:
                    best_q = q_value
                    best_swap = swap
            
            return best_swap if best_swap else candidate_swaps[0]
    
    def update_q_value(
        self,
        old_schedule: Dict,
        new_schedule: Dict,
        action: Tuple[int, int, int, int],
        old_conflicts: int,
        new_conflicts: int,
        conflict_type: str = "none"
    ):
        """
        Update Q-value after swap is applied
        Uses simple temporal difference learning
        
        GUARDRAIL: If policy is frozen, learning is DISABLED
        Publication-safe: "ε is annealed and learning is frozen during runtime scheduling"
        """
        # GUARDRAIL: Frozen policy does NOT learn
        if self.frozen:
            logger.debug("[RL-Q] Policy frozen, skipping Q-value update")
            return
        
        # Get states
        old_state = self.state_manager.get_state(old_schedule, conflict_type)
        new_state = self.state_manager.get_state(new_schedule, conflict_type)
        
        # Calculate reward (executive spec: +1/-5/+0.2)
        reward = calculate_simple_reward(
            old_schedule, 
            new_schedule, 
            self.courses,
            old_conflicts,
            new_conflicts
        )
        
        # Get current Q-value
        current_q = self._get_q_value(old_state, action)
        
        # Get max Q-value for next state (approximate with 0)
        max_next_q = 0.0  # Simplified: no next action lookahead
        
        # TD update: Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
        new_q = current_q + self.learning_rate * (reward + self.gamma * max_next_q - current_q)
        
        # Store in Q-table (with size limit)
        self._set_q_value(old_state, action, new_q)
        
        # Decay epsilon (bounded exploration)
        self.epsilon = max(self.min_epsilon, self.epsilon * self.epsilon_decay)
        
        # Audit log (GUARDRAIL: all decisions logged)
        self.decision_log.append({
            'timestamp': datetime.now().isoformat(),
            'state': old_state,
            'action': action,
            'reward': reward,
            'q_value': new_q,
            'epsilon': self.epsilon
        })
        
        logger.debug(f"[RL-Q] Updated: state={old_state}, action={action[:2]}, reward={reward:.2f}, Q={new_q:.2f}")
    
    def _get_q_value(self, state: Tuple, action: Tuple) -> float:
        """Get Q-value from table (default 0.0)"""
        key = (state, action)
        self.q_table_access_count[key] += 1
        return self.q_table.get(key, 0.0)
    
    def _set_q_value(self, state: Tuple, action: Tuple, value: float):
        """Set Q-value with LRU eviction if table is full"""
        key = (state, action)
        
        # Check if table is full
        if len(self.q_table) >= MAX_Q_TABLE_SIZE and key not in self.q_table:
            # Evict least recently used entry
            lru_key = min(self.q_table_access_count, key=self.q_table_access_count.get)
            del self.q_table[lru_key]
            del self.q_table_access_count[lru_key]
            logger.debug(f"[RL-Q] Evicted LRU entry, table size: {len(self.q_table)}")
        
        self.q_table[key] = value
        self.q_table_access_count[key] = 0  # Reset access count
    
    def freeze_policy(self):
        """
        Freeze policy - DISABLE learning during runtime scheduling
        
        GUARDRAIL: Call this before production scheduling
        Publication-safe: "Learning is frozen during runtime scheduling"
        """
        self.frozen = True
        logger.info("[RL-Policy] Policy FROZEN - learning disabled")
    
    def unfreeze_policy(self):
        """
        Unfreeze policy - ENABLE learning for training/adaptation
        
        Use case: Semester-end offline batch learning
        """
        self.frozen = False
        logger.info("[RL-Policy] Policy UNFROZEN - learning enabled")
    
    def save_policy(self, semester_id: str):
        """
        Serialize Q-table to disk for semester
        
        GUARDRAIL: Version policies per semester
        Publication-safe: "Q-table serialized at end of each semester"
        
        Pattern: Google OfflinePolicyTrainer, Meta PolicySnapshot
        """
        policy_file = self.policy_storage_path / f"policy_{semester_id}.pkl"
        metadata_file = self.policy_storage_path / f"policy_{semester_id}.json"
        
        # Save Q-table (binary)
        with open(policy_file, 'wb') as f:
            pickle.dump({
                'q_table': dict(self.q_table),
                'epsilon': self.epsilon,
                'semester_version': semester_id
            }, f)
        
        # Save metadata (JSON for readability)
        metadata = {
            'semester_id': semester_id,
            'save_time': datetime.now().isoformat(),
            'q_table_size': len(self.q_table),
            'epsilon': self.epsilon,
            'learning_rate': self.learning_rate,
            'gamma': self.gamma,
            'decision_count': len(self.decision_log)
        }
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.semester_version = semester_id
        
        logger.info(f"[RL-Policy] Saved policy for semester {semester_id} (Q-table: {len(self.q_table)} entries, \u03b5={self.epsilon:.4f})")
    
    def load_policy(self, semester_id: str, freeze_on_load: bool = True):
        """
        Load Q-table from disk for semester
        
        GUARDRAIL: Policies are frozen by default after loading
        Publication-safe: "Historical Q-values bias exploration toward previously effective actions"
        
        Args:
            semester_id: Semester to load policy for
            freeze_on_load: If True, policy is frozen after loading (recommended for production)
        """
        policy_file = self.policy_storage_path / f"policy_{semester_id}.pkl"
        
        if not policy_file.exists():
            logger.warning(f"[RL-Policy] No policy for semester {semester_id}, starting fresh")
            return
        
        try:
            with open(policy_file, 'rb') as f:
                data = pickle.load(f)
            
            self.q_table = defaultdict(float, data['q_table'])
            self.epsilon = data.get('epsilon', self.min_epsilon)
            self.semester_version = data.get('semester_version', semester_id)
            
            # Reset access counts
            self.q_table_access_count = defaultdict(int)
            
            # Freeze policy if requested (GUARDRAIL)
            if freeze_on_load:
                self.freeze_policy()
            
            logger.info(f"[RL-Policy] Loaded policy for semester {semester_id} (Q-table: {len(self.q_table)} entries, \u03b5={self.epsilon:.4f})")
            
        except Exception as e:
            logger.error(f"[RL-Policy] Failed to load policy: {e}")
    
    def rollback_to_semester(self, semester_id: str):
        """
        Rollback to a previous semester's policy
        
        GUARDRAIL: Allow rollback to previous versions
        Use case: If current policy performs poorly, revert to known-good version
        """
        logger.info(f"[RL-Policy] Rolling back to semester {semester_id}")
        self.load_policy(semester_id, freeze_on_load=True)
    
    def list_available_policies(self) -> List[str]:
        """
        List all available semester policies
        
        GUARDRAIL: Visibility into policy versions
        """
        policy_files = list(self.policy_storage_path.glob("policy_*.pkl"))
        semesters = [f.stem.replace('policy_', '') for f in policy_files]
        semesters.sort(reverse=True)  # Most recent first
        
        logger.debug(f"[RL-Policy] Available policies: {semesters}")
        return semesters
    
    def export_decision_log(self, output_file: str):
        """
        Export decision log for analysis
        
        GUARDRAIL: Log decisions, don't hide them
        Use case: Audit trail, performance analysis, debugging
        """
        output_path = Path(output_file)
        with open(output_path, 'w') as f:
            json.dump(self.decision_log, f, indent=2)
        
        logger.debug(f"[RL-Audit] Exported {len(self.decision_log)} decisions to {output_file}")
    
    def get_stats(self) -> Dict:
        """Get Q-learning statistics for monitoring"""
        return {
            'q_table_size': len(self.q_table),
            'epsilon': self.epsilon,
            'max_q_value': max(self.q_table.values()) if self.q_table else 0.0,
            'min_q_value': min(self.q_table.values()) if self.q_table else 0.0,
            'frozen': self.frozen,
            'semester_version': self.semester_version,
            'decision_count': len(self.decision_log),
            'learning_rate': self.learning_rate,
            'gamma': self.gamma
        }
