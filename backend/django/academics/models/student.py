"""
Student and Batch models: Student information and batch management
"""

import uuid
from django.db import models
from .base import Organization
from .academic_structure import Department, Program


class Batch(models.Model):
    """Student batches - synthetic from student data"""
    
    batch_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="batches", db_column='org_id')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name="batches", db_column='program_id', null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="batches", db_column='dept_id')
    
    batch_name = models.CharField(max_length=100)
    batch_code = models.CharField(max_length=20)
    year_of_admission = models.IntegerField()
    current_semester = models.IntegerField(default=1)
    section = models.CharField(max_length=5, default='A')
    total_students = models.IntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "batches"
        unique_together = [["organization", "batch_code"]]
        indexes = [
            models.Index(fields=["organization"], name="idx_batch_org"),
            models.Index(fields=["department"], name="idx_batch_dept"),
            models.Index(fields=["program"], name="idx_batch_program"),
        ]
    
    def __str__(self):
        return f"{self.batch_code} - {self.batch_name}"


class Student(models.Model):
    """Student records - supports 25000+ students"""

    GENDER_CHOICES = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
    ]

    ACADEMIC_STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("ON_LEAVE", "On Leave"),
        ("GRADUATED", "Graduated"),
        ("DROPPED_OUT", "Dropped Out"),
        ("RUSTICATED", "Rusticated"),
        ("TRANSFERRED", "Transferred"),
    ]

    FEE_STATUS_CHOICES = [
        ("PAID", "Paid"),
        ("UNPAID", "Unpaid"),
        ("PARTIAL", "Partial"),
        ("WAIVED", "Waived"),
    ]

    student_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="students", db_column='org_id'
    )
    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name="students", db_column='program_id'
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="students", db_column='dept_id'
    )

    enrollment_number = models.CharField(max_length=50)
    roll_number = models.CharField(max_length=30, null=True, blank=True)
    username = models.CharField(max_length=50)
    email = models.EmailField()

    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, null=True, blank=True)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    date_of_birth = models.DateField()
    blood_group = models.CharField(max_length=5, null=True, blank=True)

    phone_number = models.CharField(max_length=20, null=True, blank=True)
    parent_phone = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)

    emergency_contact_name = models.CharField(max_length=200, null=True, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, null=True, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, null=True, blank=True)

    admission_year = models.IntegerField()
    admission_date = models.DateField()
    current_semester = models.IntegerField(null=True, blank=True)
    current_year = models.IntegerField(null=True, blank=True)
    batch_id = models.UUIDField(null=True, blank=True)

    academic_status = models.CharField(max_length=50, choices=ACADEMIC_STATUS_CHOICES, null=True, blank=True)
    total_credits_earned = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    current_semester_credits = models.IntegerField(null=True, blank=True)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    pursuing_minor = models.BooleanField(null=True, blank=True)
    minor_dept = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="minor_students", db_column='minor_dept_id'
    )
    minor_credits_earned = models.IntegerField(null=True, blank=True)

    fee_status = models.CharField(max_length=50, choices=FEE_STATUS_CHOICES, null=True, blank=True)
    scholarship = models.CharField(max_length=200, null=True, blank=True)

    is_hosteller = models.BooleanField(null=True, blank=True)
    hostel_name = models.CharField(max_length=100, null=True, blank=True)
    room_number = models.CharField(max_length=20, null=True, blank=True)

    is_active = models.BooleanField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "students"

    @property
    def batch_name(self):
        """Backward compatibility - generate batch name from batch_id if available"""
        if self.batch_id:
            return f"Batch-{str(self.batch_id)[:8]}"
        return f"Batch-{self.admission_year}"

    def __str__(self):
        return f"{self.roll_number} - {self.first_name} {self.last_name}"
