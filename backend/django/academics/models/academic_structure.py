"""
Academic Structure models: School, Department, Program
Hierarchical academic organization models
"""

import uuid
from django.db import models
from .base import Organization


class School(models.Model):
    """Schools/Faculties within organization"""
    
    school_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="schools", db_column='org_id')
    
    school_code = models.CharField(max_length=50)
    school_name = models.CharField(max_length=200)
    school_type = models.CharField(max_length=50, null=True, blank=True)
    dean_faculty_id = models.UUIDField(null=True, blank=True)
    office_location = models.CharField(max_length=200, null=True, blank=True)
    office_phone = models.CharField(max_length=20, null=True, blank=True)
    office_email = models.CharField(max_length=200, null=True, blank=True)
    established_year = models.IntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "schools"
        indexes = [
            models.Index(fields=["organization"], name="idx_school_org"),
            models.Index(fields=["school_code"], name="idx_school_code"),
        ]
    
    def __str__(self):
        return f"{self.school_code} - {self.school_name}"


class Department(models.Model):
    """Departments within schools"""

    dept_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="departments", db_column='org_id'
    )
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, related_name="departments"
    )

    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=200)

    dept_short_name = models.CharField(max_length=50, null=True, blank=True)
    hod_faculty_id = models.UUIDField(null=True, blank=True)
    office_location = models.CharField(max_length=200, null=True, blank=True)
    office_phone = models.CharField(max_length=20, null=True, blank=True)
    office_email = models.EmailField(null=True, blank=True)
    established_year = models.IntegerField(null=True, blank=True)
    total_faculty_sanctioned = models.IntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "departments"
        unique_together = [["organization", "school", "dept_code"]]
        indexes = [
            models.Index(
                fields=["organization", "is_active"], name="dept_org_active_idx"
            ),
            models.Index(fields=["school"], name="dept_school_idx"),
        ]

    @property
    def hod_name(self):
        """Backward compatibility - get HOD name from faculty if available"""
        return None  # Would need to lookup faculty by hod_faculty_id
    
    @property
    def hod_email(self):
        """Backward compatibility - get HOD email from faculty if available"""
        return self.office_email
    
    @property
    def building_name(self):
        """Backward compatibility - use office_location"""
        return self.office_location
    
    @property
    def floor_numbers(self):
        """Backward compatibility - not available in new schema"""
        return None

    def __str__(self):
        return f"{self.dept_name} - {self.school.school_code}"


class Program(models.Model):
    """Degree programs - NEP 2020 compliant"""

    program_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="programs", db_column='org_id'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="programs",
        db_column="dept_id",
    )
    degree_id = models.UUIDField(null=True, blank=True)

    program_code = models.CharField(max_length=50)
    program_name = models.CharField(max_length=200)
    program_short_name = models.CharField(max_length=100, null=True, blank=True)
    total_seats = models.IntegerField()
    duration_years = models.DecimalField(max_digits=3, decimal_places=1)
    total_credits_required = models.IntegerField()
    core_credits_required = models.IntegerField(null=True, blank=True)
    elective_credits_required = models.IntegerField(null=True, blank=True)
    minor_credits_required = models.IntegerField(null=True, blank=True)
    open_elective_credits_required = models.IntegerField(null=True, blank=True)
    skill_enhancement_credits_required = models.IntegerField(null=True, blank=True)
    internship_credits_required = models.IntegerField(null=True, blank=True)
    nba_accredited = models.BooleanField(null=True, blank=True)
    naac_grade = models.CharField(max_length=10, null=True, blank=True)
    is_active = models.BooleanField(null=True, blank=True)
    intake_year = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "programs"

    def __str__(self):
        return f"{self.program_name} ({self.program_code})"
