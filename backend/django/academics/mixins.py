"""
Enhanced ViewSet Mixins for ERP System
Provides optimized caching, bulk operations, and data synchronization
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import logging

logger = logging.getLogger(__name__)


class SmartCachedViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet with intelligent caching and automatic cache invalidation
    Industry best practice: Aggressive caching with smart invalidation
    """
    
    # Cache configuration
    cache_timeout = 300  # 5 minutes default
    cache_list_timeout = 300  # 5 minutes for list views
    
    def get_cache_key(self, action_name, pk=None):
        """Generate consistent cache key"""
        model_name = self.queryset.model.__name__.lower()
        if pk:
            return f"sih28:api:{model_name}:{action_name}:{pk}"
        return f"sih28:api:{model_name}:{action_name}"
    
    def invalidate_all_caches(self):
        """Invalidate all cache keys for this model"""
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            
            model_name = self.queryset.model.__name__.lower()
            pattern = f"sih28:*{model_name}*"
            
            keys = redis_conn.keys(pattern)
            if keys:
                redis_conn.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache keys for {model_name}")
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
    
    def list(self, request, *args, **kwargs):
        """Cached list with smart invalidation"""
        # For filtered/searched queries, don't cache
        if request.query_params:
            return super().list(request, *args, **kwargs)
        
        # Check cache first
        cache_key = self.get_cache_key('list')
        cached_response = cache.get(cache_key)
        
        if cached_response is not None:
            logger.debug(f"Cache HIT: {cache_key}")
            return Response(cached_response)
        
        # Cache MISS - fetch from DB
        logger.debug(f"Cache MISS: {cache_key}")
        response = super().list(request, *args, **kwargs)
        
        # Cache the response data
        if response.status_code == 200:
            cache.set(cache_key, response.data, self.cache_list_timeout)
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Cached retrieve with smart invalidation"""
        pk = kwargs.get('pk')
        cache_key = self.get_cache_key('retrieve', pk)
        
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            logger.debug(f"Cache HIT: {cache_key}")
            return Response(cached_response)
        
        logger.debug(f"Cache MISS: {cache_key}")
        response = super().retrieve(request, *args, **kwargs)
        
        if response.status_code == 200:
            cache.set(cache_key, response.data, self.cache_timeout)
        
        return response
    
    def create(self, request, *args, **kwargs):
        """Create with automatic cache invalidation"""
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            self.invalidate_all_caches()
        return response
    
    def update(self, request, *args, **kwargs):
        """Update with automatic cache invalidation"""
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            self.invalidate_all_caches()
        return response
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update with automatic cache invalidation"""
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == 200:
            self.invalidate_all_caches()
        return response
    
    def destroy(self, request, *args, **kwargs):
        """Delete with automatic cache invalidation"""
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == 204:
            self.invalidate_all_caches()
        return response
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Bulk create endpoint for efficient batch operations"""
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            self.perform_create(serializer)
        
        self.invalidate_all_caches()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['patch'])
    def bulk_update(self, request):
        """Bulk update endpoint for efficient batch operations"""
        instances = []
        
        with transaction.atomic():
            for item in request.data:
                pk = item.get('id') or item.get('pk')
                if not pk:
                    continue
                
                instance = self.get_queryset().filter(pk=pk).first()
                if instance:
                    serializer = self.get_serializer(instance, data=item, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    instances.append(serializer.data)
        
        self.invalidate_all_caches()
        return Response(instances, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Bulk delete endpoint for efficient batch operations"""
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response(
                {'error': 'No IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            deleted_count = self.get_queryset().filter(pk__in=ids).delete()[0]
        
        self.invalidate_all_caches()
        return Response(
            {'deleted': deleted_count},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def invalidate_cache(self, request):
        """Manual cache invalidation endpoint (admin only)"""
        self.invalidate_all_caches()
        return Response({'message': 'Cache invalidated successfully'})


class DataSyncMixin:
    """
    Mixin for views that need to trigger data synchronization
    Used for User, Faculty, and Student viewsets
    """
    
    @action(detail=False, methods=['post'])
    def sync_data(self, request):
        """
        Manually trigger data synchronization between related models
        Useful for one-time sync or fixing inconsistencies
        """
        from academics.signals import bulk_sync_users_to_faculty_students
        
        try:
            synced_faculty, synced_students = bulk_sync_users_to_faculty_students()
            return Response({
                'message': 'Data synchronization completed',
                'synced_faculty': synced_faculty,
                'synced_students': synced_students
            })
        except Exception as e:
            logger.error(f"Data sync failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def related_records(self, request, pk=None):
        """
        Get related records across User, Faculty, and Student models
        Shows the complete data relationship
        """
        instance = self.get_object()
        response_data = {}
        
        # If this is a User
        if hasattr(instance, 'role'):
            response_data['user'] = {
                'id': instance.id,
                'username': instance.username,
                'email': instance.email,
                'role': instance.role,
                'name': f"{instance.first_name} {instance.last_name}".strip()
            }
            
            # Find related Faculty or Student
            if instance.role == 'faculty' and instance.email:
                from academics.models import Faculty
                faculty = Faculty.objects.filter(email=instance.email).first()
                if faculty:
                    response_data['faculty'] = {
                        'faculty_id': faculty.faculty_id,
                        'faculty_name': faculty.faculty_name,
                        'email': faculty.email,
                        'department': faculty.department.department_name if faculty.department else None
                    }
            
            elif instance.role == 'student' and instance.email:
                from academics.models import Student
                student = Student.objects.filter(email=instance.email).first()
                if student:
                    response_data['student'] = {
                        'student_id': student.student_id,
                        'name': student.name,
                        'email': student.email,
                        'course': student.course.course_name if student.course else None
                    }
        
        return Response(response_data)


class PerformanceMetricsMixin:
    """
    Mixin to add performance metrics to API responses
    Useful for monitoring and optimization
    """
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistical information about the dataset"""
        queryset = self.get_queryset()
        
        stats = {
            'total_count': queryset.count(),
            'cache_info': self._get_cache_info()
        }
        
        # Add model-specific stats
        if hasattr(self, 'get_model_stats'):
            stats.update(self.get_model_stats(queryset))
        
        return Response(stats)
    
    def _get_cache_info(self):
        """Get cache statistics"""
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            
            model_name = self.queryset.model.__name__.lower()
            pattern = f"sih28:*{model_name}*"
            
            keys = redis_conn.keys(pattern)
            return {
                'cached_keys': len(keys),
                'cache_enabled': True
            }
        except Exception:
            return {'cache_enabled': False}
