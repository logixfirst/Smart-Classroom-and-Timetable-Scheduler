"""
User ViewSet: User management with data sync and caching
"""

from rest_framework import filters

from ..mixins import DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet
from ..models import User
from ..serializers import UserSerializer


class UserViewSet(DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet):
    """Enhanced User ViewSet with automatic sync to Faculty/Student"""
    
    queryset = User.objects.select_related("organization").order_by("username")
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "email", "role", "created_at"]
    cache_timeout = 300
