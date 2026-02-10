"""
Base models: Organization and Building
Core foundational models for multi-tenant architecture
"""

import uuid
from django.db import models


class Organization(models.Model):
    """
    Root tenant model - Represents each university/college
    Examples: BHU, IIT Delhi, DU, Amity University
    """

    ORG_TYPE_CHOICES = [
        ("CENTRAL_UNIVERSITY", "Central University"),
        ("STATE_UNIVERSITY", "State University"),
        ("DEEMED", "Deemed University"),
        ("PRIVATE", "Private University"),
    ]

    SEMESTER_SYSTEM_CHOICES = [
        ("SEMESTER", "Semester"),
        ("ANNUAL", "Annual"),
        ("TRIMESTER", "Trimester"),
    ]

    org_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_code = models.CharField(max_length=20, unique=True, db_index=True)
    org_name = models.CharField(max_length=200)
    org_type = models.CharField(max_length=50, choices=ORG_TYPE_CHOICES, null=True, blank=True)

    # Contact Information
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, default="India")
    pincode = models.CharField(max_length=10, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    website = models.CharField(max_length=255, null=True, blank=True)

    # Email domains
    student_email_domain = models.CharField(max_length=100, default="student.edu")
    faculty_email_domain = models.CharField(max_length=100, default="faculty.edu")

    # Academic configuration
    nep2020_enabled = models.BooleanField(default=True)
    academic_year_start_month = models.IntegerField(default=7)
    semester_system = models.CharField(max_length=20, choices=SEMESTER_SYSTEM_CHOICES, default="SEMESTER")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "organizations"
        indexes = [
            models.Index(fields=["org_code"], name="idx_org_code"),
            models.Index(fields=["is_active"], name="idx_org_active"),
        ]

    def __str__(self):
        return f"{self.org_code} - {self.org_name}"


class Building(models.Model):
    """Buildings table (renamed from Campus)"""
    
    building_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="buildings", db_column='org_id')
    
    building_code = models.CharField(max_length=50)
    building_name = models.CharField(max_length=200)
    building_type = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    total_floors = models.IntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "buildings"
        indexes = [
            models.Index(fields=["organization"], name="idx_building_org"),
            models.Index(fields=["building_code"], name="idx_building_code"),
        ]
    
    def __str__(self):
        return f"{self.building_code} - {self.building_name}"


# Alias for backward compatibility
Campus = Building
