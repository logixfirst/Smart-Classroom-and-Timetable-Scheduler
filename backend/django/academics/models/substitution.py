"""
Substitution and proxy assignment models.

Keeps generated timetable immutable while applying operational overlays for
faculty absences and quick proxy assignment.
"""

import uuid
from django.conf import settings
from django.db import models

from .base import Organization
from .course import CourseOffering
from .faculty import Faculty
from .timetable import GenerationJob


class SubstitutionRequest(models.Model):
    """A request to replace an unavailable faculty for a specific slot."""

    URGENCY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("recommended", "Recommended"),
        ("applied", "Applied"),
        ("cancelled", "Cancelled"),
        ("rolled_back", "Rolled Back"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="substitution_requests",
        db_column="org_id",
    )
    job = models.ForeignKey(
        GenerationJob,
        on_delete=models.CASCADE,
        related_name="substitution_requests",
        null=True,
        blank=True,
    )

    variant_id = models.CharField(max_length=80, db_index=True)
    schedule_date = models.DateField(db_index=True)
    day_index = models.PositiveSmallIntegerField()
    time_slot = models.CharField(max_length=64)

    original_faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name="original_substitution_requests",
        db_column="original_faculty_id",
    )
    substitute_faculty = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        related_name="substitute_substitution_requests",
        db_column="substitute_faculty_id",
        null=True,
        blank=True,
    )

    offering = models.ForeignKey(
        CourseOffering,
        on_delete=models.SET_NULL,
        related_name="substitution_requests",
        null=True,
        blank=True,
        db_column="offering_id",
    )

    subject_code = models.CharField(max_length=64, blank=True)
    subject_name = models.CharField(max_length=255, blank=True)
    reason = models.TextField(blank=True)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default="high")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="substitution_requests_created",
        null=True,
        blank=True,
        db_column="requested_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "substitution_requests"
        indexes = [
            models.Index(fields=["organization", "schedule_date"], name="sub_req_org_date_idx"),
            models.Index(fields=["status", "created_at"], name="sub_req_status_created_idx"),
            models.Index(fields=["job", "variant_id"], name="sub_req_job_variant_idx"),
        ]


class SubstitutionProposal(models.Model):
    """Ranked candidate faculty suggestions for one substitution request."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        SubstitutionRequest,
        on_delete=models.CASCADE,
        related_name="proposals",
    )
    candidate_faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name="substitution_proposals",
        db_column="candidate_faculty_id",
    )

    rank = models.PositiveSmallIntegerField(default=1)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    score_breakdown = models.JSONField(default=dict, blank=True)
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "substitution_proposals"
        unique_together = [["request", "candidate_faculty"]]
        indexes = [
            models.Index(fields=["request", "rank"], name="sub_prop_req_rank_idx"),
        ]


class SubstitutionAssignment(models.Model):
    """Final applied assignment for a substitution request."""

    STATUS_CHOICES = [
        ("applied", "Applied"),
        ("rolled_back", "Rolled Back"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.OneToOneField(
        SubstitutionRequest,
        on_delete=models.CASCADE,
        related_name="assignment",
    )
    proposal = models.ForeignKey(
        SubstitutionProposal,
        on_delete=models.SET_NULL,
        related_name="assignments",
        null=True,
        blank=True,
    )
    substitute_faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name="substitution_assignments",
        db_column="substitute_faculty_id",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="applied")
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="substitution_assignments_applied",
        null=True,
        blank=True,
        db_column="applied_by",
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    rollback_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "substitution_assignments"
        indexes = [
            models.Index(fields=["status", "applied_at"], name="sub_assign_status_applied_idx"),
        ]


class TimetableOverlayEntry(models.Model):
    """Operational patch entry layered over immutable timetable output."""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("rolled_back", "Rolled Back"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="timetable_overlays",
        db_column="org_id",
    )
    request = models.ForeignKey(
        SubstitutionRequest,
        on_delete=models.CASCADE,
        related_name="overlay_entries",
    )
    assignment = models.OneToOneField(
        SubstitutionAssignment,
        on_delete=models.CASCADE,
        related_name="overlay_entry",
    )

    job = models.ForeignKey(
        GenerationJob,
        on_delete=models.CASCADE,
        related_name="overlay_entries",
        null=True,
        blank=True,
    )
    variant_id = models.CharField(max_length=80, db_index=True)
    schedule_date = models.DateField(db_index=True)
    day_index = models.PositiveSmallIntegerField()
    time_slot = models.CharField(max_length=64)

    original_entry = models.JSONField(default=dict, blank=True)
    patched_entry = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="timetable_overlays_created",
        null=True,
        blank=True,
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "timetable_overlay_entries"
        indexes = [
            models.Index(fields=["organization", "schedule_date"], name="overlay_org_date_idx"),
            models.Index(fields=["job", "variant_id"], name="overlay_job_variant_idx"),
            models.Index(fields=["status", "updated_at"], name="overlay_status_updated_idx"),
        ]


class ChangeAuditLog(models.Model):
    """Audit trail for substitution operations and rollback actions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="change_audit_logs",
        db_column="org_id",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="change_audit_actions",
        null=True,
        blank=True,
        db_column="actor_id",
    )

    action = models.CharField(max_length=64)
    entity_type = models.CharField(max_length=64)
    entity_id = models.CharField(max_length=100)
    reason = models.TextField(blank=True)
    old_state = models.JSONField(default=dict, blank=True)
    new_state = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "change_audit_logs"
        indexes = [
            models.Index(fields=["organization", "created_at"], name="audit_org_created_idx"),
            models.Index(fields=["entity_type", "entity_id"], name="audit_entity_idx"),
        ]
