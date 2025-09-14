import random
from typing import List, Dict, Tuple
from .models import TimetableRequest, TimetableOption, TimeSlot

class TimetableGenerator:
    def __init__(self, request: TimetableRequest):
        self.request = request
        self.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        self.time_slots = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', 
                          '14:00-15:00', '15:00-16:00', '16:00-17:00']
        
    def generate_options(self) -> List[TimetableOption]:
        if not self._validate_constraints():
            return []
            
        options = []
        for i in range(3):  # Generate 3 options
            schedule = self._generate_schedule()
            if schedule:
                score = self._calculate_score(schedule)
                conflicts = self._detect_conflicts(schedule)
                options.append(TimetableOption(
                    id=i+1,
                    score=score,
                    schedule=schedule,
                    conflicts=conflicts
                ))
        
        return sorted(options, key=lambda x: x.score, reverse=True)
    
    def _validate_constraints(self) -> bool:
        total_classes_needed = sum(s.classesPerWeek for s in self.request.subjects) * len(self.request.batches)
        total_slots_available = len(self.days) * self.request.maxClassesPerDay * len(self.request.classrooms)
        
        if total_classes_needed > total_slots_available:
            return False
            
        if len(self.request.faculty) == 0 or len(self.request.subjects) == 0:
            return False
            
        return True
    
    def _generate_schedule(self) -> List[TimeSlot]:
        schedule = []
        
        # Place fixed slots first
        for fixed in self.request.fixedSlots:
            schedule.append(TimeSlot(
                day=fixed.day,
                time=fixed.timeSlot,
                subject=fixed.subject,
                faculty=fixed.faculty,
                classroom=self._get_available_classroom(schedule, fixed.day, fixed.timeSlot),
                batch=self.request.batches[0].name if self.request.batches else "Default"
            ))
        
        # Generate remaining schedule using genetic algorithm approach
        for batch in self.request.batches:
            for subject in self.request.subjects:
                classes_scheduled = 0
                attempts = 0
                
                while classes_scheduled < subject.classesPerWeek and attempts < 100:
                    day = random.choice(self.days)
                    time = random.choice(self.time_slots)
                    
                    if self._is_slot_available(schedule, day, time, batch.name):
                        faculty = self._assign_faculty(schedule, day, time)
                        classroom = self._get_available_classroom(schedule, day, time)
                        
                        if faculty and classroom:
                            schedule.append(TimeSlot(
                                day=day,
                                time=time,
                                subject=subject.name,
                                faculty=faculty,
                                classroom=classroom,
                                batch=batch.name
                            ))
                            classes_scheduled += 1
                    
                    attempts += 1
        
        return schedule
    
    def _is_slot_available(self, schedule: List[TimeSlot], day: str, time: str, batch: str) -> bool:
        # Check if batch is free
        for slot in schedule:
            if slot.day == day and slot.time == time and slot.batch == batch:
                return False
        
        # Check max classes per day constraint
        day_classes = [s for s in schedule if s.day == day and s.batch == batch]
        if len(day_classes) >= self.request.maxClassesPerDay:
            return False
            
        return True
    
    def _assign_faculty(self, schedule: List[TimeSlot], day: str, time: str) -> str:
        # Find available faculty for this slot
        busy_faculty = [s.faculty for s in schedule if s.day == day and s.time == time]
        available_faculty = [f.name for f in self.request.faculty if f.name not in busy_faculty]
        
        return random.choice(available_faculty) if available_faculty else None
    
    def _get_available_classroom(self, schedule: List[TimeSlot], day: str, time: str) -> str:
        # Find available classroom for this slot
        busy_classrooms = [s.classroom for s in schedule if s.day == day and s.time == time]
        available_classrooms = [c.roomNumber for c in self.request.classrooms if c.roomNumber not in busy_classrooms]
        
        return random.choice(available_classrooms) if available_classrooms else None
    
    def _calculate_score(self, schedule: List[TimeSlot]) -> float:
        score = 100.0
        
        # Penalize conflicts
        conflicts = self._detect_conflicts(schedule)
        score -= len(conflicts) * 10
        
        # Reward even distribution
        faculty_load = {}
        for slot in schedule:
            faculty_load[slot.faculty] = faculty_load.get(slot.faculty, 0) + 1
        
        if faculty_load:
            load_variance = sum((load - sum(faculty_load.values())/len(faculty_load))**2 for load in faculty_load.values())
            score -= load_variance * 0.1
        
        return max(0, score)
    
    def _detect_conflicts(self, schedule: List[TimeSlot]) -> List[str]:
        conflicts = []
        
        for i, slot1 in enumerate(schedule):
            for slot2 in schedule[i+1:]:
                if slot1.day == slot2.day and slot1.time == slot2.time:
                    if slot1.faculty == slot2.faculty:
                        conflicts.append(f"Faculty {slot1.faculty} double-booked on {slot1.day} at {slot1.time}")
                    if slot1.classroom == slot2.classroom:
                        conflicts.append(f"Classroom {slot1.classroom} double-booked on {slot1.day} at {slot1.time}")
                    if slot1.batch == slot2.batch:
                        conflicts.append(f"Batch {slot1.batch} double-booked on {slot1.day} at {slot1.time}")
        
        return conflicts