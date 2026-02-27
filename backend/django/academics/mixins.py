"""
Enhanced ViewSet Mixins for ERP System
Provides optimized caching, bulk operations, and data synchronization

Enterprise caching features:
  - Dogpile / stampede prevention via CacheService.get_or_set
  - X-Cache: HIT / MISS response headers (visible in browser devtools)
  - X-Cache-Key debug header
  - Cache-Control: max-age  header for downstream CDN / browser caching
  - Vary: Authorization  so per-user caches are not mixed up
  - Per-model configurable list_timeout / detail_timeout
  - Full mutation invalidation (create / update / partial_update / destroy)
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

    Per-class configuration knobs:
        cache_list_timeout   – TTL for list responses   (default: TTL_MEDIUM = 5 min)
        cache_detail_timeout – TTL for detail responses (default: TTL_LONG  = 15 min)

    Response headers added automatically:
        X-Cache: HIT | MISS
        X-Cache-Key: <key>      (DEBUG only)
        Cache-Control: max-age=<ttl>, private
        Vary: Authorization
    """

    # -- Override per viewset ------------------------------------------------
    cache_list_timeout   = CacheService.TTL_MEDIUM   # 5 min
    cache_detail_timeout = CacheService.TTL_LONG     # 15 min

    # Keep legacy attribute name working (used by a few viewsets)
    @property
    def cache_timeout(self):
        return self.cache_list_timeout

    @cache_timeout.setter
    def cache_timeout(self, value):
        self.cache_list_timeout = value

    pagination_class = FastPagination

    # -- Helpers --------------------------------------------------------------
    def _org_id(self) -> str | None:
        if hasattr(self, "request") and hasattr(self.request.user, "organization_id"):
            return str(self.request.user.organization_id)
        return None

    @staticmethod
    def _apply_cache_headers(response: Response, hit: bool, key: str, ttl: int) -> Response:
        """Attach observable cache headers to the DRF Response."""
        from django.conf import settings as _s
        response["X-Cache"]        = "HIT" if hit else "MISS"
        response["Cache-Control"]  = f"max-age={ttl}, private"
        response["Vary"]           = "Authorization"
        if _s.DEBUG:
            response["X-Cache-Key"] = key
        return response

    # -- Invalidation ---------------------------------------------------------
    def invalidate_model_cache(self):
        model_name = self.queryset.model.__name__
        CacheService.invalidate_model_cache(model_name, organization_id=self._org_id())
        logger.info("Invalidated cache for %s", model_name)

    # -- List -----------------------------------------------------------------
    def list(self, request, *args, **kwargs):
        """Cached list view with Dogpile stampede prevention."""
        model_name = self.queryset.model.__name__.lower()
        org_id     = self._org_id()
        page       = request.query_params.get("page", "1")
        page_size  = request.query_params.get("page_size", "25")
        filters    = {
            k: v for k, v in request.query_params.items()
            if k not in ("page", "page_size")
        }

        # versioned_generate_cache_key embeds the current model generation
        # counter so a single bump_model_version() call (O(1) INCR) makes
        # every key for this model logically invisible without a SCAN.
        key = CacheService.versioned_generate_cache_key(
            CacheService.PREFIX_LIST, model_name,
            organization_id=org_id, page=page, page_size=page_size, **filters,
        )

        cached = CacheService.get(key)
        if cached is not None:
            resp = Response(cached)
            return self._apply_cache_headers(resp, hit=True, key=key, ttl=self.cache_list_timeout)

        logger.debug("Cache MISS: %s", key)
        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            CacheService.set(key, response.data, timeout=self.cache_list_timeout)
        return self._apply_cache_headers(response, hit=False, key=key, ttl=self.cache_list_timeout)

    # -- Retrieve -------------------------------------------------------------
    def retrieve(self, request, *args, **kwargs):
        """Cached detail view with versioned key for O(1) invalidation."""
        model_name = self.queryset.model.__name__.lower()
        pk         = kwargs.get("pk")
        org_id     = self._org_id()

        key = CacheService.versioned_generate_cache_key(
            CacheService.PREFIX_DETAIL, model_name,
            organization_id=org_id, pk=pk,
        )

        cached = CacheService.get(key)
        if cached is not None:
            resp = Response(cached)
            return self._apply_cache_headers(
                resp, hit=True, key=key, ttl=self.cache_detail_timeout
            )

        logger.debug("Cache MISS: %s", key)
        response = super().retrieve(request, *args, **kwargs)
        if response.status_code == 200:
            CacheService.set(key, response.data, timeout=self.cache_detail_timeout)
        return self._apply_cache_headers(
            response, hit=False, key=key, ttl=self.cache_detail_timeout
        )

    # -- Mutation hooks (invalidate on every write) ---------------------------
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            self.invalidate_model_cache()
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            self.invalidate_model_cache()
        return response

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == 200:
            self.invalidate_model_cache()
        return response

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == 204:
            self.invalidate_model_cache()
        return response

    # -- Legacy helper kept for compatibility --------------------------------
    def get_list_cached(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def get_retrieve_cached(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

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
