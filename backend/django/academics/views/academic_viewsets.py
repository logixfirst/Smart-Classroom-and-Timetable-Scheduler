"""
Academic ViewSets: School, Department, Program, Batch
Hierarchical academic structure management
"""

from rest_framework import filters

from ..mixins import SmartCachedViewSet
from ..models import School, Department, Program, Batch
from ..serializers import (
    SchoolSerializer,
    DepartmentSerializer,
    ProgramSerializer,
    BatchSerializer,
)


class SchoolViewSet(SmartCachedViewSet):
    """School ViewSet"""
    queryset = School.objects.select_related("organization").all().order_by("school_code")
    serializer_class = SchoolSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["school_code", "school_name"]
    ordering_fields = ["school_code", "school_name"]
    cache_timeout = 900


class DepartmentViewSet(SmartCachedViewSet):
    """Department ViewSet"""
    queryset = Department.objects.select_related("organization", "school").order_by("dept_code")
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["dept_code", "dept_name"]
    ordering_fields = ["dept_code", "dept_name"]
    cache_timeout = 600


class ProgramViewSet(SmartCachedViewSet):
    """Program ViewSet"""
    queryset = (
        Program.objects.select_related("organization", "department")
        .order_by("program_code")
    )
    serializer_class = ProgramSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["program_code", "program_name"]
    ordering_fields = ["program_code", "program_name", "duration_years"]
    cache_timeout = 600


class BatchViewSet(SmartCachedViewSet):
    """Batch ViewSet"""
    queryset = (
        Batch.objects.select_related("organization", "program", "department")
        .order_by("batch_code")
    )
    serializer_class = BatchSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["batch_name", "batch_code"]
    ordering_fields = ["batch_code", "year_of_admission"]
    cache_timeout = 600
