"""
Timetable Workflow API - Review and Approval System
"""
import logging

from django.core.cache import cache
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import GenerationJob
from core.rbac import (
    CanApproveTimetable,
    CanManageTimetable,
    CanViewTimetable,
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
            # Immutable once completed/failed - cache for 1 hour; otherwise 5 min
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

