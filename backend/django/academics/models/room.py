"""
Room model: Classroom and lab infrastructure management
"""

import uuid
from django.db import models
from .base import Organization, Building
from .academic_structure import Department


class Room(models.Model):
    """Rooms table (classrooms and labs)"""
    
    room_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="rooms", db_column='org_id')
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="rooms", db_column='building_id')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="rooms", db_column='dept_id')
    
    room_code = models.CharField(max_length=50)
    room_number = models.CharField(max_length=50)
    room_name = models.CharField(max_length=200, null=True, blank=True)
    floor_number = models.IntegerField(null=True, blank=True)
    room_type = models.CharField(max_length=50)
    seating_capacity = models.IntegerField()
    exam_capacity = models.IntegerField(null=True, blank=True)
    
    features = models.JSONField(null=True, blank=True)
    equipment_description = models.TextField(null=True, blank=True)
    number_of_computers = models.IntegerField(null=True, blank=True)
    specialized_software = models.JSONField(null=True, blank=True)
    
    is_accessible_for_disabled = models.BooleanField(null=True, blank=True)
    has_lift_access = models.BooleanField(null=True, blank=True)
    allow_cross_department_usage = models.BooleanField(null=True, blank=True)
    priority_department_id = models.UUIDField(null=True, blank=True)
    is_bookable = models.BooleanField(null=True, blank=True)
    
    maintenance_schedule = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)
    room_status = models.CharField(max_length=50, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "rooms"
        indexes = [
            models.Index(fields=["organization"], name="idx_room_org"),
            models.Index(fields=["building"], name="idx_room_building"),
            models.Index(fields=["room_code"], name="idx_room_code"),
        ]
    
    def __str__(self):
        return f"{self.room_code} - {self.room_name or self.room_number}"


# Aliases for backward compatibility
Classroom = Room
Lab = Room
