"""
Conflict Detection API Views
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache

from ..models import GenerationJob
from ..services.conflict_service import ConflictDetectionService
from core.rbac import CanViewTimetable


class ConflictViewSet(viewsets.ViewSet):
    """Conflict detection and management"""
    permission_classes = [IsAuthenticated, CanViewTimetable]
    
    @action(detail=False, methods=['get'])
    def detect(self, request):
        """Detect conflicts in timetable"""
        job_id = request.query_params.get('job_id')
        variant_id = request.query_params.get('variant_id', 0)
        
        if not job_id:
            return Response({'error': 'job_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        cache_key = f'conflicts_{job_id}_{variant_id}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        
        try:
            job = GenerationJob.objects.get(id=job_id)
            variants = (job.timetable_data or {}).get('variants', [])
            
            if not variants or int(variant_id) >= len(variants):
                return Response({'error': 'Variant not found'}, status=status.HTTP_404_NOT_FOUND)
            
            variant = variants[int(variant_id)]
            entries = variant.get('timetable_entries', [])
            
            # Detect conflicts
            conflicts = ConflictDetectionService.detect_conflicts(entries)
            categorized = ConflictDetectionService.categorize_conflicts(conflicts)
            
            result = {
                'job_id': str(job_id),
                'variant_id': int(variant_id),
                'conflicts': conflicts[:100],  # Limit to 100
                'summary': categorized,
                'total_entries': len(entries)
            }
            
            cache.set(cache_key, result, 600)  # 10 min
            return Response(result)
            
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get conflict summary"""
        job_id = request.query_params.get('job_id')
        
        if not job_id:
            return Response({'error': 'job_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        cache_key = f'conflict_summary_{job_id}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        
        try:
            job = GenerationJob.objects.get(id=job_id)
            variants = (job.timetable_data or {}).get('variants', [])
            
            summaries = []
            for idx, variant in enumerate(variants):
                entries = variant.get('timetable_entries', [])
                conflicts = ConflictDetectionService.detect_conflicts(entries)
                categorized = ConflictDetectionService.categorize_conflicts(conflicts)
                
                summaries.append({
                    'variant_id': idx,
                    'total_conflicts': categorized['total'],
                    'critical': categorized['critical'],
                    'high': categorized['high'],
                    'medium': categorized['medium'],
                    'low': categorized['low']
                })
            
            result = {'job_id': str(job_id), 'variants': summaries}
            cache.set(cache_key, result, 600)
            return Response(result)
            
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def suggest(self, request):
        """Get resolution suggestions for conflict"""
        conflict = request.data.get('conflict')
        
        if not conflict:
            return Response({'error': 'conflict data required'}, status=status.HTTP_400_BAD_REQUEST)
        
        suggestions = ConflictDetectionService.get_resolution_suggestions(conflict)
        
        return Response({
            'conflict': conflict,
            'suggestions': suggestions
        })
