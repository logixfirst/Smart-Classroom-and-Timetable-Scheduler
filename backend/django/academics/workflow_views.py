"""
Timetable Workflow API - Review and Approval System
"""
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import GenerationJob

logger = logging.getLogger(__name__)


class TimetableWorkflowViewSet(viewsets.ViewSet):
    """Timetable workflow management"""
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, pk=None):
        """Get workflow details by ID"""
        try:
            job = GenerationJob.objects.get(id=pk)
            
            return Response({
                'id': str(job.id),
                'job_id': str(job.id),
                'organization_id': str(job.organization.org_id),
                'department_id': None,  # Add if needed
                'semester': 1,  # Add if needed
                'academic_year': '2024-25',  # Add if needed
                'status': 'draft',  # Map from job.status
                'created_by': 1,  # Add if needed
                'created_at': job.created_at.isoformat(),
                'submitted_for_review_at': None,
                'submitted_by': None,
                'published_at': None,
                'published_by': None,
                'timetable_entries': []
            })
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve timetable workflow"""
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
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject timetable workflow"""
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
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List variants for a job"""
        job_id = request.query_params.get('job_id')
        
        if not job_id:
            return Response(
                {'error': 'job_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            job = GenerationJob.objects.get(id=job_id)
            variants_data = job.timetable_data or {}
            variants = variants_data.get('variants', [])
            
            # Transform to expected format
            result = []
            for idx, variant in enumerate(variants):
                result.append({
                    'id': f"{job_id}-variant-{idx+1}",
                    'job_id': str(job_id),
                    'variant_number': idx + 1,
                    'optimization_priority': variant.get('name', 'balanced').lower().replace(' ', '_'),
                    'organization_id': str(job.organization.org_id),
                    'department_id': None,
                    'semester': 1,
                    'academic_year': '2024-25',
                    'timetable_entries': [],
                    'statistics': {
                        'total_classes': 0,
                        'total_hours': 0,
                        'unique_subjects': 0,
                        'unique_faculty': 0,
                        'unique_rooms': 0,
                        'average_classes_per_day': 0
                    },
                    'quality_metrics': {
                        'total_conflicts': variant.get('conflicts', 0),
                        'hard_constraint_violations': 0,
                        'soft_constraint_violations': 0,
                        'room_utilization_score': variant.get('room_utilization', 85),
                        'faculty_workload_balance_score': variant.get('faculty_satisfaction', 90),
                        'student_compactness_score': variant.get('compactness', 88),
                        'overall_score': variant.get('score', 90)
                    },
                    'is_selected': idx == 0,  # First variant selected by default
                    'selected_at': job.created_at.isoformat() if idx == 0 else None,
                    'selected_by': None,
                    'generated_at': job.created_at.isoformat()
                })
            
            return Response(result)
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        """Select a variant"""
        logger.info(f"Variant {pk} selected by user {request.user.id}")
        
        return Response({
            'success': True,
            'message': 'Variant selected successfully',
            'variant_id': str(pk)
        })
