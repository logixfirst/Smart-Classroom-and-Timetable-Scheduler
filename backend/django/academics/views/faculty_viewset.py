"""
Faculty ViewSet: Faculty management with data sync and performance metrics
"""

from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from ..mixins import DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet
from ..models import Faculty, TimetableSlot
from ..serializers import FacultySerializer, TimetableSlotSerializer


class FacultyViewSet(DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet):
    """Enhanced Faculty ViewSet with automatic sync to User."""
    
    queryset = (
        Faculty.objects.select_related("department", "organization")
        .order_by("faculty_code")
    )
    serializer_class = FacultySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["faculty_name", "faculty_code", "email", "specialization"]
    ordering_fields = ["faculty_code", "faculty_name"]
    # Faculty workload / designation can change each semester
    cache_list_timeout   = 300     # 5 min
    cache_detail_timeout = 1_800   # 30 min

    @action(detail=True, methods=["get"])
    def timetable(self, request, pk=None):
        """Faculty timetable \u2014 cached per faculty-id."""
        from core.cache_service import CacheService
        faculty = self.get_object()
        cache_key = CacheService.generate_cache_key(
            "timetable", "faculty", faculty_id=str(faculty.pk)
        )

        def _fetch():
            slots = TimetableSlot.objects.filter(faculty=faculty) if hasattr(TimetableSlot, "faculty") else []
            return TimetableSlotSerializer(slots, many=True).data

        data = CacheService.get_or_set(cache_key, _fetch, timeout=300)  # 5 min
        response = Response(data)
        response["X-Cache-Key"] = cache_key
        return response

    def get_model_stats(self, queryset):
        """Additional stats for Faculty model"""
        from django.db.models import Avg

        return {
            "by_department": {
                dept: queryset.filter(department__department_id=dept).count()
                for dept in queryset.values_list(
                    "department__department_id", flat=True
                ).distinct()
            },
            "avg_workload": queryset.aggregate(Avg("max_workload_per_week"))[
                "max_workload_per_week__avg"
            ],
        }
