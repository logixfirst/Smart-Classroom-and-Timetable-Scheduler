"""
Timetable Viewing API - RBAC-based timetable access
HOD, Faculty, and Student views

Caching:
  - department timetable : 3 min  (cache_key scoped to dept_id)
  - faculty timetable    : 3 min  (cache_key scoped to faculty pk)
  - student timetable    : 3 min  (cache_key scoped to student pk + semester)
  All views emit X-Cache: HIT|MISS headers.
"""
import logging

from core.cache_service import CacheService
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Department, TimetableSlot
from ..serializers import TimetableSlotSerializer

logger = logging.getLogger(__name__)

_TIMETABLE_TTL = 180   # 3 minutes — timetables can be regenerated mid-day


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_department_timetable(request, dept_id):
    """
    HOD views their department timetable
    GET /api/timetable/department/{dept_id}/

    Access: Admin (all departments), HOD (their department only)
    """
    user = request.user

    # Check permissions
    if user.role not in ["super_admin", "org_admin", "hod"]:
        return Response(
            {
                "success": False,
                "error": "Only admin and HOD can view department timetables",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # HOD can only see their own department
    if user.role.lower() == "hod":
        try:
            faculty_profile = user.faculty_profile
            if str(faculty_profile.department.dept_id) != dept_id:
                return Response(
                    {
                        "success": False,
                        "error": "You can only view your own department timetable",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        except Exception:
            return Response(
                {"success": False, "error": "Faculty profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    cache_key = CacheService.generate_cache_key(
        "timetable", "department", dept_id=str(dept_id)
    )

    def _fetch():
        department = Department.objects.get(dept_id=dept_id)
        slots = (
            TimetableSlot.objects.filter(
                subject__department_id=dept_id, timetable__is_active=True
            )
            .select_related("subject", "faculty", "batch", "classroom", "timetable")
            .order_by("day", "start_time")
        )
        return {
            "success": True,
            "department": {
                "dept_id":   str(department.dept_id),
                "dept_code": department.dept_code,
                "dept_name": department.dept_name,
            },
            "total_slots": slots.count(),
            "slots": TimetableSlotSerializer(slots, many=True).data,
        }

    try:
        payload = CacheService.get_or_set(cache_key, _fetch, timeout=_TIMETABLE_TTL)
        cached_hit = CacheService.get(cache_key) is not None
        resp = Response(payload)
        resp["X-Cache"]     = "HIT" if cached_hit else "MISS"
        resp["X-Cache-Key"] = cache_key
        return resp

    except Department.DoesNotExist:
        return Response(
            {"success": False, "error": "Department not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error("Error fetching department timetable: %s", e)
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_faculty_timetable(request):
    """
    Faculty personal timetable — Redis-cached 3 min per faculty pk.
    GET /api/timetable/faculty/me/
    """
    user = request.user

    if user.role not in ["faculty", "hod"]:
        return Response(
            {"success": False, "error": "Only faculty can access this endpoint"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        faculty_profile = user.faculty_profile
    except Exception:
        return Response(
            {"success": False, "error": "Faculty profile not found or error fetching timetable"},
            status=status.HTTP_404_NOT_FOUND,
        )

    cache_key = CacheService.generate_cache_key(
        "timetable", "faculty", faculty_pk=str(faculty_profile.pk)
    )

    def _fetch():
        slots = (
            TimetableSlot.objects.filter(
                faculty=faculty_profile, timetable__is_active=True
            )
            .select_related("subject", "batch", "classroom", "timetable")
            .order_by("day", "start_time")
        )
        return {
            "success": True,
            "faculty": {
                "faculty_id":   str(faculty_profile.faculty_id),
                "faculty_name": faculty_profile.faculty_name,
                "employee_id":  faculty_profile.employee_id,
                "designation":  faculty_profile.designation,
                "department":   faculty_profile.department.dept_name,
            },
            "total_classes": slots.count(),
            "slots": TimetableSlotSerializer(slots, many=True).data,
        }

    try:
        payload    = CacheService.get_or_set(cache_key, _fetch, timeout=_TIMETABLE_TTL)
        cached_hit = CacheService.get(cache_key) is not None
        resp = Response(payload)
        resp["X-Cache"]     = "HIT" if cached_hit else "MISS"
        resp["X-Cache-Key"] = cache_key
        return resp
    except Exception as e:
        logger.error("Error fetching faculty timetable: %s", e)
        return Response(
            {"success": False, "error": "Faculty profile not found or error fetching timetable"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_student_timetable(request):
    """
    Student personal schedule — Redis-cached 3 min per student pk + semester.
    GET /api/timetable/student/me/
    """
    user = request.user

    if user.role.lower() != "student":
        return Response(
            {"success": False, "error": "Only students can access this endpoint"},
            status=status.HTTP_403_FORBIDDEN,
        )

    from ..models import Student, Batch

    try:
        student = Student.objects.select_related("department", "program").get(
            username=user.username
        )
    except Student.DoesNotExist:
        logger.error("Student with username %s not found", user.username)
        return Response(
            {"success": False, "error": "Student profile not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    cache_key = CacheService.generate_cache_key(
        "timetable", "student",
        student_pk=str(student.pk),
        semester=str(student.current_semester),
    )

    def _fetch():
        batch = None
        batch_name = "N/A"
        if student.batch_id:
            try:
                batch = Batch.objects.get(batch_id=student.batch_id)
                batch_name = batch.batch_name
            except Batch.DoesNotExist:
                pass

        slots = []
        if batch:
            slots = (
                TimetableSlot.objects.filter(
                    batch=batch, timetable__is_active=True
                )
                .select_related("subject", "faculty", "classroom", "timetable")
                .order_by("day", "start_time")
            )

        return {
            "success": True,
            "student": {
                "student_id":   str(student.student_id),
                "roll_number":  student.roll_number or student.enrollment_number,
                "student_name": f"{student.first_name} {student.middle_name or ''} {student.last_name}".strip(),
                "batch":        batch_name,
                "semester":     student.current_semester,
                "department":   student.department.dept_name if student.department else "N/A",
            },
            "total_classes": len(slots),
            "slots": TimetableSlotSerializer(slots, many=True).data,
        }

    try:
        payload    = CacheService.get_or_set(cache_key, _fetch, timeout=_TIMETABLE_TTL)
        cached_hit = CacheService.get(cache_key) is not None
        resp = Response(payload)
        resp["X-Cache"]     = "HIT" if cached_hit else "MISS"
        resp["X-Cache-Key"] = cache_key
        return resp
    except Exception as e:
        logger.error("Error fetching student timetable: %s", e)
        return Response(
            {"success": False, "error": "Student profile not found or error fetching timetable"},
            status=status.HTTP_404_NOT_FOUND,
        )



@api_view(["POST"])
def fastapi_callback(request):
    """
    FastAPI callback endpoint - saves generated timetable to PostgreSQL
    POST /api/timetable/callback/

    Called by FastAPI after generation completes
    Body: {
        "job_id": "tt_abc123",
        "status": "completed",
        "variants": [...],
        "generation_time": 450.5
    }
    """
    from django.utils import timezone

    from ..models import GenerationJob, Timetable, TimetableSlot

    try:
        job_id = request.data.get("job_id")
        callback_status = request.data.get("status")
        variants = request.data.get("variants", [])
        # generation_time = request.data.get("generation_time", 0)  # Unused variable
        error = request.data.get("error")

        # Get generation job
        try:
            job = GenerationJob.objects.get(id=job_id)
        except GenerationJob.DoesNotExist:
            return Response(
                {"success": False, "error": f"Job {job_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update job status
        if callback_status == "completed":
            job.status = "completed"
            job.progress = 100
            job.completed_at = timezone.now()

            # Save variants to database
            for variant in variants:
                timetable = Timetable.objects.create(
                    name=variant.get("name", "Generated Timetable"),
                    academic_year=job.academic_year
                    if hasattr(job, "academic_year")
                    else "2024-25",
                    semester=job.semester if hasattr(job, "semester") else 1,
                    generation_job=job,
                    is_active=False,  # Not active until approved
                )

                # Save timetable slots
                entries = variant.get("entries", [])
                for entry in entries:
                    TimetableSlot.objects.create(
                        timetable=timetable,
                        day=entry.get("day"),
                        start_time=entry.get("start_time"),
                        end_time=entry.get("end_time"),
                        subject_id=entry.get("subject_id"),
                        faculty_id=entry.get("faculty_id"),
                        batch_id=entry.get("batch_id"),
                        classroom_id=entry.get("classroom_id"),
                    )

            logger.info(f"Saved {len(variants)} variants for job {job_id}")

        elif callback_status == "failed":
            job.status = "failed"
            job.error_message = error or "Generation failed"
            job.completed_at = timezone.now()

        job.save()

        return Response(
            {
                "success": True,
                "message": f"Job {job_id} updated successfully",
                "status": job.status,
            }
        )

    except Exception as e:
        logger.error(f"Error in FastAPI callback: {str(e)}")
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
