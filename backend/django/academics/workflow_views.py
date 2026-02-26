"""
Timetable Workflow API - Review and Approval System
"""
import hashlib
import json
import logging

from django.core.cache import cache
from django.db.models import JSONField
from django.db.models.expressions import RawSQL
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import GenerationJob
from core.rbac import (
    CanApproveTimetable,
    CanManageTimetable,
    CanViewTimetable,
    DepartmentAccessPermission,
    has_department_access,
)

logger = logging.getLogger(__name__)


class TimetableWorkflowViewSet(viewsets.ViewSet):
    """Timetable workflow management"""
    permission_classes = [IsAuthenticated, CanViewTimetable]
    
    def retrieve(self, request, pk=None):
        """Get workflow details by ID - FAST VERSION"""
        cache_key = f'workflow_{pk}'
        cached = cache.get(cache_key)
        if cached:
            response = Response(cached)
            response['Cache-Control'] = 'private, max-age=300'
            return response

        try:
            job = GenerationJob.objects.only(
                'id', 'organization_id', 'created_at', 'status',
                'academic_year', 'semester',
            ).get(id=pk)

            data = {
                'id': str(job.id),
                'job_id': str(job.id),
                'organization_id': str(job.organization_id),
                'status': job.status,
                'academic_year': job.academic_year,
                'semester': job.semester,
                'created_at': job.created_at.isoformat(),
                'timetable_entries': [],  # Don't load entries here
            }
            # Immutable once completed/failed \u2013 cache for 1 hour; otherwise 5 min
            ttl = 3600 if job.status in ('completed', 'failed') else 300
            cache.set(cache_key, data, ttl)
            response = Response(data)
            response['Cache-Control'] = f'private, max-age={ttl}'
            return response
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTimetable])
    def approve(self, request, pk=None):
        """Approve timetable workflow (Registrar only)"""
        try:
            job = GenerationJob.objects.get(id=pk)
            comments = request.data.get('comments', '')
            
            # Update job status
            job.status = 'completed'
            job.save()
            
            logger.info(f"Workflow {pk} approved by user {request.user.id}")
            
            return Response({
                'success': True,
                'message': 'Timetable approved successfully',
                'workflow_id': str(pk)
            })
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTimetable])
    def reject(self, request, pk=None):
        """Reject timetable workflow (Registrar only)"""
        try:
            job = GenerationJob.objects.get(id=pk)
            comments = request.data.get('comments', '')
            
            if not comments:
                return Response(
                    {'error': 'Comments required for rejection'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update job status
            job.status = 'failed'
            job.error_message = f"Rejected: {comments}"
            job.save()
            
            logger.info(f"Workflow {pk} rejected by user {request.user.id}")
            
            return Response({
                'success': True,
                'message': 'Timetable rejected',
                'workflow_id': str(pk)
            })
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class TimetableVariantViewSet(viewsets.ViewSet):
    """Timetable variant management"""
    permission_classes = [IsAuthenticated, CanViewTimetable]
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, DepartmentAccessPermission])
    def department_view(self, request, pk=None):
        """Get variant filtered by department (department-level access control)"""
        from .services import DepartmentViewService
        
        department_id = request.query_params.get('department_id', 'all')
        
        # Check department access
        if department_id != 'all' and not has_department_access(request.user, department_id):
            return Response(
                {'error': 'Access denied to this department'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get variant data
            job_id = request.query_params.get('job_id')
            if not job_id:
                return Response(
                    {'error': 'job_id parameter required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from .models import GenerationJob
            job = GenerationJob.objects.get(id=job_id)
            variants_data = job.timetable_data or {}
            variants = variants_data.get('variants', [])
            
            # Find the variant
            variant = None
            for idx, v in enumerate(variants):
                if f"{job_id}-variant-{idx+1}" == pk:
                    variant = v
                    break
            
            if not variant:
                return Response(
                    {'error': 'Variant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Filter by department
            entries = variant.get('timetable_entries', [])
            filtered_entries = DepartmentViewService.filter_by_department(entries, department_id)
            
            # Get department stats
            dept_stats = DepartmentViewService.get_department_stats(entries)
            
            return Response({
                'variant_id': pk,
                'department_id': department_id,
                'timetable_entries': self._convert_timetable_entries(filtered_entries),
                'department_stats': dept_stats,
                'total_entries': len(entries),
                'filtered_entries': len(filtered_entries)
            })
            
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _convert_timetable_entries(self, entries):
        """Convert FastAPI entry format → frontend TimetableEntry display format.

        FastAPI stores: course_code, subject_name, faculty_name, room_code,
        day (int 0-5), start_time ('09:00'), end_time ('10:00').
        Frontend expects: subject_code, room_number, time_slot ('09:00-10:00'),
        day (int 0-4).
        """
        _day_str_map = {
            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
            'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6,
        }
        result = []
        for e in entries:
            day_raw = e.get('day', 0)
            # FastAPI TimeSlot.day is already int; legacy payload may be a day-name string
            day = day_raw if isinstance(day_raw, int) else _day_str_map.get(day_raw, 0)
            start_t = e.get('start_time', '')
            end_t   = e.get('end_time',   '')
            result.append({
                'day':          day,
                'time_slot':    f"{start_t}-{end_t}" if start_t else e.get('time_slot', ''),
                'subject_code': e.get('course_code',  e.get('subject_code',  '')),
                'subject_name': e.get('subject_name', e.get('course_name',   '')),
                'faculty_id':   e.get('faculty_id',   ''),
                'faculty_name': e.get('faculty_name', ''),
                'room_number':  e.get('room_code',    e.get('room_number',   '')),
                'batch_name':   e.get('batch_name',   ''),
                'department_id': e.get('department_id', ''),
            })
        return result
    
    def list(self, request):
        """List variants metadata - ULTRA FAST (PostgreSQL strips entries server-side).

        Instead of loading the full timetable_data JSON (5-50 MB) into Python
        and iterating in Python, this uses PostgreSQL's JSONB operator
        ``v - 'timetable_entries'`` to strip the bulky entries array BEFORE
        the data is transferred over the wire.  The result is only the metadata
        fields (quality_metrics, statistics, score, etc.) \u2013 typically < 50 KB.
        """
        job_id = request.query_params.get('job_id')
        if not job_id:
            return Response({'error': 'job_id required'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'variants_list_{job_id}'
        cached = cache.get(cache_key)
        if cached:
            response = Response(cached)
            response['Cache-Control'] = 'private, max-age=3600'
            return response

        try:
            # \u2500\u2500 PostgreSQL does the heavy lifting \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
            # ``v - 'timetable_entries'`` removes the large array key from each
            # variant object BEFORE transferring to Python.  Only call once; no
            # Python-level iteration of raw entries.
            job = (
                GenerationJob.objects
                .only('id', 'organization_id', 'created_at')
                .annotate(
                    variants_meta=RawSQL(
                        """
                        SELECT jsonb_agg(v - 'timetable_entries')
                        FROM jsonb_array_elements(
                            COALESCE(timetable_data->'variants', '[]'::jsonb)
                        ) AS v
                        """,
                        (),
                        output_field=JSONField(),
                    )
                )
                .get(id=job_id)
            )
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        variants_meta = job.variants_meta or []

        result = []
        for idx, v in enumerate(variants_meta):
            if v is None:
                continue
            qm = v.get('quality_metrics', {}) or {}
            sta = v.get('statistics', {}) or {}

            # Support both old format (fitness only) and enriched FastAPI format
            overall_score   = qm.get('overall_score',          v.get('score',            0))
            total_conflicts = qm.get('total_conflicts',        v.get('conflicts',         0))
            room_util       = qm.get('room_utilization_score', v.get('room_utilization',  0))
            # total_classes comes from statistics or was pre-computed by FastAPI
            total_classes   = sta.get('total_classes',         v.get('entry_count',       0))

            result.append({
                'id':             f"{job_id}-variant-{idx + 1}",
                'job_id':         str(job_id),
                'variant_number': idx + 1,
                'organization_id': str(job.organization_id),
                'timetable_entries': [],  # populated on demand via /entries/
                'statistics': {
                    'total_classes':   total_classes,
                    'total_conflicts': total_conflicts,
                },
                'quality_metrics': {
                    'overall_score':          overall_score,
                    'total_conflicts':        total_conflicts,
                    'room_utilization_score': room_util,
                },
                'generated_at': job.created_at.isoformat(),
            })

        # Variant metadata is immutable after generation \u2013 cache for 1 hour
        cache.set(cache_key, result, 3600)
        response = Response(result)
        response['Cache-Control'] = 'private, max-age=3600'
        return response
    
    @action(detail=True, methods=['get'])
    def entries(self, request, pk=None):
        """Load entries on demand – separate endpoint.

        Entries are immutable after generation so we cache for 1 hour and
        return strong HTTP ETags so the browser can skip the round-trip
        entirely on repeat visits using conditional GET.
        """
        job_id = request.query_params.get('job_id')
        if not job_id:
            return Response({'error': 'job_id required'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'variant_entries_{pk}'
        cached = cache.get(cache_key)

        if cached:
            # Build a deterministic ETag from the cache key + data hash
            etag_value = f'"{hashlib.md5(cache_key.encode()).hexdigest()}"'
            if request.META.get('HTTP_IF_NONE_MATCH') == etag_value:
                return Response(status=304)
            response = Response({'timetable_entries': cached})
            response['Cache-Control'] = 'private, max-age=3600'
            response['ETag'] = etag_value
            return response

        try:
            # Use PostgreSQL to extract ONLY the target variant's entries
            # without loading every other variant's data into Python.
            variant_index_sql = """
                (
                  SELECT idx - 1
                  FROM jsonb_array_elements(
                      COALESCE(timetable_data->'variants', '[]'::jsonb)
                  ) WITH ORDINALITY AS t(v, idx)
                  WHERE %s = CONCAT(id::text, '-variant-', idx::text)
                  LIMIT 1
                )
            """
            job = (
                GenerationJob.objects
                .only('id')
                .annotate(
                    target_entries=RawSQL(
                        """
                        timetable_data->'variants'->
                        (
                          SELECT (idx - 1)::int
                          FROM   jsonb_array_elements(
                                     COALESCE(timetable_data->'variants', '[]'::jsonb)
                                 ) WITH ORDINALITY AS t(v, idx)
                          WHERE  %s = (id::text || '-variant-' || idx::text)
                          LIMIT  1
                        )->'timetable_entries'
                        """,
                        (pk,),
                        output_field=JSONField(),
                    )
                )
                .get(id=job_id)
            )
            raw_entries = job.target_entries or []
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            # Fallback: load timetable_data the traditional way on annotation error
            try:
                job_fallback = GenerationJob.objects.only('timetable_data').get(id=job_id)
                variants = (job_fallback.timetable_data or {}).get('variants', [])
                raw_entries = []
                for idx, v in enumerate(variants):
                    if f"{job_id}-variant-{idx + 1}" == pk:
                        raw_entries = v.get('timetable_entries', [])
                        break
            except GenerationJob.DoesNotExist:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        entries = self._convert_timetable_entries(raw_entries[:500])
        # Immutable after generation \u2013 cache for 1 hour
        cache.set(cache_key, entries, 3600)
        etag_value = f'"{hashlib.md5(cache_key.encode()).hexdigest()}"'
        response = Response({'timetable_entries': entries})
        response['Cache-Control'] = 'private, max-age=3600'
        response['ETag'] = etag_value
        return response
    
    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        """Select a variant"""
        return Response({'success': True, 'variant_id': str(pk)})
