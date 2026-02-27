"""
Timetable Configuration Serializers
"""
from rest_framework import serializers
from .models import TimetableConfiguration


class TimetableConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for timetable configuration"""
    
    class Meta:
        model = TimetableConfiguration
        fields = [
            'config_id', 'config_name', 'academic_year', 'semester',
            'working_days', 'slots_per_day', 'start_time', 'end_time',
            'slot_duration_minutes', 'lunch_break_enabled', 
            'lunch_break_start', 'lunch_break_end',
            'selected_departments', 'include_open_electives',
            'max_classes_per_day', 'min_gap_between_classes',
            'avoid_first_last_slot', 'faculty_max_continuous',
            'optimization_priority', 'minimize_faculty_travel',
            'prefer_morning_slots', 'group_same_subject',
            'number_of_variants', 'timeout_minutes',
            'allow_conflicts', 'use_ai_optimization',
            'is_default', 'last_used_at', 'created_at'
        ]
        read_only_fields = ['config_id', 'last_used_at', 'created_at']
    
    def create(self, validated_data):
        # Set organization from request context
        request = self.context.get('request')
        if request and hasattr(request.user, 'organization'):
            validated_data['organization'] = request.user.organization
            validated_data['created_by'] = request.user
        return super().create(validated_data)
