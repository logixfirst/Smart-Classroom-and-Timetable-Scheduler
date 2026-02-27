"""
Timetable Configuration Models
Stores user preferences for timetable generation
"""
import uuid
from django.db import models
from .base import Organization


class TimetableConfiguration(models.Model):
    """
    Stores timetable generation configuration
    Fetches last used settings and saves new ones
    """
    
    config_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name="timetable_configs",
        db_column='org_id'
    )
    
    # Basic Configuration
    config_name = models.CharField(max_length=200, default="Default Configuration")
    academic_year = models.CharField(max_length=20)
    semester = models.IntegerField()  # 1=ODD, 2=EVEN
    
    # Time Configuration
    working_days = models.IntegerField(default=6)  # 5 or 6
    slots_per_day = models.IntegerField(default=8)  # 7, 8, or 9
    start_time = models.TimeField(default="08:00")
    end_time = models.TimeField(default="17:00")
    slot_duration_minutes = models.IntegerField(default=60)
    
    # Lunch Break
    lunch_break_enabled = models.BooleanField(default=True)
    lunch_break_start = models.TimeField(default="13:00")
    lunch_break_end = models.TimeField(default="14:00")
    
    # Department Selection
    selected_departments = models.JSONField(default=list, blank=True)  # Empty = ALL
    include_open_electives = models.BooleanField(default=True)
    
    # Constraint Preferences
    max_classes_per_day = models.IntegerField(default=6)
    min_gap_between_classes = models.IntegerField(default=0)  # in slots
    avoid_first_last_slot = models.BooleanField(default=False)
    faculty_max_continuous = models.IntegerField(default=3)
    
    # Optimization Goals
    optimization_priority = models.CharField(
        max_length=20,
        choices=[
            ('balanced', 'Balanced'),
            ('compact', 'Compact'),
            ('spread', 'Spread Out')
        ],
        default='balanced'
    )
    minimize_faculty_travel = models.BooleanField(default=True)
    prefer_morning_slots = models.BooleanField(default=False)
    group_same_subject = models.BooleanField(default=True)
    
    # Advanced Options
    number_of_variants = models.IntegerField(default=5)
    timeout_minutes = models.IntegerField(default=10)
    allow_conflicts = models.BooleanField(default=False)
    use_ai_optimization = models.BooleanField(default=True)
    
    # Metadata
    is_default = models.BooleanField(default=False)
    last_used_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_timetable_configs'
    )
    
    class Meta:
        db_table = "timetable_configurations"
        ordering = ['-last_used_at']
        indexes = [
            models.Index(fields=['organization', 'is_default'], name='idx_config_org_default'),
            models.Index(fields=['organization', 'last_used_at'], name='idx_config_org_used'),
        ]
    
    def __str__(self):
        return f"{self.config_name} - {self.academic_year} Sem {self.semester}"
