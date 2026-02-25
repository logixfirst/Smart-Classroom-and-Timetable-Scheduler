"""
Timetable Workflow API - Review and Approval System
"""
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.core.cache import cache

from .models import GenerationJob
from core.rbac import (
    CanViewTimetable,
    CanManageTimetable,
    CanApproveTimetable,
    DepartmentAccessPermission,
    has_department_access
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
            return Response(cached)
        
        try:
            job = GenerationJob.objects.only('id', 'organization_id', 'created_at', 'status').get(id=pk)
            
            data = {
                'id': str(job.id),
                'job_id': str(job.id),
                'organization_id': str(job.organization_id),
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'timetable_entries': []  # Don't load entries here
            }
            cache.set(cache_key, data, 300)  # 5 min cache
            return Response(data)
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
        """FAST conversion - minimal processing"""
        day_map = {'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6}
        
        # Convert all entries without deduplication
        result = []
        for e in entries:
            day = day_map.get(e.get('day', 'Monday'), 0)
            result.append({
                'day': day,
                'time_slot': e.get('time_slot', ''),
                'subject_code': e.get('subject_code', ''),
                'subject_name': e.get('subject_name', ''),
                'faculty_name': e.get('faculty_name', ''),
                'room_number': e.get('room_number', ''),
                'batch_name': e.get('batch_name', ''),
                'department_id': e.get('department_id', '')
            })
        
        return result
    
    def list(self, request):
        """List variants - ULTRA FAST (no entries processing)"""
        job_id = request.query_params.get('job_id')
        if not job_id:
            return Response({'error': 'job_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        cache_key = f'variants_list_{job_id}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        
        try:
            job = GenerationJob.objects.only('id', 'organization_id', 'created_at', 'timetable_data').get(id=job_id)
            variants = (job.timetable_data or {}).get('variants', [])
            
            result = []
            for idx, v in enumerate(variants):
                # Support both old format (fitness only) and new format (enriched)
                # New format has 'score' (0-100 %), 'conflicts', 'room_utilization',
                # 'quality_metrics', 'statistics' — all computed by FastAPI.
                qm  = v.get('quality_metrics', {})
                sta = v.get('statistics', {})

                # Scores — prefer pre-computed blocks, fall back to top-level fields
                overall_score  = qm.get('overall_score',          v.get('score',            0))
                total_conflicts = qm.get('total_conflicts',        v.get('conflicts',         0))
                room_util      = qm.get('room_utilization_score',  v.get('room_utilization',  0))
                total_classes  = sta.get('total_classes',          len(v.get('timetable_entries', [])))

                result.append({
                    'id':              f"{job_id}-variant-{idx+1}",
                    'job_id':          str(job_id),
                    'variant_number':  idx + 1,
                    'organization_id': str(job.organization_id),
                    'timetable_entries': [],  # Empty - load on demand via /entries/
                    'statistics': {
                        'total_classes':   total_classes,
                        'total_conflicts': total_conflicts,
                    },
                    'quality_metrics': {
                        'overall_score':           overall_score,
                        'total_conflicts':         total_conflicts,
                        'room_utilization_score':  room_util,
                    },
                    'generated_at': job.created_at.isoformat(),
                })
            
            cache.set(cache_key, result, 300)  # 5 min
            return Response(result)
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def entries(self, request, pk=None):
        """Load entries on demand - separate endpoint"""
        job_id = request.query_params.get('job_id')
        if not job_id:
            return Response({'error': 'job_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        cache_key = f'variant_entries_{pk}'
        cached = cache.get(cache_key)
        if cached:
            return Response({'timetable_entries': cached})
        
        try:
            job = GenerationJob.objects.only('timetable_data').get(id=job_id)
            variants = (job.timetable_data or {}).get('variants', [])
            
            # Find variant
            for idx, v in enumerate(variants):
                if f"{job_id}-variant-{idx+1}" == pk:
                    entries = self._convert_timetable_entries(v.get('timetable_entries', [])[:500])  # Limit to 500
                    cache.set(cache_key, entries, 600)  # 10 min
                    return Response({'timetable_entries': entries})
            
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        """Select a variant"""
        return Response({'success': True, 'variant_id': str(pk)})
