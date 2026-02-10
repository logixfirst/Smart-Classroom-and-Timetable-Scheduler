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
    cache_timeout = 300

    @action(detail=True, methods=["get"])
    def slots(self, request, pk=None):
        timetable = self.get_object()
        slots = TimetableSlot.objects.filter(timetable=timetable)
        serializer = TimetableSlotSerializer(slots, many=True)
        return Response(serializer.data)


class TimetableSlotViewSet(SmartCachedViewSet):
    queryset = TimetableSlot.objects.select_related(
        "timetable", "subject", "faculty", "classroom"
    ).all()
    serializer_class = TimetableSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["timetable", "subject", "faculty", "classroom", "day"]
    cache_timeout = 300
