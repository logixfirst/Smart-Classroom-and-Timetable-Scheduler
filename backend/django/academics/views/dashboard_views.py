"""
Dashboard views: Stats, student profile, faculty profile
User-specific dashboard data and course information
"""

import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Student, Faculty, CourseOffering

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics — single-query, Redis-cached for 2 min."""
    CACHE_KEY = 'dashboard_stats_v1'
    CACHE_TTL = 120  # 2 minutes

    payload = cache.get(CACHE_KEY)
    if payload is not None:
        return Response(payload)

    try:
        from django.db import connection

        with connection.cursor() as cursor:
            # Single round-trip: four sub-selects evaluated in parallel by the DB engine
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM users)                         AS total_users,
                    (SELECT COUNT(*) FROM courses WHERE is_active = TRUE) AS active_courses,
                    (SELECT COUNT(*) FROM students WHERE is_active = TRUE) AS total_students,
                    (SELECT COUNT(*) FROM faculty)                       AS total_faculty
            """)
            total_users, active_courses, total_students, total_faculty = cursor.fetchone()

        stats = {
            "total_users":       total_users,
            "active_courses":    active_courses,
            "total_students":    total_students,
            "total_faculty":     total_faculty,
            "pending_approvals": 0,
            "system_health":     98,
        }

        payload = {"stats": stats, "faculty": []}
        cache.set(CACHE_KEY, payload, CACHE_TTL)
        return Response(payload)

    except Exception as exc:
        logger.warning("dashboard_stats query failed", extra={"error": str(exc)})
        return Response({
            "stats": {
                "total_users": 0, "active_courses": 0,
                "total_students": 0, "total_faculty": 0,
                "pending_approvals": 0, "system_health": 98,
            },
            "faculty": [],
        })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_profile_and_courses(request):
    """Get student profile and enrolled courses — per-user Redis cache 5 min."""
    username = request.user.username
    CACHE_KEY = f'student_profile_{username}'
    CACHE_TTL = 300  # 5 minutes

    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Response(cached)

    try:
        
        try:
            student = Student.objects.select_related(
                'program', 'department', 'organization', 'minor_dept'
            ).get(username=username)
        except Student.DoesNotExist:
            return Response(
                {"error": "Student profile not found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get enrolled courses
        course_offerings = CourseOffering.objects.filter(
            organization=student.organization,
            semester_number=student.current_semester,
            is_active=True
        ).select_related('course', 'course__department', 'primary_faculty').defer('co_faculty_ids')
        
        # Build courses list
        courses = []
        for offering in course_offerings:
            faculty = offering.primary_faculty
            faculty_name = f"{faculty.first_name} {faculty.middle_name or ''} {faculty.last_name}".replace('  ', ' ').strip() if faculty else 'TBA'
            
            course_data = {
                "offering_id": str(offering.offering_id),
                "course_code": offering.course.course_code,
                "course_name": offering.course.course_name,
                "credits": offering.course.credits,
                "department": offering.course.department.dept_name if offering.course.department else None,
                "faculty_name": faculty_name,
                "academic_year": offering.academic_year,
                "semester_type": offering.semester_type,
                "semester_number": offering.semester_number,
                "total_enrolled": offering.total_enrolled,
                "number_of_sections": offering.number_of_sections,
            }
            courses.append(course_data)
        
        # Build student profile
        student_name = f"{student.first_name} {student.middle_name or ''} {student.last_name}".replace('  ', ' ').strip()
        student_data = {
            "student_id": str(student.student_id),
            "enrollment_number": student.enrollment_number,
            "roll_number": student.roll_number,
            "student_name": student_name,
            "email": student.email,
            "phone": student.phone_number,
            "department": student.department.dept_name if student.department else None,
            "department_code": student.department.dept_code if student.department else None,
            "program": student.program.program_name if student.program else None,
            "program_code": student.program.program_code if student.program else None,
            "current_semester": student.current_semester,
            "current_year": student.current_year,
            "admission_year": student.admission_year,
            "cgpa": float(student.cgpa) if student.cgpa else None,
            "total_credits_earned": float(student.total_credits_earned) if student.total_credits_earned else None,
            "current_semester_credits": student.current_semester_credits,
            "academic_status": student.get_academic_status_display() if student.academic_status else None,
            "is_active": student.is_active,
            "enrolled_courses": courses,
            "total_courses": len(courses),
        }

        cache.set(CACHE_KEY, student_data, CACHE_TTL)
        return Response(student_data, status=status.HTTP_200_OK)

    except Exception as exc:
        logger.warning("student_profile query failed", extra={"username": username, "error": str(exc)})
        return Response(
            {"error": f"Failed to fetch student profile: {str(exc)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def faculty_profile_and_courses(request):
    """Get faculty profile and assigned courses — per-user Redis cache 5 min."""
    username = request.user.username
    CACHE_KEY = f'faculty_profile_{username}'
    CACHE_TTL = 300  # 5 minutes

    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Response(cached)

    try:
        try:
            faculty = Faculty.objects.select_related('department', 'organization').get(username=username)
        except Faculty.DoesNotExist:
            return Response(
                {"error": "Faculty profile not found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get assigned courses
        course_offerings = CourseOffering.objects.filter(
            primary_faculty=faculty,
            is_active=True
        ).select_related('course', 'course__department').defer('co_faculty_ids').order_by('course__course_code')
        
        # Build courses list
        courses = []
        for offering in course_offerings:
            course_data = {
                "offering_id": str(offering.offering_id),
                "course_code": offering.course.course_code,
                "course_name": offering.course.course_name,
                "credits": offering.course.credits,
                "department": offering.course.department.dept_name if offering.course.department else None,
                "academic_year": offering.academic_year,
                "semester_type": offering.semester_type,
                "semester_number": offering.semester_number,
                "total_enrolled": offering.total_enrolled,
                "max_capacity": offering.max_capacity,
                "number_of_sections": offering.number_of_sections,
                "offering_status": offering.offering_status,
            }
            courses.append(course_data)
        
        # Build faculty profile
        faculty_name = f"{faculty.first_name} {faculty.middle_name or ''} {faculty.last_name}".replace('  ', ' ').strip()
        faculty_data = {
            "faculty_id": str(faculty.faculty_id),
            "faculty_code": faculty.faculty_code,
            "faculty_name": faculty_name,
            "email": faculty.email,
            "phone": faculty.phone_number,
            "department": faculty.department.dept_name if faculty.department else None,
            "department_code": faculty.department.dept_code if faculty.department else None,
            "specialization": faculty.specialization,
            "qualification": faculty.highest_qualification,
            "designation": faculty.get_designation_display() if faculty.designation else None,
            "max_workload_per_week": faculty.max_hours_per_week,
            "is_active": faculty.is_active,
            "assigned_courses": courses,
            "total_courses": len(courses),
            "total_students": sum(c["total_enrolled"] for c in courses),
        }

        cache.set(CACHE_KEY, faculty_data, CACHE_TTL)
        return Response(faculty_data, status=status.HTTP_200_OK)

    except Exception as exc:
        logger.warning("faculty_profile query failed", extra={"username": username, "error": str(exc)})
        return Response(
            {"error": f"Failed to fetch faculty profile: {str(exc)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
