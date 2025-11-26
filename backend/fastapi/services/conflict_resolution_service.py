"""
Conflict Resolution Service - Automatic conflict resolution with escalation hierarchy
Implements: swap time slots → room change → faculty reassignment → manual review
"""
import logging
from typing import List, Dict, Optional, Tuple
from models.timetable_models import (
    TimetableEntry, Course, Room, TimeSlot, Faculty, ConflictAlert
)
from datetime import datetime

logger = logging.getLogger(__name__)


class ConflictResolutionService:
    """Automatic conflict resolution with hierarchical escalation"""
    
    def __init__(self, timetable: List[TimetableEntry], 
                 courses: List[Course],
                 rooms: List[Room],
                 time_slots: List[TimeSlot],
                 faculty: List[Faculty]):
        self.timetable = {(e.course_id, e.session_number): e for e in timetable}
        self.courses = {c.course_id: c for c in courses}
        self.rooms = {r.room_id: r for r in rooms}
        self.time_slots = {t.slot_id: t for t in time_slots}
        self.faculty = {f.faculty_id: f for f in faculty}
        
        self._build_indexes()
    
    def _build_indexes(self):
        """Build conflict detection indexes"""
        self.student_schedule = {}
        self.faculty_schedule = {}
        self.room_schedule = {}
        
        for entry in self.timetable.values():
            # Student index
            for student_id in entry.student_ids:
                key = (student_id, entry.time_slot_id)
                if key not in self.student_schedule:
                    self.student_schedule[key] = []
                self.student_schedule[key].append(entry.course_id)
            
            # Faculty index
            key = (entry.faculty_id, entry.time_slot_id)
            if key not in self.faculty_schedule:
                self.faculty_schedule[key] = []
            self.faculty_schedule[key].append(entry.course_id)
            
            # Room index
            key = (entry.room_id, entry.time_slot_id)
            if key not in self.room_schedule:
                self.room_schedule[key] = []
            self.room_schedule[key].append(entry.course_id)
    
    def detect_all_conflicts(self) -> List[ConflictAlert]:
        """Detect all conflicts in timetable"""
        conflicts = []
        
        # Student conflicts
        for (student_id, time_slot_id), course_ids in self.student_schedule.items():
            if len(course_ids) > 1:
                conflicts.append(ConflictAlert(
                    conflict_id=f"student_{student_id}_{time_slot_id}",
                    conflict_type="student",
                    severity="high",
                    description=f"Student has {len(course_ids)} overlapping courses",
                    affected_courses=course_ids,
                    affected_entities=[student_id],
                    suggested_resolution="Reschedule one course to different time slot",
                    timestamp=datetime.now().isoformat()
                ))
        
        # Faculty conflicts
        for (faculty_id, time_slot_id), course_ids in self.faculty_schedule.items():
            if len(course_ids) > 1:
                conflicts.append(ConflictAlert(
                    conflict_id=f"faculty_{faculty_id}_{time_slot_id}",
                    conflict_type="faculty",
                    severity="critical",
                    description=f"Faculty teaching {len(course_ids)} courses simultaneously",
                    affected_courses=course_ids,
                    affected_entities=[faculty_id],
                    suggested_resolution="Reschedule one course or reassign faculty",
                    timestamp=datetime.now().isoformat()
                ))
        
        # Room conflicts
        for (room_id, time_slot_id), course_ids in self.room_schedule.items():
            if len(course_ids) > 1:
                conflicts.append(ConflictAlert(
                    conflict_id=f"room_{room_id}_{time_slot_id}",
                    conflict_type="room",
                    severity="high",
                    description=f"Room double-booked with {len(course_ids)} courses",
                    affected_courses=course_ids,
                    affected_entities=[room_id],
                    suggested_resolution="Move one course to different room",
                    timestamp=datetime.now().isoformat()
                ))
        
        logger.info(f"Detected {len(conflicts)} conflicts")
        return conflicts
    
    def resolve_conflict(self, conflict: ConflictAlert) -> Dict:
        """
        Resolve conflict using hierarchical approach:
        1. Try swap time slots
        2. Try room change
        3. Try faculty reassignment
        4. Flag for manual review
        """
        logger.info(f"Resolving conflict: {conflict.conflict_id}")
        
        # Step 1: Try automatic time slot swap
        result = self._try_time_slot_swap(conflict)
        if result['success']:
            logger.info(f"[OK] Resolved by time slot swap")
            return result
        
        # Step 2: Try room change
        if conflict.conflict_type == "room":
            result = self._try_room_change(conflict)
            if result['success']:
                logger.info(f"[OK] Resolved by room change")
                return result
        
        # Step 3: Try faculty reassignment
        if conflict.conflict_type == "faculty":
            result = self._try_faculty_reassignment(conflict)
            if result['success']:
                logger.info(f"[OK] Resolved by faculty reassignment")
                return result
        
        # Step 4: Flag for manual review
        logger.warning(f"[WARN] Conflict requires manual review")
        return {
            'success': False,
            'method': 'manual_review_required',
            'message': 'Automatic resolution failed, requires manual intervention',
            'conflict': conflict
        }
    
    def _try_time_slot_swap(self, conflict: ConflictAlert) -> Dict:
        """Try to resolve by swapping time slots"""
        affected_courses = conflict.affected_courses
        if len(affected_courses) < 2:
            return {'success': False, 'reason': 'Not enough courses to swap'}
        
        # Try swapping first course to different time slot
        course_id = affected_courses[0]
        entries = [e for e in self.timetable.values() if e.course_id == course_id]
        
        for entry in entries:
            # Find alternative time slots
            for time_slot_id, time_slot in self.time_slots.items():
                if time_slot_id == entry.time_slot_id:
                    continue
                
                # Check if swap is valid
                if self._is_time_slot_valid(entry, time_slot_id):
                    # Perform swap
                    old_time = entry.time_slot_id
                    entry.time_slot_id = time_slot_id
                    entry.start_time = time_slot.start_time
                    entry.end_time = time_slot.end_time
                    entry.day = time_slot.day
                    
                    # Rebuild indexes
                    self._build_indexes()
                    
                    logger.info(f"Swapped {course_id} from {old_time} to {time_slot_id}")
                    return {
                        'success': True,
                        'method': 'time_slot_swap',
                        'course_id': course_id,
                        'old_time': old_time,
                        'new_time': time_slot_id
                    }
        
        return {'success': False, 'reason': 'No valid time slot found'}
    
    def _try_room_change(self, conflict: ConflictAlert) -> Dict:
        """Try to resolve by changing room"""
        affected_courses = conflict.affected_courses
        if len(affected_courses) < 2:
            return {'success': False, 'reason': 'Not enough courses'}
        
        course_id = affected_courses[0]
        entry = next((e for e in self.timetable.values() if e.course_id == course_id), None)
        if not entry:
            return {'success': False, 'reason': 'Entry not found'}
        
        # Find alternative rooms
        course = self.courses.get(course_id)
        if not course:
            return {'success': False, 'reason': 'Course not found'}
        
        for room_id, room in self.rooms.items():
            if room_id == entry.room_id:
                continue
            
            # Check capacity
            if len(course.student_ids) > room.capacity:
                continue
            
            # Check availability
            key = (room_id, entry.time_slot_id)
            if key in self.room_schedule and len(self.room_schedule[key]) > 0:
                continue
            
            # Perform room change
            old_room = entry.room_id
            entry.room_id = room_id
            
            # Rebuild indexes
            self._build_indexes()
            
            logger.info(f"Changed room for {course_id} from {old_room} to {room_id}")
            return {
                'success': True,
                'method': 'room_change',
                'course_id': course_id,
                'old_room': old_room,
                'new_room': room_id
            }
        
        return {'success': False, 'reason': 'No available room found'}
    
    def _try_faculty_reassignment(self, conflict: ConflictAlert) -> Dict:
        """Try to resolve by reassigning faculty"""
        affected_courses = conflict.affected_courses
        if len(affected_courses) < 2:
            return {'success': False, 'reason': 'Not enough courses'}
        
        course_id = affected_courses[0]
        entry = next((e for e in self.timetable.values() if e.course_id == course_id), None)
        if not entry:
            return {'success': False, 'reason': 'Entry not found'}
        
        # Find alternative faculty
        for faculty_id, faculty_obj in self.faculty.items():
            if faculty_id == entry.faculty_id:
                continue
            
            # Check availability
            key = (faculty_id, entry.time_slot_id)
            if key in self.faculty_schedule and len(self.faculty_schedule[key]) > 0:
                continue
            
            # Perform reassignment
            old_faculty = entry.faculty_id
            entry.faculty_id = faculty_id
            
            # Rebuild indexes
            self._build_indexes()
            
            logger.info(f"Reassigned {course_id} from {old_faculty} to {faculty_id}")
            return {
                'success': True,
                'method': 'faculty_reassignment',
                'course_id': course_id,
                'old_faculty': old_faculty,
                'new_faculty': faculty_id
            }
        
        return {'success': False, 'reason': 'No available faculty found'}
    
    def _is_time_slot_valid(self, entry: TimetableEntry, new_time_slot_id: str) -> bool:
        """Check if time slot change is valid"""
        # Check faculty availability
        key = (entry.faculty_id, new_time_slot_id)
        if key in self.faculty_schedule and len(self.faculty_schedule[key]) > 0:
            return False
        
        # Check room availability
        key = (entry.room_id, new_time_slot_id)
        if key in self.room_schedule and len(self.room_schedule[key]) > 0:
            return False
        
        # Check student conflicts
        for student_id in entry.student_ids:
            key = (student_id, new_time_slot_id)
            if key in self.student_schedule and len(self.student_schedule[key]) > 0:
                return False
        
        return True
    
    def resolve_all_conflicts(self) -> Dict:
        """Resolve all conflicts automatically"""
        conflicts = self.detect_all_conflicts()
        
        results = {
            'total': len(conflicts),
            'resolved': 0,
            'manual_review': 0,
            'details': []
        }
        
        for conflict in conflicts:
            result = self.resolve_conflict(conflict)
            if result['success']:
                results['resolved'] += 1
            else:
                results['manual_review'] += 1
            results['details'].append(result)
        
        logger.info(f"Resolved {results['resolved']}/{results['total']} conflicts")
        return results
