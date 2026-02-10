"""
Student ViewSet: Student management with data sync and performance metrics
"""

from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from ..mixins import DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet
from ..models import Student
from ..serializers import StudentSerializer


class StudentViewSet(DataSyncMixin, PerformanceMetricsMixin, SmartCachedViewSet):
    """Enhanced Student ViewSet with automatic sync to User"""
    
    queryset = Student.objects.all().order_by("roll_number")
    serializer_class = StudentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["first_name", "last_name", "roll_number", "email"]
    ordering_fields = [
        "roll_number",
        "first_name",
        "current_year",
        "current_semester",
    ]

    def get_queryset(self):
        """Optimized queryset to prevent N+1 queries"""
        return (
            Student.objects.select_related(
                "department", "program", "organization"
            )
            .order_by("roll_number")
        )

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        """Legacy endpoint - attendance system removed"""
        student = self.get_object()
        return Response([])

    def get_model_stats(self, queryset):
        """Additional stats for Student model"""
        return {
            "by_year": {
                year: queryset.filter(current_year=year).count() for year in range(1, 5)
            },
            "by_semester": {
                sem: queryset.filter(current_semester=sem).count() for sem in range(1, 9)
            },
            "by_program": {
                program: queryset.filter(program__program_id=program).count()
                for program in queryset.values_list(
                    "program__program_id", flat=True
                ).distinct()
            },
        }
