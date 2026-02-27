"""
ULTRA-FAST API Views — thin API layer, all cache I/O via CacheService.

Architecture: API layer must never touch infrastructure (cache/DB) directly.
Dependencies flow: API → Service (CacheService) → Infrastructure (Redis).
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import GenerationJob, Faculty, Course, Department, Student, Room
from core.cache_service import CacheService
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fast_generation_jobs(request):
    """Ultra-fast job list — 50 records max."""
    org_id = request.user.organization_id

    def _fetch():
        jobs = (
            GenerationJob.objects
            .filter(organization_id=org_id)
            .only('id', 'status', 'created_at')
            .order_by('-created_at')[:50]
        )
        return [
            {'id': str(j.id), 'status': j.status, 'created_at': j.created_at.isoformat()}
            for j in jobs
        ]

    return Response(CacheService.get_or_set(f'jobs_{org_id}', _fetch, timeout=300))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fast_faculty(request):
    """Ultra-fast faculty — 20 records max."""
    org_id = request.user.organization_id
    limit = int(request.GET.get('page_size', 20))

    def _fetch():
        faculty = (
            Faculty.objects
            .filter(organization_id=org_id, is_active=True)
            .only('faculty_id', 'first_name', 'last_name')[:limit]
        )
        return {
            'results': [
                {'faculty_id': str(f.faculty_id), 'name': f"{f.first_name} {f.last_name}"}
                for f in faculty
            ]
        }

    return Response(CacheService.get_or_set(f'faculty_{org_id}_{limit}', _fetch, timeout=600))


@api_view(['GET'])
def fast_departments(request):
    """Ultra-fast departments."""
    org_id = request.GET.get('organization')

    def _fetch():
        depts = (
            Department.objects
            .filter(organization_id=org_id, is_active=True)
            .only('dept_id', 'dept_name')
        )
        return [{'id': str(d.dept_id), 'name': d.dept_name} for d in depts]

    return Response(CacheService.get_or_set(f'depts_{org_id}', _fetch, timeout=600))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fast_courses(request):
    """Ultra-fast courses — 50 max."""
    org_id = request.user.organization_id

    def _fetch():
        courses = (
            Course.objects
            .filter(organization_id=org_id, is_active=True)
            .only('course_id', 'course_name', 'course_code')[:50]
        )
        return [
            {'id': str(c.course_id), 'name': c.course_name, 'code': c.course_code}
            for c in courses
        ]

    return Response(CacheService.get_or_set(f'courses_{org_id}', _fetch, timeout=600))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fast_students(request):
    """Ultra-fast students — 50 max."""
    org_id = request.user.organization_id

    def _fetch():
        students = (
            Student.objects
            .filter(organization_id=org_id, is_active=True)
            .only('student_id', 'first_name', 'last_name')[:50]
        )
        return [
            {'id': str(s.student_id), 'name': f"{s.first_name} {s.last_name}"}
            for s in students
        ]

    return Response(CacheService.get_or_set(f'students_{org_id}', _fetch, timeout=600))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fast_rooms(request):
    """Ultra-fast rooms — 50 max."""
    org_id = request.user.organization_id

    def _fetch():
        rooms = (
            Room.objects
            .filter(organization_id=org_id, is_active=True)
            .only('room_id', 'room_name', 'room_number')[:50]
        )
        return [
            {'id': str(r.room_id), 'name': r.room_name or r.room_number}
            for r in rooms
        ]

    return Response(CacheService.get_or_set(f'rooms_{org_id}', _fetch, timeout=600))
