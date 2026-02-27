"""
Timetable Configuration API Views

Caching:
  - list queryset   : org-scoped, 10 min
  - last_used       : org-scoped, 10 min
  Invalidated automatically on create / update / delete via CacheService.
"""
from core.cache_service import CacheService
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import TimetableConfiguration
from ..timetable_config_serializers import TimetableConfigurationSerializer

_CONFIG_TTL = 600   # 10 minutes


class TimetableConfigurationViewSet(viewsets.ModelViewSet):
    """
    API for timetable configuration CRUD

    GET /api/timetable-configs/           - List all configs (cached)
    GET /api/timetable-configs/last-used/ - Get last used config (cached)
    POST /api/timetable-configs/          - Create or update config (invalidates cache)
    PUT /api/timetable-configs/{id}/      - Update config (invalidates cache)
    DELETE /api/timetable-configs/{id}/   - Delete config (invalidates cache)
    """

    serializer_class   = TimetableConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def _org_cache_key(self, suffix: str = "list") -> str:
        org_id = str(getattr(self.request.user, "organization_id", "global"))
        return CacheService.generate_cache_key("config", "timetable", org_id=org_id, view=suffix)

    def _invalidate(self):
        org_id = str(getattr(self.request.user, "organization_id", "global"))
        CacheService.invalidate_model_cache("timetableconfiguration", organization_id=org_id)

    def get_queryset(self):
        """Filter by organization"""
        if hasattr(self.request.user, "organization"):
            return TimetableConfiguration.objects.filter(
                organization=self.request.user.organization
            )
        return TimetableConfiguration.objects.none()

    def list(self, request, *args, **kwargs):
        """Cached config list — org-scoped 10 min."""
        key = self._org_cache_key("list")
        cached = CacheService.get(key)
        if cached is not None:
            resp = Response(cached)
            resp["X-Cache"] = "HIT"
            return resp
        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            CacheService.set(key, response.data, timeout=_CONFIG_TTL)
        response["X-Cache"] = "MISS"
        return response

    def create(self, request, *args, **kwargs):
        """
        Create or update configuration.
        If config exists for same org + academic_year + semester, update it.
        Otherwise create new.  Invalidates cache on success.
        """
        if not hasattr(request.user, "organization") or not request.user.organization:
            return Response(
                {"error": "User organization not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization  = request.user.organization
        academic_year = request.data.get("academic_year")
        semester      = request.data.get("semester")

        if not academic_year or not semester:
            return Response(
                {"error": "academic_year and semester are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_config = TimetableConfiguration.objects.filter(
            organization=organization,
            academic_year=academic_year,
            semester=semester,
        ).first()

        if existing_config:
            serializer = self.get_serializer(existing_config, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            config     = serializer.save()
            self._invalidate()
            return Response(
                {
                    "success": True,
                    "message": "Configuration updated successfully",
                    "config":  self.get_serializer(config).data,
                    "action":  "updated",
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = serializer.save(organization=organization)
        self._invalidate()
        return Response(
            {
                "success": True,
                "message": "Configuration created successfully",
                "config":  self.get_serializer(config).data,
                "action":  "created",
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code in (200, 204):
            self._invalidate()
        return response

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == 204:
            self._invalidate()
        return response

    @action(detail=False, methods=["get"])
    def last_used(self, request):
        """Get the last used configuration — org-scoped Redis cache 10 min."""
        key    = self._org_cache_key("last_used")
        cached = CacheService.get(key)
        if cached is not None:
            resp = Response(cached)
            resp["X-Cache"] = "HIT"
            return resp

        config = self.get_queryset().first()

        if config:
            data = self.get_serializer(config).data
        else:
            data = {
                "config_name":            "Default Configuration",
                "academic_year":          "2024-25",
                "semester":               1,
                "working_days":           6,
                "slots_per_day":          8,
                "start_time":             "08:00:00",
                "end_time":               "17:00:00",
                "slot_duration_minutes":  60,
                "lunch_break_enabled":    True,
                "lunch_break_start":      "13:00:00",
                "lunch_break_end":        "14:00:00",
                "selected_departments":   [],
                "include_open_electives": True,
                "max_classes_per_day":    6,
                "min_gap_between_classes": 0,
                "avoid_first_last_slot":  False,
                "faculty_max_continuous": 3,
                "optimization_priority":  "balanced",
                "minimize_faculty_travel": True,
                "prefer_morning_slots":   False,
                "group_same_subject":     True,
                "number_of_variants":     5,
                "timeout_minutes":        10,
                "allow_conflicts":        False,
                "use_ai_optimization":    True,
                "is_default":             True,
            }

        CacheService.set(key, data, timeout=_CONFIG_TTL)
        resp = Response(data)
        resp["X-Cache"] = "MISS"
        return resp

    @action(detail=False, methods=["post"])
    def save_and_generate(self, request):
        """Save configuration and trigger timetable generation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = serializer.save()
        self._invalidate()
        return Response(
            self.get_serializer(config).data,
            status=status.HTTP_201_CREATED,
        )

