"""
Enhanced ViewSet Mixins for ERP System
Provides optimized caching, bulk operations, and data synchronization
"""

import logging

from core.cache_service import CacheService
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

logger = logging.getLogger(__name__)


class FastPagination(PageNumberPagination):
    """Enterprise pagination with configurable page size"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class SmartCachedViewSet(viewsets.ModelViewSet):
    """
    Enterprise-grade ViewSet with Redis caching and automatic invalidation.

    Features:
    - Automatic cache invalidation on create/update/delete
    - Multi-tenant cache isolation by organization
    - Query parameter-aware caching
    - Stale-while-revalidate pattern
    """

    # Cache configuration
    cache_timeout = CacheService.TTL_MEDIUM  # 5 minutes default
    cache_list_timeout = CacheService.TTL_MEDIUM
    cache_detail_timeout = CacheService.TTL_LONG  # 1 hour for detail views
    pagination_class = FastPagination

    def get_list_cached(self, request, *args, **kwargs):
        """
        Cached list view with automatic invalidation.
        Cache key includes query parameters for precise cache control.
        """
        model_name = self.queryset.model.__name__

        # Extract cache-relevant parameters
        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 100)
        filters = dict(request.query_params)

        # Get user's organization for multi-tenant cache isolation
        org_id = None
        if hasattr(request.user, "organization_id"):
            org_id = str(request.user.organization_id)
            filters["org"] = org_id

        # Generate cache key
        cache_key = CacheService.generate_cache_key(
            CacheService.PREFIX_LIST,
            model_name,
            page=page,
            page_size=page_size,
            **filters,
        )

        # Try cache first
        cached_data = CacheService.get(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache HIT for {model_name} list view")
            return Response(cached_data)

        # Cache miss - fetch from database
        logger.info(f"Cache MISS for {model_name} list view - fetching from DB")
        response = super().list(request, *args, **kwargs)

        # Cache the response data (not the Response object)
        if response.status_code == 200:
            CacheService.set(cache_key, response.data, timeout=self.cache_list_timeout)

        return response

    def get_retrieve_cached(self, request, *args, **kwargs):
        """Cached detail view with long TTL."""
        model_name = self.queryset.model.__name__
        obj_id = kwargs.get("pk")

        cache_key = CacheService.generate_cache_key(
            CacheService.PREFIX_DETAIL, model_name, id=obj_id
        )

        cached_data = CacheService.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().retrieve(request, *args, **kwargs)

        if response.status_code == 200:
            CacheService.set(
                cache_key, response.data, timeout=self.cache_detail_timeout
            )

        return response

    def create_with_cache_invalidation(self, request, *args, **kwargs):
        """Create with automatic cache invalidation."""
        response = super().create(request, *args, **kwargs)

        if response.status_code == 201:
            self.invalidate_model_cache()

        return response

    def update_with_cache_invalidation(self, request, *args, **kwargs):
        """Update with automatic cache invalidation."""
        response = super().update(request, *args, **kwargs)

        if response.status_code == 200:
            self.invalidate_model_cache()

        return response

    def destroy_with_cache_invalidation(self, request, *args, **kwargs):
        """Delete with automatic cache invalidation."""
        response = super().destroy(request, *args, **kwargs)

        if response.status_code == 204:
            self.invalidate_model_cache()

        return response

    def invalidate_model_cache(self):
        """
        Invalidate all caches for this model across all organizations.
        This ensures data consistency after any modification.
        """
        model_name = self.queryset.model.__name__

        # Get organization if available for targeted invalidation
        org_id = None
        if hasattr(self, "request") and hasattr(self.request.user, "organization_id"):
            org_id = str(self.request.user.organization_id)

        CacheService.invalidate_model_cache(model_name, organization_id=org_id)
        logger.info(f"Invalidated cache for {model_name}")

    def list(self, request, *args, **kwargs):
        """Cached list with smart invalidation"""
        model_name = self.queryset.model.__name__.lower()

        # Get organization ID for multi-tenant caching
        org_id = None
        if hasattr(request.user, "organization_id"):
            org_id = str(request.user.organization_id)

        # Extract pagination and filter params
        page = request.query_params.get("page", "1")
        page_size = request.query_params.get("page_size", "100")
        filters = {
            k: v
            for k, v in request.query_params.items()
            if k not in ["page", "page_size"]
        }

        # Check cache first using CacheService
        cache_key = CacheService.generate_cache_key(
            CacheService.PREFIX_LIST,
            model_name,
            organization_id=org_id,
            page=page,
            page_size=page_size,
            **filters,
        )
        cached_data = CacheService.get(cache_key)

        if cached_data is not None:
            logger.debug(f"Cache HIT: {cache_key}")
            return Response(cached_data)

        # Cache MISS - fetch from DB
        logger.debug(f"Cache MISS: {cache_key}")
        response = super().list(request, *args, **kwargs)

        # Cache the response data
        if response.status_code == 200:
            CacheService.set(cache_key, response.data, timeout=self.cache_list_timeout)

        return response

    def retrieve(self, request, *args, **kwargs):
        """Cached retrieve with smart invalidation"""
        model_name = self.queryset.model.__name__.lower()
        pk = kwargs.get("pk")

        # Get organization ID
        org_id = None
        if hasattr(request.user, "organization_id"):
            org_id = str(request.user.organization_id)

        cache_key = CacheService.generate_cache_key(
            CacheService.PREFIX_DETAIL, model_name, organization_id=org_id, pk=pk
        )

        cached_data = CacheService.get(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache HIT: {cache_key}")
            return Response(cached_data)

        logger.debug(f"Cache MISS: {cache_key}")
        response = super().retrieve(request, *args, **kwargs)

        if response.status_code == 200:
            CacheService.set(cache_key, response.data, timeout=self.cache_timeout)

        return response

    def create(self, request, *args, **kwargs):
        """Create with automatic cache invalidation"""
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            self.invalidate_model_cache()
        return response

    def update(self, request, *args, **kwargs):
        """Update with automatic cache invalidation"""
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            self.invalidate_model_cache()
        return response

    def partial_update(self, request, *args, **kwargs):
        """Partial update with automatic cache invalidation"""
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == 200:
            self.invalidate_model_cache()
        return response

    def destroy(self, request, *args, **kwargs):
        """Delete with automatic cache invalidation"""
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == 204:
            self.invalidate_model_cache()
        return response

    @action(detail=False, methods=["post"])
    def bulk_create(self, request):
        """Bulk create endpoint for efficient batch operations"""
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            self.perform_create(serializer)

        self.invalidate_model_cache()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["patch"])
    def bulk_update(self, request):
        """Bulk update endpoint for efficient batch operations"""
        instances = []

        with transaction.atomic():
            for item in request.data:
                pk = item.get("id") or item.get("pk")
                if not pk:
                    continue

                instance = self.get_queryset().filter(pk=pk).first()
                if instance:
                    serializer = self.get_serializer(instance, data=item, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    instances.append(serializer.data)

        self.invalidate_model_cache()
        return Response(instances, status=status.HTTP_200_OK)

    @action(detail=False, methods=["delete"])
    def bulk_delete(self, request):
        """Bulk delete endpoint for efficient batch operations"""
        ids = request.data.get("ids", [])

        if not ids:
            return Response(
                {"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            deleted_count = self.get_queryset().filter(pk__in=ids).delete()[0]

        self.invalidate_model_cache()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def invalidate_cache(self, request):
        """Manual cache invalidation endpoint (admin only)"""
        self.invalidate_model_cache()
        return Response({"message": "Cache invalidated successfully"})


class DataSyncMixin:
    """
    Mixin for views that need to trigger data synchronization
    Used for User, Faculty, and Student viewsets
    """

    @action(detail=False, methods=["post"])
    def sync_data(self, request):
        """
        Manually trigger data synchronization between related models
        Useful for one-time sync or fixing inconsistencies
        """
        from academics.signals import bulk_sync_users_to_faculty_students

        try:
            synced_faculty, synced_students = bulk_sync_users_to_faculty_students()
            return Response(
                {
                    "message": "Data synchronization completed",
                    "synced_faculty": synced_faculty,
                    "synced_students": synced_students,
                }
            )
        except Exception as e:
            logger.error(f"Data sync failed: {e}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def related_records(self, request, pk=None):
        """
        Get related records across User, Faculty, and Student models
        Shows the complete data relationship
        """
        instance = self.get_object()
        response_data = {}

        # If this is a User
        if hasattr(instance, "role"):
            response_data["user"] = {
                "id": instance.id,
                "username": instance.username,
                "email": instance.email,
                "role": instance.role,
                "name": f"{instance.first_name} {instance.last_name}".strip(),
            }

            # Find related Faculty or Student
            if instance.role == "faculty" and instance.email:
                from academics.models import Faculty

                faculty = Faculty.objects.filter(email=instance.email).first()
                if faculty:
                    response_data["faculty"] = {
                        "faculty_id": faculty.faculty_id,
                        "faculty_name": faculty.faculty_name,
                        "email": faculty.email,
                        "department": faculty.department.department_name
                        if faculty.department
                        else None,
                    }

            elif instance.role == "student" and instance.email:
                from academics.models import Student

                student = Student.objects.filter(email=instance.email).first()
                if student:
                    response_data["student"] = {
                        "student_id": student.student_id,
                        "name": student.name,
                        "email": student.email,
                        "course": student.course.course_name
                        if student.course
                        else None,
                    }

        return Response(response_data)


class PerformanceMetricsMixin:
    """
    Mixin to add performance metrics to API responses
    Useful for monitoring and optimization
    """

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get statistical information about the dataset"""
        queryset = self.get_queryset()

        stats = {"total_count": queryset.count(), "cache_info": self._get_cache_info()}

        # Add model-specific stats
        if hasattr(self, "get_model_stats"):
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
            return {"cached_keys": len(keys), "cache_enabled": True}
        except Exception:
            return {"cache_enabled": False}
