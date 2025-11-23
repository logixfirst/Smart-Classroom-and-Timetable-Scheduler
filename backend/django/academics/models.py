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

    INSTITUTE_TYPE_CHOICES = [
        ("iit", "Indian Institute of Technology"),
        ("nit", "National Institute of Technology"),
        ("iiit", "Indian Institute of Information Technology"),
        ("central_university", "Central University"),
        ("state_university", "State University"),
        ("deemed_university", "Deemed University"),
        ("private_university", "Private University"),
        ("autonomous_college", "Autonomous College"),
        ("affiliated_college", "Affiliated College"),
        ("polytechnic", "Polytechnic Institute"),
        ("research_institute", "Research Institute"),
    ]

    STATUS_CHOICES = [
        ("trial", "Trial Period"),
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("cancelled", "Cancelled"),
    ]

    org_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org_code = models.CharField(
        max_length=20, unique=True, db_index=True
    )  # e.g., 'BHU', 'IITD'
    org_name = models.CharField(max_length=200)  # Full name
    short_name = models.CharField(max_length=100)  # Display name

    institute_type = models.CharField(max_length=30, choices=INSTITUTE_TYPE_CHOICES)
    established_year = models.IntegerField(null=True, blank=True)

    # Contact Information
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default="India")

    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    website = models.URLField(null=True, blank=True)

    # Subscription & Billing
    subscription_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="trial"
    )
    subscription_start_date = models.DateField()
    subscription_end_date = models.DateField()
    max_students = models.IntegerField(default=5000)  # License limit
    max_faculty = models.IntegerField(default=500)

    # Configuration
    academic_year_format = models.CharField(
        max_length=20, default="2024-25"
    )  # How they display years
    current_academic_year = models.CharField(max_length=20)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")

    # Branding
    logo_url = models.URLField(null=True, blank=True)
    primary_color = models.CharField(max_length=7, default="#0066CC")  # Hex color

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "organizations"
        indexes = [
            models.Index(fields=["org_code"], name="org_code_idx"),
            models.Index(
                fields=["subscription_status", "is_active"], name="org_status_idx"
            ),
            models.Index(fields=["institute_type"], name="org_type_idx"),
        ]

    def __str__(self):
        return f"{self.org_code} - {self.short_name}"


class Campus(models.Model):
    """
    Multiple campuses for an organization
    Example: BHU has Main Campus, IIT-BHU Campus, Medical Campus
    """

    campus_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="campuses"
    )

    campus_code = models.CharField(max_length=20)  # e.g., 'MAIN', 'IIT', 'MED'
    campus_name = models.CharField(max_length=200)

    address = models.TextField()
    city = models.CharField(max_length=100)
    area_in_acres = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    is_main_campus = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "campuses"
        unique_together = [["organization", "campus_code"]]
        indexes = [
            models.Index(
                fields=["organization", "is_active"], name="campus_org_active_idx"
            ),
        ]

    def __str__(self):
        return f"{self.campus_name} - {self.organization.org_code}"


# ============================================
# 2. ACADEMIC STRUCTURE (Multi-Level Hierarchy)
# ============================================


class School(models.Model):
    """
    Schools/Faculties/Institutes within an organization
    Examples: IIT-BHU, Faculty of Arts, Institute of Medical Sciences
    Harvard-style: 12+ schools per university
    """

    school_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="schools"
    )
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="schools")

    school_code = models.CharField(max_length=20)  # e.g., 'IIT-BHU', 'FMS', 'IOS'
    school_name = models.CharField(max_length=200)

    dean_name = models.CharField(max_length=100, null=True, blank=True)
    dean_email = models.EmailField(null=True, blank=True)
    dean_phone = models.CharField(max_length=20, null=True, blank=True)

    building_names = models.TextField(
        null=True, blank=True
    )  # JSON list or comma-separated

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "schools"
        unique_together = [["organization", "school_code"]]
        indexes = [
            models.Index(
                fields=["organization", "is_active"], name="school_org_active_idx"
            ),
            models.Index(fields=["campus"], name="school_campus_idx"),
        ]

    def __str__(self):
        return f"{self.school_name} ({self.organization.org_code})"


class Department(models.Model):
    """
    Departments within schools
    80-100+ departments for large universities
    """

    dept_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="departments"
    )
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, related_name="departments"
    )

    dept_code = models.CharField(max_length=20)  # e.g., 'CSE', 'ECE', 'MATH'
    dept_name = models.CharField(max_length=200)

    hod_name = models.CharField(max_length=100, null=True, blank=True)
    hod_email = models.EmailField(null=True, blank=True)

    building_name = models.CharField(max_length=100, null=True, blank=True)
    floor_numbers = models.CharField(max_length=50, null=True, blank=True)

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

    def __str__(self):
        return f"{self.dept_name} - {self.school.school_code}"


# ============================================
# 3. PROGRAMS & COURSES (NEP 2020 Compliant)
# ============================================


class Program(models.Model):
    """
    Degree programs offered
    Examples: BTech CSE, MBA, MBBS, BA English
    100+ programs per large university
    """

    PROGRAM_TYPE_CHOICES = [
        ("ug", "Undergraduate"),
        ("pg", "Postgraduate"),
        ("diploma", "Diploma"),
        ("certificate", "Certificate"),
        ("integrated", "Integrated (UG+PG)"),
        ("phd", "Doctoral (PhD)"),
    ]

    program_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="programs"
    )
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, related_name="programs"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="programs",
        null=True,
        blank=True,
    )

    program_code = models.CharField(max_length=20)  # e.g., 'BTECH-CSE', 'MBA-FIN'
    program_name = models.CharField(max_length=200)
    program_type = models.CharField(max_length=20, choices=PROGRAM_TYPE_CHOICES)

    duration_years = models.DecimalField(
        max_digits=3, decimal_places=1
    )  # 4.0, 4.5, 5.5 years
    total_semesters = models.IntegerField()
    total_credits = models.IntegerField()

    # NEP 2020 Fields
    allow_multiple_entry_exit = models.BooleanField(default=True)
    exit_certificate_1_year = models.CharField(
        max_length=100, null=True, blank=True
    )  # Certificate after 1 year
    exit_diploma_2_years = models.CharField(
        max_length=100, null=True, blank=True
    )  # Diploma after 2 years
    exit_degree_3_years = models.CharField(
        max_length=100, null=True, blank=True
    )  # Degree after 3 years

    intake_capacity = models.IntegerField()  # Max students per year
    min_eligibility = models.TextField()  # Eligibility criteria

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "programs"
        unique_together = [["organization", "program_code"]]
        indexes = [
            models.Index(
                fields=["organization", "program_type", "is_active"],
                name="prog_org_type_idx",
            ),
            models.Index(fields=["school"], name="prog_school_idx"),
            models.Index(fields=["department"], name="prog_dept_idx"),
        ]

    def __str__(self):
        return f"{self.program_name} ({self.program_code})"


class Subject(models.Model):
    """
    Individual subjects/courses offered
    200+ subjects per large university
    """

    SUBJECT_TYPE_CHOICES = [
        ("core", "Core/Mandatory"),
        ("elective", "Elective"),
        ("open_elective", "Open Elective"),
        ("minor", "Minor"),
        ("audit", "Audit Course"),
        ("value_added", "Value Added Course"),
        ("skill_course", "Skill Enhancement Course"),
        ("ability_enhancement", "Ability Enhancement Compulsory Course (AECC)"),
        ("interdisciplinary", "Interdisciplinary"),
    ]

    subject_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="subjects"
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="subjects"
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name="subjects",
        null=True,
        blank=True,
    )

    subject_code = models.CharField(max_length=20)  # e.g., 'CSE101', 'MATH201'
    subject_name = models.CharField(max_length=200)
    subject_type = models.CharField(
        max_length=30, choices=SUBJECT_TYPE_CHOICES, default="core"
    )

    credits = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    lecture_hours_per_week = models.IntegerField(default=3)
    tutorial_hours_per_week = models.IntegerField(default=0)
    practical_hours_per_week = models.IntegerField(default=0)

    semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )

    # Lab Requirements
    requires_lab = models.BooleanField(default=False)
    lab_batch_size = models.IntegerField(
        null=True, blank=True
    )  # Max students in lab session

    # Classroom Requirements
    max_students_per_class = models.IntegerField(default=60)
    min_classroom_capacity = models.IntegerField(default=60)

    # Prerequisites
    prerequisite_subjects = models.ManyToManyField(
        "self", symmetrical=False, blank=True, related_name="prerequisite_for"
    )

    # Syllabus
    syllabus_url = models.URLField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subjects"
        unique_together = [["organization", "subject_code"]]
        indexes = [
            models.Index(
                fields=["organization", "department", "is_active"],
                name="subj_org_dept_idx",
            ),
            models.Index(fields=["program", "semester"], name="subj_prog_sem_idx"),
            models.Index(fields=["subject_type"], name="subj_type_idx"),
        ]

    def __str__(self):
        return f"{self.subject_code} - {self.subject_name}"


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

    faculty_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="faculty_members"
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="faculty_members"
    )

    employee_id = models.CharField(max_length=30)  # Unique within organization
    faculty_name = models.CharField(max_length=100)
    designation = models.CharField(max_length=30, choices=DESIGNATION_CHOICES)

    email = models.EmailField()
    phone = models.CharField(max_length=20, null=True, blank=True)

    specialization = models.CharField(max_length=200)
    qualifications = models.TextField(null=True, blank=True)  # PhD, MTech, etc.

    # Teaching Load
    max_teaching_hours_per_week = models.IntegerField(default=18)
    avg_leaves_per_month = models.DecimalField(
        max_digits=3, decimal_places=1, default=1.5
    )

    # Availability
    is_available = models.BooleanField(default=True)
    date_of_joining = models.DateField(null=True, blank=True)
    date_of_leaving = models.DateField(null=True, blank=True)

    # User Account
    user = models.OneToOneField(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="faculty_profile",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty"
        unique_together = [["organization", "employee_id"]]
        indexes = [
            models.Index(
                fields=["organization", "department", "is_available"],
                name="fac_org_dept_avail_idx",
            ),
            models.Index(fields=["designation"], name="fac_desig_idx"),
            models.Index(fields=["user"], name="fac_user_idx"),
        ]

    def __str__(self):
        return f"{self.faculty_name} ({self.employee_id})"


class FacultySubject(models.Model):
    """
    Faculty-Subject mapping with preference levels
    Faculty can teach multiple subjects
    """

    mapping_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    faculty = models.ForeignKey(
        Faculty, on_delete=models.CASCADE, related_name="subject_mappings"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="faculty_mappings"
    )

    preference_level = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text="1=Most Preferred, 2=Moderate, 3=Can Teach",
    )

    can_handle_lab = models.BooleanField(default=True)
    years_of_experience_teaching = models.IntegerField(default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "faculty_subjects"
        unique_together = [["faculty", "subject"]]
        indexes = [
            models.Index(
                fields=["organization", "subject"], name="facsubj_org_subj_idx"
            ),
            models.Index(
                fields=["faculty", "preference_level"], name="facsubj_fac_pref_idx"
            ),
        ]

    def __str__(self):
        return f"{self.faculty.faculty_name} → {self.subject.subject_code}"


# ============================================
# 5. STUDENT MANAGEMENT (25000+ students)
# ============================================


class Batch(models.Model):
    """
    Student batches/sections
    Example: BTech CSE 2024 Batch A, MBA 2024
    """

    batch_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="batches"
    )
    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name="batches"
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="batches"
    )

    batch_name = models.CharField(max_length=100)  # e.g., "BTech CSE 2024 Batch"
    batch_code = models.CharField(max_length=20)  # e.g., "24CSEА"

    year_of_admission = models.IntegerField()
    current_semester = models.IntegerField()
    section = models.CharField(max_length=5, default="A")  # A, B, C sections

    total_students = models.IntegerField()

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "batches"
        unique_together = [["organization", "program", "year_of_admission", "section"]]
        indexes = [
            models.Index(
                fields=["organization", "current_semester", "is_active"],
                name="batch_org_sem_idx",
            ),
            models.Index(fields=["program"], name="batch_prog_idx"),
        ]

    def __str__(self):
        return f"{self.batch_name} - Section {self.section}"


class Student(models.Model):
    """
    Student records
    Scalable to 25000+ students per organization
    """

    student_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="students"
    )
    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name="students"
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="students"
    )
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="students")

    roll_number = models.CharField(max_length=30)  # Unique within organization
    student_name = models.CharField(max_length=100)

    email = models.EmailField()
    phone = models.CharField(max_length=20, null=True, blank=True)

    current_semester = models.IntegerField()
    current_year = models.IntegerField()

    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    date_of_admission = models.DateField()
    expected_graduation_year = models.IntegerField()

    # Advisor
    faculty_advisor = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="advised_students",
    )

    # Status
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("enrolled", "Enrolled"),
            ("on_leave", "On Leave"),
            ("suspended", "Suspended"),
            ("graduated", "Graduated"),
            ("dropout", "Dropout"),
        ],
        default="enrolled",
    )

    # User Account
    user = models.OneToOneField(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_profile",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "students"
        unique_together = [["organization", "roll_number"]]
        indexes = [
            models.Index(
                fields=["organization", "current_semester", "is_active"],
                name="stu_org_sem_idx",
            ),
            models.Index(fields=["batch"], name="stu_batch_idx"),
            models.Index(fields=["user"], name="stu_user_idx"),
        ]

    def __str__(self):
        return f"{self.roll_number} - {self.student_name}"


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

    user_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")

    # Allow multiple organizations for super admins
    can_access_multiple_orgs = models.BooleanField(default=False)

    phone = models.CharField(max_length=20, null=True, blank=True)
    profile_picture = models.URLField(null=True, blank=True)

    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    login_count = models.IntegerField(default=0)

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


class Classroom(models.Model):
    """
    Classrooms and Labs
    70+ venues per large campus
    """

    ROOM_TYPE_CHOICES = [
        ("lecture_hall", "Lecture Hall"),
        ("seminar_hall", "Seminar Hall"),
        ("tutorial_room", "Tutorial Room"),
        ("laboratory", "Laboratory"),
        ("auditorium", "Auditorium"),
        ("smart_classroom", "Smart Classroom"),
    ]

    classroom_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="classrooms"
    )
    campus = models.ForeignKey(
        Campus, on_delete=models.CASCADE, related_name="classrooms"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classrooms",
    )

    classroom_code = models.CharField(max_length=20)  # e.g., 'LH-101', 'CSL-201'
    building_name = models.CharField(max_length=100)
    floor_number = models.IntegerField()

    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES)
    seating_capacity = models.IntegerField()

    # Facilities
    has_projector = models.BooleanField(default=False)
    has_ac = models.BooleanField(default=False)
    has_smart_board = models.BooleanField(default=False)
    has_lab_equipment = models.BooleanField(default=False)
    has_computers = models.BooleanField(default=False)
    computer_count = models.IntegerField(null=True, blank=True)

    is_available = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "classrooms"
        unique_together = [["organization", "classroom_code"]]
        indexes = [
            models.Index(
                fields=["organization", "room_type", "is_available"],
                name="room_org_type_avail_idx",
            ),
            models.Index(fields=["campus"], name="room_campus_idx"),
        ]

    def __str__(self):
        return f"{self.classroom_code} - {self.building_name}"


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
        Organization, on_delete=models.CASCADE, related_name="timeslots"
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


class BatchSubjectEnrollment(models.Model):
    """
    Maps batches to subjects they must study
    """

    enrollment_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name="subject_enrollments"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="batch_enrollments"
    )

    is_mandatory = models.BooleanField(default=True)
    enrolled_students = models.IntegerField()  # Count of students enrolled

    academic_year = models.CharField(max_length=20)
    semester = models.IntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "batch_subject_enrollments"
        unique_together = [["batch", "subject", "academic_year", "semester"]]
        indexes = [
            models.Index(fields=["organization", "semester"], name="bse_org_sem_idx"),
            models.Index(fields=["batch"], name="bse_batch_idx"),
        ]

    def __str__(self):
        return f"{self.batch.batch_name} → {self.subject.subject_code}"


class StudentElectiveChoice(models.Model):
    """
    Student elective subject choices
    """

    choice_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="elective_choices"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="student_choices"
    )

    semester = models.IntegerField()
    choice_priority = models.IntegerField(default=1)  # 1st choice, 2nd choice, etc.

    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        Faculty, on_delete=models.SET_NULL, null=True, blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_elective_choices"
        unique_together = [["student", "subject", "semester"]]
        indexes = [
            models.Index(
                fields=["organization", "semester", "is_approved"],
                name="elec_org_sem_appr_idx",
            ),
        ]

    def __str__(self):
        return f"{self.student.roll_number} → {self.subject.subject_code}"


# ============================================
# 10. SYSTEM CONFIGURATION
# ============================================


class TimetablePreferences(models.Model):
    """
    Organization-specific timetable generation preferences
    """

    pref_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="timetable_preferences"
    )

    max_classes_per_day = models.IntegerField(default=6)
    max_consecutive_classes = models.IntegerField(default=3)
    min_break_duration_minutes = models.IntegerField(default=15)

    lunch_break_start = models.TimeField()
    lunch_break_end = models.TimeField()

    working_days_per_week = models.IntegerField(default=6)
    class_duration_minutes = models.IntegerField(default=60)

    allow_saturday_classes = models.BooleanField(default=True)
    allow_back_to_back_labs = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "timetable_preferences"

    def __str__(self):
        return f"Preferences - {self.organization.org_code}"


# ============================================
# BACKWARD COMPATIBILITY ALIASES
# ============================================
# These aliases allow old code to continue working
# while we migrate to the new multi-tenant architecture

# Create aliases for commonly used model names
Course = Program  # Old 'Course' is now 'Program'
Lab = Classroom  # Old 'Lab' is part of 'Classroom' (room_type='lab')


# ============================================
# LEGACY MODELS (For Old Views/Serializers)
# ============================================
# These models support the existing API until full migration


class GenerationJob(models.Model):
    """Timetable generation job tracking (legacy)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
    timetable = models.ForeignKey(
        Timetable, on_delete=models.CASCADE, related_name="slots"
    )
    day = models.CharField(max_length=10)
    start_time = models.TimeField()
    end_time = models.TimeField()
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE)

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
