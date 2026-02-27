"""
Timetable ViewSets: Timetable and slot management
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response

from ..mixins import SmartCachedViewSet
from ..models import Timetable, TimetableSlot
from ..serializers import TimetableSerializer, TimetableSlotSerializer


class TimetableViewSet(SmartCachedViewSet):
    """Timetable ViewSet — generated data; moderate churn."""
    queryset = (
        Timetable.objects.select_related(
            "department", "batch", "generation_job", "created_by"
        )
        .prefetch_related("slots")
        .all()
    )
    serializer_class = TimetableSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["department", "batch", "semester", "academic_year", "status"]
    # Timetables may be regenerated during the day
    cache_list_timeout   = 180    # 3 min
    cache_detail_timeout = 600    # 10 min

    @action(detail=True, methods=["get"])
    def slots(self, request, pk=None):
        """Timetable slots — cached per timetable-id."""
        from core.cache_service import CacheService
        timetable = self.get_object()
        cache_key = CacheService.generate_cache_key(
            "slots", "timetable", timetable_id=str(timetable.pk)
        )

        def _fetch():
            slot_qs = TimetableSlot.objects.select_related(
                "timetable", "subject", "faculty", "classroom"
            ).filter(timetable=timetable)
            return TimetableSlotSerializer(slot_qs, many=True).data

        data = CacheService.get_or_set(cache_key, _fetch, timeout=300)
        response = Response(data)
        response["X-Cache-Key"] = cache_key
        return response


class TimetableSlotViewSet(SmartCachedViewSet):
    """TimetableSlot ViewSet — slot-level data; highest read frequency."""
    queryset = TimetableSlot.objects.select_related(
        "timetable", "subject", "faculty", "classroom"
    ).all()
    serializer_class = TimetableSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["timetable", "subject", "faculty", "classroom", "day"]
    cache_list_timeout   = 120    # 2 min
    cache_detail_timeout = 300    # 5 min
