"""
Faculty model: Faculty member information and management
"""

import uuid
from django.db import models
from .base import Organization
from .academic_structure import Department


class Faculty(models.Model):
    """Faculty members - supports 2000+ faculty for large universities"""

    DESIGNATION_CHOICES = [
        ("professor", "Professor"),
        ("associate_professor", "Associate Professor"),
        ("assistant_professor", "Assistant Professor"),
        ("lecturer", "Lecturer"),
        ("visiting_professor", "Visiting Professor"),
        ("adjunct_professor", "Adjunct Professor"),
        ("emeritus_professor", "Emeritus Professor"),
        ("guest_lecturer", "Guest Lecturer"),
    ]

    GENDER_CHOICES = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
    ]

    faculty_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="faculty_members", db_column='org_id'
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="faculty_members", db_column='dept_id'
    )

    faculty_code = models.CharField(max_length=30)
    username = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField()
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100)
    title = models.CharField(max_length=20, null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    alternate_phone = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)
    designation = models.CharField(max_length=30, choices=DESIGNATION_CHOICES)
    employment_type = models.CharField(max_length=50, null=True, blank=True)
    highest_qualification = models.CharField(max_length=100, null=True, blank=True)
    specialization = models.CharField(max_length=200)
    date_of_joining = models.DateField(null=True, blank=True)
    date_of_leaving = models.DateField(null=True, blank=True)
    max_credits_per_semester = models.IntegerField(null=True, blank=True)
    max_hours_per_week = models.IntegerField(default=18)
    max_consecutive_hours = models.IntegerField(null=True, blank=True)
    can_teach_cross_department = models.BooleanField(default=False)
    preferred_time_slot = models.CharField(max_length=50, null=True, blank=True)
    research_day = models.CharField(max_length=20, null=True, blank=True)
    research_hours_per_week = models.IntegerField(null=True, blank=True)
    is_hod = models.BooleanField(default=False)
    is_dean = models.BooleanField(default=False)
    is_proctor = models.BooleanField(default=False)
    can_approve_timetable = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty"
        unique_together = [["organization", "faculty_code"]]
        indexes = [
            models.Index(
                fields=["organization", "department", "is_active"],
                name="fac_org_dept_avail_idx",
            ),
            models.Index(fields=["designation"], name="fac_desig_idx"),
        ]

    @property
    def faculty_name(self):
        """Computed property for backward compatibility"""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts)

    @property
    def phone(self):
        """Alias for phone_number for backward compatibility"""
        return self.phone_number

    @property
    def max_teaching_hours_per_week(self):
        """Alias for max_hours_per_week for backward compatibility"""
        return self.max_hours_per_week

    @property
    def qualifications(self):
        """Alias for highest_qualification for backward compatibility"""
        return self.highest_qualification

    @property
    def is_available(self):
        """Alias for is_active for backward compatibility"""
        return self.is_active

    def __str__(self):
        return f"{self.faculty_name} ({self.faculty_code})"
