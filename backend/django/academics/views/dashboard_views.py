"""
Dashboard views: Stats, student profile, faculty profile
User-specific dashboard data and course information

Caching strategy:
  L1 — process-local dict (microseconds, survives Redis outages)
  L2 — Redis via CacheService (cross-process, cross-worker)
  L3 — PostgreSQL (authoritative)
  TTL = 5 min at every layer.
"""

import logging
import time
from typing import Any

from core.cache_service import CacheService
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Student, Faculty, CourseOffering

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# L1 — Process-local in-memory cache
# ---------------------------------------------------------------------------
# Completely independent of Redis.  On a cold start (or Render free-tier spin-up)
# the first request hits L3; every subsequent request within _L1_TTL seconds
# returns in <1 ms without any network I/O.
# Key format: "dashboard_stats:<org_id>"  Value: (payload_dict, expire_at)
# ---------------------------------------------------------------------------
_L1_STORE: dict[str, tuple[Any, float]] = {}
_L1_TTL = 300  # seconds (5 min — same as Redis TTL)


def _l1_get(key: str) -> Any:
    entry = _L1_STORE.get(key)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    _L1_STORE.pop(key, None)  # evict expired entry
    return None


def _l1_set(key: str, value: Any) -> None:
    _L1_STORE[key] = (value, time.monotonic() + _L1_TTL)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Org-scoped dashboard stats with 3-tier caching:
      L1 (process dict) → L2 (Redis) → L3 (PostgreSQL single round-trip)
    """
    org_pk    = request.user.organization_id
    l1_key    = f"dashboard_stats:{org_pk}"
    redis_key = CacheService.generate_cache_key("stats", "dashboard", org_id=str(org_pk))

    # ── L1: process-local (fastest, no network) ────────────────────────────
    l1_hit = _l1_get(l1_key)
    if l1_hit is not None:
        resp = Response(l1_hit)
        resp["X-Cache"] = "L1-HIT"
        return resp

    # ── L2: Redis ────────────────────────────────────────────────────
    try:
        redis_hit = CacheService.get(redis_key)
        if redis_hit is not None:
            _l1_set(l1_key, redis_hit)  # warm L1
            resp = Response(redis_hit)
            resp["X-Cache"] = "L2-HIT"
            return resp
    except Exception:
        pass  # Redis down — fall through to DB

    # ── L3: Database (single SQL round-trip with indexed counts) ──────────
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SET LOCAL statement_timeout = '8000'")
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM users    WHERE org_id = %s)                       AS total_users,
                    (SELECT COUNT(*) FROM courses  WHERE org_id = %s AND is_active = TRUE)  AS active_courses,
                    (SELECT COUNT(*) FROM students WHERE org_id = %s AND is_active = TRUE)  AS total_students,
                    (SELECT COUNT(*) FROM faculty  WHERE org_id = %s AND is_active = TRUE)  AS total_faculty
            """, [org_pk, org_pk, org_pk, org_pk])
            row = cursor.fetchone()

        payload = {
            "stats": {
                "total_users":       row[0],
                "active_courses":    row[1],
                "total_students":    row[2],
                "total_faculty":     row[3],
                "pending_approvals": 0,
                "system_health":     98,
            },
            "faculty": [],
        }

        # Write to both L1 and L2
        _l1_set(l1_key, payload)
        try:
            CacheService.set(redis_key, payload, timeout=300)
        except Exception:
            pass  # Redis write failure is non-fatal; L1 will serve next requests

        resp = Response(payload)
        resp["X-Cache"] = "L3-MISS"
        return resp

    except Exception as exc:
        logger.warning("dashboard_stats DB query failed: %s", exc)
        # Return whatever is in L1 even if expired, beats returning zeros
        stale = _L1_STORE.get(l1_key)
        if stale:
            resp = Response(stale[0])
            resp["X-Cache"] = "L1-STALE"
            return resp
        return Response({
            "stats": {
                "total_users": 0, "active_courses": 0, "total_students": 0,
                "total_faculty": 0, "pending_approvals": 0, "system_health": 0,
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
