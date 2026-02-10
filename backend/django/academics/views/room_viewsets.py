"""
Room and Building ViewSets: Infrastructure management
"""

from rest_framework import filters

from ..mixins import SmartCachedViewSet
from ..models import Room, Building
from ..serializers import RoomSerializer, BuildingSerializer


class RoomViewSet(SmartCachedViewSet):
    """Room ViewSet (rooms table)"""
    queryset = (
        Room.objects.select_related("organization", "building", "department")
        .defer("features", "specialized_software")
        .order_by("room_code")
    )
    serializer_class = RoomSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["room_code", "room_name", "room_number"]
    ordering_fields = ["room_code", "seating_capacity"]
    cache_timeout = 900


# Alias for backward compatibility
ClassroomViewSet = RoomViewSet


class LabViewSet(SmartCachedViewSet):
    """Lab ViewSet - filters Rooms that are laboratories"""
    queryset = Room.objects.filter(room_type="laboratory").select_related("organization", "building", "department").all().order_by("room_code")
    serializer_class = RoomSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["room_code", "room_name", "room_number"]
    ordering_fields = ["room_code", "seating_capacity"]
    cache_timeout = 900


class BuildingViewSet(SmartCachedViewSet):
    """Building ViewSet"""
    queryset = (
        Building.objects.select_related("organization")
        .order_by("building_code")
    )
    serializer_class = BuildingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["building_code", "building_name"]
    ordering_fields = ["building_code", "building_name"]
    cache_timeout = 900
