"""
User model: Authentication and authorization
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from .base import Organization


class User(AbstractUser):
    """Custom user model with multi-tenant support"""

    ROLE_CHOICES = [
        ("super_admin", "Super Admin (Platform)"),
        ("org_admin", "Organization Admin"),
        ("dean", "Dean"),
        ("hod", "Head of Department"),
        ("faculty", "Faculty"),
        ("student", "Student"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='user_id')
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        db_column='org_id',
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(
                fields=["organization", "role", "is_active"], name="user_org_role_idx"
            ),
            models.Index(fields=["username"], name="user_username_idx"),
            models.Index(fields=["email"], name="user_email_idx"),
        ]

    def __str__(self):
        org_name = self.organization.org_code if self.organization else "Platform"
        return f"{self.username} ({self.role}) - {org_name}"
