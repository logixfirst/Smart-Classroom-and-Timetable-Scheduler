import numpy as np
from collections import defaultdict
import torch
import torch.nn as nn

class MultidimensionalContextEncoder:
    """Encodes timetable state into multidimensional context vector"""
    
    def __init__(self):
        self.feature_dims = {
            'temporal': 4,      # slot, day, time, week
            'course': 6,        # id, type, credits, year, cross_faculty, popularity
            'student': 6,       # count, distribution, cross_dept, gaps
            'faculty': 5,       # id, load, preference, gaps
            'room': 5,          # id, type, capacity, utilization, dept_match
            'constraint': 4,    # hard, soft, reserved_conflicts, dept_conflicts
            'historical': 3     # prev_slot, feedback, attendance
        }
        self.total_dims = sum(self.feature_dims.values())  # 33 dimensions
    
    def encode(self, state_dict):
        """Convert state dict to 33D vector"""
        vector = np.zeros(self.total_dims)
        idx = 0
        
        # Temporal features (4D)
        vector[idx:idx+4] = [
            state_dict.get('slot_id', 0) / 48,  # Normalize to [0,1]
            state_dict.get('day_of_week', 0) / 6,
            state_dict.get('time_of_day', 0) / 24,
            state_dict.get('week_number', 0) / 16
        ]
        idx += 4
        
        # Course features (6D)
        course_type_map = {'CORE': 0, 'ELECTIVE': 0.5, 'LAB': 1.0}
        vector[idx:idx+6] = [
            state_dict.get('course_id', 0) / 3000,
            course_type_map.get(state_dict.get('course_type', 'CORE'), 0),
            state_dict.get('course_credits', 0) / 6,
            state_dict.get('course_year', 0) / 4,
            float(state_dict.get('is_cross_faculty', False)),
            state_dict.get('enrolled_count', 0) / 500
        ]
        idx += 6
        
        # Student features (6D)
        year_dist = state_dict.get('student_year_distribution', [0,0,0,0])
        vector[idx:idx+6] = [
            state_dict.get('enrolled_count', 0) / 500,
            np.mean(year_dist) / 4,
            state_dict.get('cross_dept_students', 0) / 100,
            state_dict.get('avg_student_gap_before', 0) / 4,
            state_dict.get('avg_student_gap_after', 0) / 4,
            np.std(year_dist) / 2
        ]
        idx += 6
        
        # Faculty features (5D)
        vector[idx:idx+5] = [
            state_dict.get('faculty_id', 0) / 500,
            state_dict.get('faculty_load_current', 0) / 18,
            state_dict.get('faculty_preference_match', 0) / 100,
            state_dict.get('faculty_gap_before', 0) / 4,
            state_dict.get('faculty_gap_after', 0) / 4
        ]
        idx += 5
        
        # Room features (5D)
        room_type_map = {'CLASSROOM': 0, 'LAB': 0.5, 'LECTURE_HALL': 1.0}
        vector[idx:idx+5] = [
            state_dict.get('room_id', 0) / 1000,
            room_type_map.get(state_dict.get('room_type', 'CLASSROOM'), 0),
            state_dict.get('room_capacity', 0) / 300,
            state_dict.get('room_utilization', 0) / 100,
            float(state_dict.get('room_dept_match', False))
        ]
        idx += 5
        
        # Constraint features (4D)
        vector[idx:idx+4] = [
            state_dict.get('hard_constraints_satisfied', 0) / 10,
            state_dict.get('soft_constraints_satisfied', 0) / 20,
            float(state_dict.get('conflicts_with_reserved_slots', False)),
            state_dict.get('conflicts_with_other_depts', 0) / 10
        ]
        idx += 4
        
        # Historical features (3D)
        vector[idx:idx+3] = [
            state_dict.get('previous_semester_slot', 0) / 48,
            state_dict.get('student_feedback_score', 0) / 5,
            state_dict.get('attendance_rate_previous', 0) / 100
        ]
        
        return vector


class DeepQNetwork(nn.Module):
    """Deep Q-Network for timetable optimization"""
    
    def __init__(self, state_dim=33, action_dim=48, hidden_dims=[128, 256, 128]):
        super().__init__()
        
        layers = []
        prev_dim = state_dim
        
        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.BatchNorm1d(hidden_dim)
            ])
            prev_dim = hidden_dim
        
        layers.append(nn.Linear(prev_dim, action_dim))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, state):
        return self.network(state)


class EnhancedRLOptimizer:
    """Enhanced RL optimizer with multidimensional context"""
    
    def __init__(self, state_dim=33, action_dim=48, learning_rate=0.001):
        self.encoder = MultidimensionalContextEncoder()
        self.q_network = DeepQNetwork(state_dim, action_dim)
        self.target_network = DeepQNetwork(state_dim, action_dim)
        self.target_network.load_state_dict(self.q_network.state_dict())
        
        self.optimizer = torch.optim.Adam(self.q_network.parameters(), lr=learning_rate)
        self.memory = []
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_decay = 0.995
        self.epsilon_min = 0.01
    
    def get_action(self, state_dict, available_actions):
        """Select action using epsilon-greedy policy"""
        
        if np.random.random() < self.epsilon:
            return np.random.choice(available_actions)
        
        state_vector = self.encoder.encode(state_dict)
        state_tensor = torch.FloatTensor(state_vector).unsqueeze(0)
        
        with torch.no_grad():
            q_values = self.q_network(state_tensor).squeeze()
        
        # Mask unavailable actions
        masked_q = q_values.clone()
        mask = torch.ones_like(q_values) * float('-inf')
        mask[available_actions] = 0
        masked_q += mask
        
        return torch.argmax(masked_q).item()
    
    def update(self, state_dict, action, reward, next_state_dict, done):
        """Update Q-network using experience"""
        
        state = self.encoder.encode(state_dict)
        next_state = self.encoder.encode(next_state_dict)
        
        self.memory.append((state, action, reward, next_state, done))
        
        if len(self.memory) < 32:
            return
        
        # Sample batch
        batch = np.random.choice(len(self.memory), 32, replace=False)
        states = torch.FloatTensor([self.memory[i][0] for i in batch])
        actions = torch.LongTensor([self.memory[i][1] for i in batch])
        rewards = torch.FloatTensor([self.memory[i][2] for i in batch])
        next_states = torch.FloatTensor([self.memory[i][3] for i in batch])
        dones = torch.FloatTensor([self.memory[i][4] for i in batch])
        
        # Compute Q-values
        current_q = self.q_network(states).gather(1, actions.unsqueeze(1))
        next_q = self.target_network(next_states).max(1)[0].detach()
        target_q = rewards + (1 - dones) * self.gamma * next_q
        
        # Update network
        loss = nn.MSELoss()(current_q.squeeze(), target_q)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        # Decay epsilon
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        
        return loss.item()
    
    def calculate_reward(self, state_dict, action, conflicts):
        """Calculate reward based on multidimensional context"""
        
        reward = 0.0
        
        # Hard constraint satisfaction (critical)
        if conflicts['hard'] == 0:
            reward += 100
        else:
            reward -= 50 * conflicts['hard']
        
        # Soft constraint satisfaction
        reward += 10 * state_dict.get('soft_constraints_satisfied', 0)
        
        # Student experience
        avg_gap = (state_dict.get('avg_student_gap_before', 0) + 
                   state_dict.get('avg_student_gap_after', 0)) / 2
        if avg_gap < 1.5:  # Prefer compact schedules
            reward += 20
        elif avg_gap > 3:  # Penalize large gaps
            reward -= 10
        
        # Faculty preference
        if state_dict.get('faculty_preference_match', 0) > 80:
            reward += 15
        
        # Room utilization
        utilization = state_dict.get('room_utilization', 0)
        if 70 <= utilization <= 90:  # Optimal range
            reward += 10
        
        # Cross-department conflicts
        if state_dict.get('conflicts_with_other_depts', 0) == 0:
            reward += 25
        else:
            reward -= 30 * state_dict.get('conflicts_with_other_depts', 0)
        
        # Reserved slot compliance
        if state_dict.get('conflicts_with_reserved_slots', False):
            reward -= 100  # Critical violation
        
        # Historical continuity (students prefer similar slots)
        if state_dict.get('previous_semester_slot', -1) == action:
            reward += 5
        
        return reward


def resolve_conflicts_with_enhanced_rl(conflicts, timetable_data):
    """Resolve conflicts using enhanced RL with multidimensional context"""
    
    rl_optimizer = EnhancedRLOptimizer()
    resolved = []
    
    for conflict in conflicts:
        # Build multidimensional state
        state = {
            'slot_id': conflict['current_slot'],
            'course_id': conflict['course_id'],
            'enrolled_count': conflict['student_count'],
            'conflicts_with_other_depts': len(conflict['conflicting_courses']),
            # ... populate all 33 dimensions
        }
        
        # Get available alternative slots
        available_slots = get_available_slots(conflict, timetable_data)
        
        # RL selects best slot
        best_slot = rl_optimizer.get_action(state, available_slots)
        
        # Apply swap
        swap_result = apply_slot_swap(conflict, best_slot, timetable_data)
        
        # Calculate reward
        new_conflicts = detect_conflicts_after_swap(swap_result)
        reward = rl_optimizer.calculate_reward(state, best_slot, new_conflicts)
        
        # Update RL
        next_state = build_state_after_swap(swap_result)
        rl_optimizer.update(state, best_slot, reward, next_state, done=True)
        
        resolved.append(swap_result)
    
    return resolved
