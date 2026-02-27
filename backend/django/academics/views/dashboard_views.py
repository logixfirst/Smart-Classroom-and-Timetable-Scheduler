"""
Dashboard views: Stats, student profile, faculty profile
User-specific dashboard data and course information

Caching strategy (Google / Netflix grade):
  - dashboard_stats      : org-scoped stats, 90 s (live-ish counters)
  - student_profile      : per-user, 5 min
  - faculty_profile      : per-user, 5 min
  All views use CacheService.get_or_set() for stampede-safe fills.
  X-Cache: HIT | MISS headers let frontend devtools show cache state.
"""

import logging

from core.cache_service import CacheService
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Student, Faculty, CourseOffering, Course

logger = logging.getLogger(__name__)


@transaction.non_atomic_requests  # read-only — skip per-request transaction overhead
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Org-scoped dashboard stats — ORM-based, Redis-cached 5 min.

    FIX 1: Uses Django ORM filtered by organisation_id (was unfiltered raw SQL).
    FIX 2: TTL raised to 300 s (was 90 s) — aggregates don't change per-second.
    FIX 3: X-Cache determined by explicit cache.get() BEFORE get_or_set(),
            not by a wasteful second cache.get() AFTER (was an extra round-trip).
    FIX 4: @non_atomic_requests opts out of ATOMIC_REQUESTS transaction wrapping
            (read-only view has no business opening a DB transaction).
    """
    User = get_user_model()
    org_pk    = request.user.organization_id   # UUID — no DB hit
    cache_key = CacheService.generate_cache_key("stats", "dashboard", org_id=str(org_pk))
    TTL = 300  # 5 min — aggregate totals don't change per-second

    def _fetch():
        # Four individual .count() calls each become a single indexed lookup.
        # Django generates: SELECT COUNT(*) FROM <table> WHERE org_id = %s [AND is_active]
        # Faculty already has idx on (org, dept, is_active); Course has idx_course_org_active;
        # Student gets idx_student_org_active via migration 0013.
        total_users    = User.objects.filter(organization_id=org_pk).count()
        active_courses = Course.objects.filter(organization_id=org_pk, is_active=True).count()
        total_students = Student.objects.filter(organization_id=org_pk, is_active=True).count()
        total_faculty  = Faculty.objects.filter(organization_id=org_pk, is_active=True).count()

        return {
            "stats": {
                "total_users":       total_users,
                "active_courses":    active_courses,
                "total_students":    total_students,
                "total_faculty":     total_faculty,
                "pending_approvals": 0,
                "system_health":     98,
            },
            "faculty": [],
        }

    try:
        # Check cache first — single round-trip, determines X-Cache without extra call
        cached = CacheService.get(cache_key)
        if cached is not None:
            resp = Response(cached)
            resp["X-Cache"]     = "HIT"
            resp["X-Cache-Key"] = cache_key
            return resp

        payload = CacheService.get_or_set(cache_key, _fetch, timeout=TTL)
        resp = Response(payload)
        resp["X-Cache"]     = "MISS"
        resp["X-Cache-Key"] = cache_key
        return resp
    except Exception as exc:
        logger.warning("dashboard_stats query failed: %s", exc)
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
    """
    Per-user student profile + enrolled courses — Redis-cached 5 min.
    Stampede-safe via CacheService.get_or_set().
    """
    username  = request.user.username
    cache_key = CacheService.generate_cache_key("detail", "student_profile", username=username)
    TTL       = 300  # 5 min

    def _fetch():
        try:
            student = Student.objects.select_related(
                "program", "department", "organization", "minor_dept"
            ).get(username=username)
        except Student.DoesNotExist:
            return None  # sentinel; handled below

        course_offerings = CourseOffering.objects.filter(
            organization=student.organization,
            semester_number=student.current_semester,
            is_active=True,
        ).select_related(
            "course", "course__department", "primary_faculty"
        ).defer("co_faculty_ids")

        courses = []
        for offering in course_offerings:
            fac = offering.primary_faculty
            fac_name = (
                f"{fac.first_name} {fac.middle_name or ''} {fac.last_name}".replace("  ", " ").strip()
                if fac else "TBA"
            )
            courses.append({
                "offering_id":        str(offering.offering_id),
                "course_code":        offering.course.course_code,
                "course_name":        offering.course.course_name,
                "credits":            offering.course.credits,
                "department":         offering.course.department.dept_name if offering.course.department else None,
                "faculty_name":       fac_name,
                "academic_year":      offering.academic_year,
                "semester_type":      offering.semester_type,
                "semester_number":    offering.semester_number,
                "total_enrolled":     offering.total_enrolled,
                "number_of_sections": offering.number_of_sections,
            })

        student_name = f"{student.first_name} {student.middle_name or ''} {student.last_name}".replace("  ", " ").strip()
        return {
            "student_id":               str(student.student_id),
            "enrollment_number":        student.enrollment_number,
            "roll_number":              student.roll_number,
            "student_name":             student_name,
            "email":                    student.email,
            "phone":                    student.phone_number,
            "department":               student.department.dept_name if student.department else None,
            "department_code":          student.department.dept_code if student.department else None,
            "program":                  student.program.program_name if student.program else None,
            "program_code":             student.program.program_code if student.program else None,
            "current_semester":         student.current_semester,
            "current_year":             student.current_year,
            "admission_year":           student.admission_year,
            "cgpa":                     float(student.cgpa) if student.cgpa else None,
            "total_credits_earned":     float(student.total_credits_earned) if student.total_credits_earned else None,
            "current_semester_credits": student.current_semester_credits,
            "academic_status":          student.get_academic_status_display() if student.academic_status else None,
            "is_active":                student.is_active,
            "enrolled_courses":         courses,
            "total_courses":            len(courses),
        }

    try:
        data = CacheService.get_or_set(cache_key, _fetch, timeout=TTL)
        if data is None:
            return Response(
                {"error": "Student profile not found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )
        cached_hit = CacheService.get(cache_key) is not None
        resp = Response(data, status=status.HTTP_200_OK)
        resp["X-Cache"]     = "HIT" if cached_hit else "MISS"
        resp["X-Cache-Key"] = cache_key
        return resp
    except Exception as exc:
        logger.warning("student_profile query failed: username=%s  %s", username, exc)
        return Response(
            {"error": f"Failed to fetch student profile: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def faculty_profile_and_courses(request):
    """
    Per-user faculty profile + assigned courses — Redis-cached 5 min.
    Stampede-safe via CacheService.get_or_set().
    """
    username  = request.user.username
    cache_key = CacheService.generate_cache_key("detail", "faculty_profile", username=username)
    TTL       = 300  # 5 min

    def _fetch():
        try:
            faculty = Faculty.objects.select_related(
                "department", "organization"
            ).get(username=username)
        except Faculty.DoesNotExist:
            return None

        course_offerings = CourseOffering.objects.filter(
            primary_faculty=faculty,
            is_active=True,
        ).select_related(
            "course", "course__department"
        ).defer("co_faculty_ids").order_by("course__course_code")

        courses = []
        for offering in course_offerings:
            courses.append({
                "offering_id":      str(offering.offering_id),
                "course_code":      offering.course.course_code,
                "course_name":      offering.course.course_name,
                "credits":          offering.course.credits,
                "department":       offering.course.department.dept_name if offering.course.department else None,
                "academic_year":    offering.academic_year,
                "semester_type":    offering.semester_type,
                "semester_number":  offering.semester_number,
                "total_enrolled":   offering.total_enrolled,
                "max_capacity":     offering.max_capacity,
                "number_of_sections": offering.number_of_sections,
                "offering_status":  offering.offering_status,
            })

        faculty_name = f"{faculty.first_name} {faculty.middle_name or ''} {faculty.last_name}".replace("  ", " ").strip()
        return {
            "faculty_id":            str(faculty.faculty_id),
            "faculty_code":          faculty.faculty_code,
            "faculty_name":          faculty_name,
            "email":                 faculty.email,
            "phone":                 faculty.phone_number,
            "department":            faculty.department.dept_name if faculty.department else None,
            "department_code":       faculty.department.dept_code if faculty.department else None,
            "specialization":        faculty.specialization,
            "qualification":         faculty.highest_qualification,
            "designation":           faculty.get_designation_display() if faculty.designation else None,
            "max_workload_per_week": faculty.max_hours_per_week,
            "is_active":             faculty.is_active,
            "assigned_courses":      courses,
            "total_courses":         len(courses),
            "total_students":        sum(c["total_enrolled"] for c in courses),
        }

    try:
        data = CacheService.get_or_set(cache_key, _fetch, timeout=TTL)
        if data is None:
            return Response(
                {"error": "Faculty profile not found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )
        cached_hit = CacheService.get(cache_key) is not None
        resp = Response(data, status=status.HTTP_200_OK)
        resp["X-Cache"]     = "HIT" if cached_hit else "MISS"
        resp["X-Cache-Key"] = cache_key
        return resp
    except Exception as exc:
        logger.warning("faculty_profile query failed: username=%s  %s", username, exc)
        return Response(
            {"error": f"Failed to fetch faculty profile: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
