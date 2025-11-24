"""
MULTI-TENANT ERP MODELS FOR 1000+ COLLEGES
===========================================

Architecture: Row-Level Multi-Tenancy (Shared Database, Shared Schema)
- Every table has an `organization_id` foreign key
- Queries automatically filtered by organization context
- Scalable to 1000+ institutions
- Supports: IITs, NITs, State Universities, Private Colleges, Deemed Universities

Key Features:
1. Organization-level data isolation
2. Configurable institute types (IIT, NIT, State Univ, Private, etc.)
3. Flexible program structures (NEP 2020 compliant)
4. Support for multiple campuses per organization
5. Hierarchical structure: Organization → Campus → School/Faculty → Department
6. Audit logging and soft deletes
7. Performance optimized with strategic indexes
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

# ============================================
# 1. ORGANIZATION & TENANT MANAGEMENT
# ============================================


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


# ============================================
# 2. ACADEMIC STRUCTURE (Multi-Level Hierarchy)
# ============================================


class School(models.Model):
    """Schools table"""
    
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
    """
    Departments within schools
    80-100+ departments for large universities
    """

    dept_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="departments", db_column='org_id'
    )
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, related_name="departments"
    )

    dept_code = models.CharField(max_length=20)  # e.g., 'CSE', 'ECE', 'MATH'
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


# ============================================
# 3. PROGRAMS & COURSES (NEP 2020 Compliant)
# ============================================


class Program(models.Model):
    """
    Degree programs - matches actual database schema
    """

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


class Course(models.Model):
    """Courses table (renamed from Subject)"""
    
    course_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="courses", db_column='org_id')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="courses", db_column='dept_id')
    
    course_code = models.CharField(max_length=50)
    course_name = models.CharField(max_length=200)
    course_short_name = models.CharField(max_length=100, null=True, blank=True)
    course_type = models.CharField(max_length=50, null=True, blank=True)
    course_level = models.CharField(max_length=50, null=True, blank=True)
    
    credits = models.IntegerField()
    theory_credits = models.IntegerField(null=True, blank=True)
    practical_credits = models.IntegerField(null=True, blank=True)
    lecture_hours_per_week = models.IntegerField(null=True, blank=True)
    tutorial_hours_per_week = models.IntegerField(null=True, blank=True)
    practical_hours_per_week = models.IntegerField(null=True, blank=True)
    
    session_pattern = models.CharField(max_length=50, null=True, blank=True)
    room_type_required = models.CharField(max_length=50, null=True, blank=True)
    min_room_capacity = models.IntegerField(null=True, blank=True)
    room_features_required = models.JSONField(null=True, blank=True)
    corequisite_course_ids = models.JSONField(null=True, blank=True)
    
    max_enrollment = models.IntegerField(null=True, blank=True)
    min_enrollment = models.IntegerField(null=True, blank=True)
    allow_cross_department_enrollment = models.BooleanField(null=True, blank=True)
    
    offered_in_odd_semester = models.BooleanField(null=True, blank=True)
    offered_in_even_semester = models.BooleanField(null=True, blank=True)
    offered_in_summer_term = models.BooleanField(null=True, blank=True)
    
    syllabus_file_url = models.TextField(null=True, blank=True)
    course_objectives = models.TextField(null=True, blank=True)
    course_outcomes = models.TextField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    last_offered_semester = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "courses"
        indexes = [
            models.Index(fields=["organization"], name="idx_course_org"),
            models.Index(fields=["department"], name="idx_course_dept"),
            models.Index(fields=["course_code"], name="idx_course_code"),
        ]
    
    def __str__(self):
        return f"{self.course_code} - {self.course_name}"

# Alias for backward compatibility
Subject = Course


# ============================================
# 4. FACULTY MANAGEMENT (2400+ faculty for Harvard-scale)
# ============================================


class Faculty(models.Model):
    """
    Faculty members
    Supports 2000+ faculty for large universities
    """

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

    faculty_code = models.CharField(max_length=30)  # Unique within organization
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

    # User Account - removed as it doesn't exist in database
    # user = models.OneToOneField(
    #     "User",
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name="faculty_profile",
    # )

    class Meta:
        db_table = "faculty"
        unique_together = [["organization", "faculty_code"]]
        indexes = [
            models.Index(
                fields=["organization", "department", "is_active"],
                name="fac_org_dept_avail_idx",
            ),
            models.Index(fields=["designation"], name="fac_desig_idx"),
            # models.Index(fields=["user"], name="fac_user_idx"),
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


# FacultySubject removed - not in database


# ============================================
# 5. STUDENT MANAGEMENT (25000+ students)
# ============================================


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
    """
    Student records - matches actual database schema
    """

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


# ============================================
# 6. USER AUTHENTICATION (Multi-Tenant Aware)
# ============================================


class User(AbstractUser):
    """
    Custom user model with multi-tenant support
    """

    ROLE_CHOICES = [
        ("super_admin", "Super Admin (Platform)"),
        ("org_admin", "Organization Admin"),
        ("dean", "Dean"),
        ("hod", "Head of Department"),
        ("faculty", "Faculty"),
        ("student", "Student"),
        ("staff", "Administrative Staff"),
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


# ============================================
# 7. INFRASTRUCTURE (Classrooms, Labs)
# ============================================


class Room(models.Model):
    """Rooms table (renamed from Classroom)"""
    
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

# Alias for backward compatibility
Classroom = Room


# ============================================
# 8. TIME MANAGEMENT
# ============================================


class TimeSlot(models.Model):
    """
    Standard time slots for timetable
    36 slots per week (6 days × 6 periods)
    """

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

    slot_name = models.CharField(max_length=50)  # e.g., "Period 1", "Morning Session"
    slot_order = models.IntegerField()  # For sorting

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


# ============================================
# 9. ENROLLMENT & SUBJECT ALLOCATION
# ============================================


# BatchSubjectEnrollment removed - not in database


# StudentElectiveChoice removed - not in database


# ============================================
# 10. SYSTEM CONFIGURATION
# ============================================


# TimetablePreferences removed - not in database


# ============================================
# BACKWARD COMPATIBILITY ALIASES
# ============================================
Lab = Room  # Labs are rooms with room_type='laboratory'


# ============================================
# LEGACY MODELS (For Old Views/Serializers)
# ============================================
# These models support the existing API until full migration


class GenerationJob(models.Model):
    """Timetable generation job tracking (legacy)"""

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
    timetable_data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "generation_jobs"
        ordering = ["-created_at"]


class Timetable(models.Model):
    """Generated timetable (legacy)"""

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
    """Individual timetable slots (legacy)"""

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


class Attendance(models.Model):
    """Attendance tracking (legacy)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="attendances"
    )
    timetable_slot = models.ForeignKey(
        TimetableSlot, on_delete=models.CASCADE, related_name="attendances"
    )
    date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=[
            ("present", "Present"),
            ("absent", "Absent"),
            ("late", "Late"),
            ("excused", "Excused"),
        ],
    )
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    marked_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "attendance"
        unique_together = [["student", "timetable_slot", "date"]]
        indexes = [
            models.Index(fields=["student", "date"]),
            models.Index(fields=["timetable_slot", "date"]),
        ]
