from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

# Create your models here.


class User(AbstractUser):
    """Custom User model"""

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("staff", "Staff"),
        ("faculty", "Faculty"),
        ("student", "Student"),
    ]
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="student", db_index=True
    )
    department = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["role", "department"], name="users_role_dept_idx"),
            models.Index(fields=["username"], name="users_username_idx"),
            models.Index(fields=["email"], name="users_email_idx"),
            models.Index(fields=["is_active", "role"], name="users_active_role_idx"),
        ]


class Department(models.Model):
    """Department model based on departments.csv"""

    department_id = models.CharField(max_length=10, primary_key=True)
    department_name = models.CharField(max_length=100)
    building_name = models.CharField(max_length=50)
    head_of_department = models.CharField(max_length=100)

    class Meta:
        db_table = "departments"

    def __str__(self):
        return self.department_name


class Course(models.Model):
    """Course model based on courses.csv"""

    course_id = models.CharField(max_length=10, primary_key=True)
    course_name = models.CharField(max_length=100)
    duration_years = models.IntegerField()
    level = models.CharField(max_length=10)  # UG, PG, PhD

    class Meta:
        db_table = "courses"

    def __str__(self):
        return f"{self.course_name} ({self.course_id})"


class Subject(models.Model):
    """Subject model based on subjects.csv"""

    subject_id = models.CharField(max_length=10, primary_key=True)
    subject_name = models.CharField(max_length=100)
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="subjects"
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="subjects"
    )
    faculty_assigned = models.CharField(max_length=10)  # FK to Faculty
    credits = models.IntegerField()

    class Meta:
        db_table = "subjects"

    def __str__(self):
        return self.subject_name


class Faculty(models.Model):
    """Faculty model based on faculty_100.csv"""

    faculty_id = models.CharField(max_length=10, primary_key=True)
    faculty_name = models.CharField(max_length=100)
    designation = models.CharField(max_length=50)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="faculty_members"
    )
    specialization = models.CharField(max_length=100)
    max_workload_per_week = models.IntegerField()
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        db_table = "faculty"
        verbose_name_plural = "Faculty"

    def __str__(self):
        return f"{self.faculty_name} ({self.faculty_id})"


class Student(models.Model):
    """Student model based on students_5000.csv"""

    student_id = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="students"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="students"
    )
    electives = models.TextField()  # Comma-separated list
    year = models.IntegerField()
    semester = models.IntegerField()
    faculty_advisor = models.ForeignKey(
        Faculty, on_delete=models.SET_NULL, null=True, related_name="advised_students"
    )
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        db_table = "students"

    def __str__(self):
        return f"{self.name} ({self.student_id})"


class Batch(models.Model):
    """Batch model based on batches.csv"""

    batch_id = models.CharField(max_length=10, primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="batches")
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="batches"
    )
    year = models.IntegerField()
    semester = models.IntegerField()
    no_of_students = models.IntegerField()

    class Meta:
        db_table = "batches"
        verbose_name_plural = "Batches"

    def __str__(self):
        return f"{self.batch_id} - {self.department} Y{self.year}S{self.semester}"


class Classroom(models.Model):
    """Classroom model based on classrooms.csv"""

    ROOM_TYPE_CHOICES = [
        ("lecture hall", "Lecture Hall"),
        ("seminar room", "Seminar Room"),
        ("tutorial room", "Tutorial Room"),
        ("lab", "Lab"),
    ]

    room_id = models.CharField(max_length=10, primary_key=True)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="classrooms"
    )
    room_number = models.CharField(max_length=20)
    capacity = models.IntegerField()
    room_type = models.CharField(
        max_length=20, choices=ROOM_TYPE_CHOICES, default="lecture hall"
    )

    class Meta:
        db_table = "classrooms"

    def __str__(self):
        return f"{self.room_number} ({self.room_type})"


class Lab(models.Model):
    """Lab model based on labs.csv"""

    lab_id = models.CharField(max_length=10, primary_key=True)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="labs"
    )
    lab_name = models.CharField(max_length=100)
    capacity = models.IntegerField()

    class Meta:
        db_table = "labs"

    def __str__(self):
        return f"{self.lab_name} ({self.lab_id})"


class GenerationJob(models.Model):
    """Timetable Generation Job Tracking"""

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    job_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="generation_jobs"
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name="generation_jobs"
    )
    semester = models.IntegerField()
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued")
    progress = models.IntegerField(default=0)  # 0-100%
    error_message = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="generation_jobs"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "generation_jobs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Job {self.job_id} - {self.status} ({self.progress}%)"


class Timetable(models.Model):
    """Timetable model"""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("published", "Published"),
    ]

    timetable_id = models.AutoField(primary_key=True)
    generation_job = models.ForeignKey(
        GenerationJob,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timetables",
    )
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="timetables"
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name="timetables"
    )
    semester = models.IntegerField()
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_timetables"
    )

    class Meta:
        db_table = "timetables"

    def __str__(self):
        return f"Timetable {self.timetable_id} - {self.department} {self.batch}"


class TimetableSlot(models.Model):
    """Individual time slot in a timetable"""

    DAY_CHOICES = [
        ("monday", "Monday"),
        ("tuesday", "Tuesday"),
        ("wednesday", "Wednesday"),
        ("thursday", "Thursday"),
        ("friday", "Friday"),
        ("saturday", "Saturday"),
    ]

    slot_id = models.AutoField(primary_key=True)
    timetable = models.ForeignKey(
        Timetable, on_delete=models.CASCADE, related_name="slots"
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE)
    day = models.CharField(max_length=10, choices=DAY_CHOICES)
    time_slot = models.CharField(max_length=20)  # e.g., "9:00-10:00"
    is_lab = models.BooleanField(default=False)

    class Meta:
        db_table = "timetable_slots"
        unique_together = [["timetable", "day", "time_slot"]]

    def __str__(self):
        return f"{self.day} {self.time_slot} - {self.subject}"


class Attendance(models.Model):
    """Attendance tracking"""

    attendance_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="attendance_records"
    )
    slot = models.ForeignKey(
        TimetableSlot, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField()
    is_present = models.BooleanField(default=False)
    marked_by = models.ForeignKey(Faculty, on_delete=models.SET_NULL, null=True)
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance"
        unique_together = [["student", "slot", "date"]]

    def __str__(self):
        return f"{self.student} - {self.slot} - {self.date}"
