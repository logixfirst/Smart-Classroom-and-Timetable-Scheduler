"""
Course ViewSet: Course management with intelligent caching
"""

from rest_framework import filters

from ..mixins import SmartCachedViewSet
from ..models import Course
from ..serializers import CourseSerializer


class CourseViewSet(SmartCachedViewSet):
    """Course ViewSet (courses table)"""
    queryset = (
        Course.objects.select_related("organization", "department")
        .defer("room_features_required", "corequisite_course_ids")
        .order_by("course_code")
    )
    serializer_class = CourseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["course_name", "course_code"]
    ordering_fields = ["course_code", "course_name"]
    cache_timeout = 600


# Alias for backward compatibility
SubjectViewSet = CourseViewSet
