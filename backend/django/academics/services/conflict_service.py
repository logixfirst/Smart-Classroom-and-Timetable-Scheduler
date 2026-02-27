"""
Conflict Detection Service
Detects and categorizes timetable conflicts with severity levels
"""
from typing import List, Dict
from collections import defaultdict


class ConflictSeverity:
    """Conflict severity levels"""
    CRITICAL = "critical"  # Hard constraint violation
    HIGH = "high"          # Major scheduling issue
    MEDIUM = "medium"      # Minor scheduling issue
    LOW = "low"            # Optimization opportunity


class ConflictType:
    """Conflict types"""
    FACULTY = "faculty_conflict"
    ROOM = "room_conflict"
    STUDENT = "student_conflict"
    CAPACITY = "capacity_violation"
    FEATURE = "feature_mismatch"


class ConflictDetectionService:
    """Detect conflicts in timetable"""
    
    @staticmethod
    def detect_conflicts(timetable_entries: List[Dict]) -> List[Dict]:
        """Detect all conflicts in timetable"""
        conflicts = []
        
        # Group by time slot
        by_time = defaultdict(list)
        for entry in timetable_entries:
            key = (entry.get('day'), entry.get('time_slot'))
            by_time[key].append(entry)
        
        # Check each time slot
        for (day, time_slot), entries in by_time.items():
            # Faculty conflicts
            faculty_map = defaultdict(list)
            for entry in entries:
                faculty = entry.get('faculty_name')
                if faculty:
                    faculty_map[faculty].append(entry)
            
            for faculty, faculty_entries in faculty_map.items():
                if len(faculty_entries) > 1:
                    conflicts.append({
                        'type': ConflictType.FACULTY,
                        'severity': ConflictSeverity.CRITICAL,
                        'day': day,
                        'time_slot': time_slot,
                        'faculty': faculty,
                        'courses': [e.get('subject_code') for e in faculty_entries],
                        'rooms': [e.get('room_number') for e in faculty_entries],
                        'message': f'{faculty} assigned to {len(faculty_entries)} classes simultaneously',
                        'suggestion': 'Reschedule one class to different time slot'
                    })
            
            # Room conflicts
            room_map = defaultdict(list)
            for entry in entries:
                room = entry.get('room_number')
                if room:
                    room_map[room].append(entry)
            
            for room, room_entries in room_map.items():
                if len(room_entries) > 1:
                    conflicts.append({
                        'type': ConflictType.ROOM,
                        'severity': ConflictSeverity.CRITICAL,
                        'day': day,
                        'time_slot': time_slot,
                        'room': room,
                        'courses': [e.get('subject_code') for e in room_entries],
                        'faculty': [e.get('faculty_name') for e in room_entries],
                        'message': f'Room {room} double-booked with {len(room_entries)} classes',
                        'suggestion': 'Assign one class to different room'
                    })
        
        return conflicts
    
    @staticmethod
    def categorize_conflicts(conflicts: List[Dict]) -> Dict:
        """Categorize conflicts by type and severity"""
        by_type = defaultdict(list)
        by_severity = defaultdict(list)
        
        for conflict in conflicts:
            by_type[conflict['type']].append(conflict)
            by_severity[conflict['severity']].append(conflict)
        
        return {
            'by_type': dict(by_type),
            'by_severity': dict(by_severity),
            'total': len(conflicts),
            'critical': len(by_severity[ConflictSeverity.CRITICAL]),
            'high': len(by_severity[ConflictSeverity.HIGH]),
            'medium': len(by_severity[ConflictSeverity.MEDIUM]),
            'low': len(by_severity[ConflictSeverity.LOW])
        }
    
    @staticmethod
    def get_resolution_suggestions(conflict: Dict) -> List[str]:
        """Get resolution suggestions for conflict"""
        suggestions = []
        
        if conflict['type'] == ConflictType.FACULTY:
            suggestions.append(f"Reschedule {conflict['courses'][0]} to different time slot")
            suggestions.append(f"Assign substitute faculty for {conflict['courses'][1]}")
            suggestions.append("Swap time slots with another class")
        
        elif conflict['type'] == ConflictType.ROOM:
            suggestions.append(f"Move {conflict['courses'][0]} to available room")
            suggestions.append("Use online/hybrid mode for one class")
            suggestions.append("Split class into smaller sections")
        
        elif conflict['type'] == ConflictType.STUDENT:
            suggestions.append("Offer course in different semester")
            suggestions.append("Create additional section")
            suggestions.append("Allow student to take course later")
        
        return suggestions
