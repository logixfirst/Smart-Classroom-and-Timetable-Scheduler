"""
Course models: Course, CourseOffering, CourseEnrollment
Course management and enrollment tracking
"""

import uuid
from django.db import models
from .base import Organization
from .academic_structure import Department
from .faculty import Faculty


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
            models.Index(fields=["organization", "is_active"], name="idx_course_org_active"),
        ]
    
    def __str__(self):
        return f"{self.course_code} - {self.course_name}"


# Alias for backward compatibility
Subject = Course


class CourseOffering(models.Model):
    """Course offerings per semester - links courses to faculty"""
    
    offering_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="course_offerings", db_column='org_id')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="offerings", db_column='course_id')
    primary_faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name="course_offerings", db_column='primary_faculty_id')
    
    academic_year = models.CharField(max_length=10)
    semester_type = models.CharField(max_length=20)
    semester_number = models.IntegerField(null=True, blank=True)
    co_faculty_ids = models.JSONField(null=True, blank=True)
    number_of_sections = models.IntegerField(default=1)
    total_enrolled = models.IntegerField(default=0)
    max_capacity = models.IntegerField(null=True, blank=True)
    offering_status = models.CharField(max_length=50, default='SCHEDULED')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "course_offerings"
        indexes = [
            models.Index(fields=["organization", "semester_type", "is_active"], name="idx_offering_org_sem"),
            models.Index(fields=["course", "primary_faculty"], name="idx_offering_course_fac"),
            models.Index(fields=["organization", "is_active"], name="idx_offering_org_active"),
            models.Index(fields=["academic_year", "semester_type"], name="idx_offering_semester"),
        ]
    
    def __str__(self):
        return f"{self.course.course_code} - {self.semester_type}"


class CourseEnrollment(models.Model):
    """Student course enrollments - maps students to courses"""
    
    enrollment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="course_enrollments", db_column='org_id')
    student = models.ForeignKey('Student', on_delete=models.CASCADE, related_name="course_enrollments", db_column='student_id')
    course_offering = models.ForeignKey(CourseOffering, on_delete=models.CASCADE, related_name="enrollments", db_column='offering_id')
    
    enrollment_date = models.DateField(auto_now_add=True)
    enrollment_status = models.CharField(max_length=50, default='ENROLLED')
    grade = models.CharField(max_length=5, null=True, blank=True)
    grade_points = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "course_enrollments"
        unique_together = [["student", "course_offering"]]
        indexes = [
            models.Index(fields=["organization", "student", "is_active"], name="idx_enrollment_student"),
            models.Index(fields=["course_offering", "is_active"], name="idx_enrollment_offering"),
        ]
    
    def __str__(self):
        return f"{self.student.enrollment_number} - {self.course_offering.course.course_code}"
