"""
Enhanced Attendance Management Models with RBAC and Audit Logging
"""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .models import Batch, Course, Department, Faculty, Room, Student

# Alias for backward compatibility
Subject = Course
Classroom = Room


class SubjectEnrollment(models.Model):
    """
    Maps students to subjects they're enrolled in
    Auto-populated based on semester and course
    """

    enrollment_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="subject_enrollments"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="enrolled_students"
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="student_subject_enrollments",  # Changed to avoid clash with BatchSubjectEnrollment
        null=True,
    )
    academic_year = models.CharField(max_length=10)  # e.g., "2024-25"
    semester = models.IntegerField()
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "subject_enrollments"
        unique_together = [["student", "subject", "academic_year", "semester"]]
        indexes = [
            models.Index(fields=["student", "semester"], name="enroll_student_sem_idx"),
            models.Index(
                fields=["subject", "is_active"], name="enroll_subject_active_idx"
            ),
            models.Index(
                fields=["academic_year", "semester"], name="enroll_year_sem_idx"
            ),
        ]

    def __str__(self):
        return f"{self.student.name} - {self.subject.subject_name}"


class AttendanceSession(models.Model):
    """
    Represents a single class session for attendance marking
    """

    session_id = models.AutoField(primary_key=True)
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="attendance_sessions"
    )
    faculty = models.ForeignKey(
        Faculty, on_delete=models.CASCADE, related_name="conducted_sessions"
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name="attendance_sessions"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    session_type = models.CharField(
        max_length=20,
        choices=[
            ("lecture", "Lecture"),
            ("lab", "Lab"),
            ("tutorial", "Tutorial"),
            ("practical", "Practical"),
        ],
        default="lecture",
    )
    is_marked = models.BooleanField(default=False)
    marked_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_sessions"
        indexes = [
            models.Index(fields=["faculty", "date"], name="session_faculty_date_idx"),
            models.Index(fields=["subject", "date"], name="session_subject_date_idx"),
            models.Index(fields=["is_marked"], name="session_marked_idx"),
        ]

    def __str__(self):
        return (
            f"{self.subject.subject_name} - {self.date} - {self.faculty.faculty_name}"
        )


class AttendanceRecord(models.Model):
    """
    Individual student attendance for a session
    Enhanced with multiple status types and audit trail
    """

    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("late", "Late"),
        ("excused", "Excused"),
    ]

    record_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        AttendanceSession, on_delete=models.CASCADE, related_name="attendance_records"
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="attendance_records_new"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="absent")
    marked_by = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        null=True,
        related_name="marked_attendance_records",
    )
    marked_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    # For biometric/QR integration
    verification_method = models.CharField(
        max_length=20,
        choices=[
            ("manual", "Manual"),
            ("biometric", "Biometric"),
            ("qr", "QR Code"),
            ("rfid", "RFID"),
        ],
        default="manual",
    )
    verification_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "attendance_records"
        unique_together = [["session", "student"]]
        indexes = [
            models.Index(
                fields=["student", "status"], name="record_student_status_idx"
            ),
            models.Index(fields=["session"], name="record_session_idx"),
            models.Index(fields=["marked_at"], name="record_marked_at_idx"),
        ]

    def __str__(self):
        return f"{self.student.name} - {self.session} - {self.status}"


class AttendanceAuditLog(models.Model):
    """
    Audit trail for all attendance modifications
    Tracks who changed what and when
    """

    audit_id = models.AutoField(primary_key=True)
    record = models.ForeignKey(
        AttendanceRecord, on_delete=models.CASCADE, related_name="audit_logs"
    )
    action = models.CharField(
        max_length=10,
        choices=[
            ("create", "Create"),
            ("update", "Update"),
            ("delete", "Delete"),
            ("override", "Override"),
        ],
    )
    old_status = models.CharField(max_length=10, null=True, blank=True)
    new_status = models.CharField(max_length=10)
    changed_by = models.ForeignKey(
        "academics.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="attendance_changes",
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "attendance_audit_logs"
        indexes = [
            models.Index(fields=["record", "changed_at"], name="audit_record_time_idx"),
            models.Index(fields=["changed_by"], name="audit_changed_by_idx"),
        ]

    def __str__(self):
        return f"{self.action} - {self.record} - {self.changed_at}"


class AttendanceAlert(models.Model):
    """
    Alerts for low attendance, pending marking, etc.
    """

    ALERT_TYPES = [
        ("low_attendance", "Low Attendance"),
        ("pending_marking", "Pending Marking"),
        ("discrepancy", "Discrepancy"),
        ("threshold_breach", "Threshold Breach"),
    ]

    alert_id = models.AutoField(primary_key=True)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="attendance_alerts",
        null=True,
        blank=True,
    )
    faculty = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name="attendance_alerts",
        null=True,
        blank=True,
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="attendance_alerts",
        null=True,
        blank=True,
    )
    message = models.TextField()
    severity = models.CharField(
        max_length=10,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("critical", "Critical"),
        ],
        default="medium",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "attendance_alerts"
        indexes = [
            models.Index(fields=["student", "is_read"], name="alert_student_read_idx"),
            models.Index(fields=["faculty", "is_read"], name="alert_faculty_read_idx"),
            models.Index(fields=["created_at"], name="alert_created_idx"),
        ]

    def __str__(self):
        return f"{self.alert_type} - {self.severity} - {self.created_at}"


class AttendanceReport(models.Model):
    """
    Pre-generated attendance reports for quick access
    """

    REPORT_TYPES = [
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
        ("semester", "Semester"),
        ("custom", "Custom"),
    ]

    report_id = models.AutoField(primary_key=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    title = models.CharField(max_length=200)
    generated_by = models.ForeignKey(
        "academics.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="generated_reports",
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    # Filters
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True
    )
    course = models.ForeignKey(
        Course, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='attendance_reports_course'
    )
    subject = models.ForeignKey(
        Subject, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='attendance_reports_subject'
    )
    start_date = models.DateField()
    end_date = models.DateField()

    # Report data (JSON)
    data = models.JSONField()

    # File storage
    file_path = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "attendance_reports"
        indexes = [
            models.Index(
                fields=["generated_by", "generated_at"], name="report_gen_time_idx"
            ),
            models.Index(fields=["report_type"], name="report_type_idx"),
        ]

    def __str__(self):
        return f"{self.title} - {self.generated_at}"


class AttendanceThreshold(models.Model):
    """
    Configurable attendance thresholds for alerts
    """

    threshold_id = models.AutoField(primary_key=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="attendance_thresholds",
        null=True,
        blank=True,
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="attendance_thresholds",
        null=True,
        blank=True,
    )
    minimum_percentage = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)], default=75.0
    )
    warning_percentage = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)], default=80.0
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_thresholds"

    def __str__(self):
        if self.department:
            return f"{self.department} - {self.minimum_percentage}%"
        elif self.course:
            return f"{self.course} - {self.minimum_percentage}%"
        return f"Global - {self.minimum_percentage}%"
