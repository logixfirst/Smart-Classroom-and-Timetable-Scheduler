"""
Timetable models: TimeSlot, GenerationJob, Timetable, TimetableSlot
Timetable scheduling and generation tracking
"""

import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from .base import Organization
from .course import Course
from .faculty import Faculty
from .room import Room


class TimeSlot(models.Model):
    """Standard time slots for timetable - 36 slots per week"""

    DAY_CHOICES = [
        ("monday", "Monday"),
        ("tuesday", "Tuesday"),
        ("wednesday", "Wednesday"),
        ("thursday", "Thursday"),
        ("friday", "Friday"),
        ("saturday", "Saturday"),
    ]

    timeslot_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="timeslots", db_column='org_id'
    )

    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    slot_name = models.CharField(max_length=50)
    slot_order = models.IntegerField()

    is_available = models.BooleanField(default=True)
    is_break = models.BooleanField(default=False)
    is_lunch = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "timeslots"
        unique_together = [["organization", "day_of_week", "start_time"]]
        indexes = [
            models.Index(
                fields=["organization", "day_of_week", "slot_order"],
                name="slot_org_day_order_idx",
            ),
        ]
        ordering = ["day_of_week", "slot_order"]

    def __str__(self):
        return (
            f"{self.day_of_week} {self.slot_name} ({self.start_time}-{self.end_time})"
        )


class GenerationJob(models.Model):
    """Timetable generation job tracking"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="generation_jobs", db_column='org_id'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("running", "Running"),
            ("completed", "Completed"),
            ("failed", "Failed"),
            ("cancelling", "Cancelling"),
            ("cancelled", "Cancelled"),
        ],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    progress = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    # Cached fields for fast list queries
    academic_year = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    semester = models.IntegerField(null=True, blank=True, db_index=True)
    
    timetable_data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "generation_jobs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="idx_job_created"),
            models.Index(fields=["status", "-created_at"], name="idx_job_status_created"),
            models.Index(fields=["organization", "-created_at"], name="idx_job_org_created"),
            models.Index(fields=["academic_year", "semester"], name="idx_job_year_sem"),
        ]


class Timetable(models.Model):
    """Generated timetable"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    academic_year = models.CharField(max_length=20)
    semester = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=False)
    generation_job = models.ForeignKey(
        GenerationJob, on_delete=models.CASCADE, related_name="timetables", null=True
    )

    class Meta:
        db_table = "timetables"
        ordering = ["-created_at"]


class TimetableSlot(models.Model):
    """Individual timetable slots"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable = models.ForeignKey(Timetable, on_delete=models.CASCADE, related_name="slots")
    day = models.CharField(max_length=10)
    start_time = models.TimeField()
    end_time = models.TimeField()
    subject = models.ForeignKey(Course, on_delete=models.CASCADE)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    classroom = models.ForeignKey(Room, on_delete=models.CASCADE)

    class Meta:
        db_table = "timetable_slots"
        indexes = [
            models.Index(fields=["timetable", "day", "start_time"]),
            models.Index(fields=["faculty", "day", "start_time"]),
            models.Index(fields=["classroom", "day", "start_time"]),
        ]
