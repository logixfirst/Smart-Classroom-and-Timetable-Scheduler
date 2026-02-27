"""
Timetable Variant ViewSet - on-demand variant selection and entry loading.

Separated from workflow_views.py by SRP:
  workflow_views.py          -> mutable workflow process (approve / reject)
  timetable_variant_views.py -> immutable variant results (read / select)

Each file has exactly one reason to change.
"""
from __future__ import annotations

import hashlib
import logging

from django.conf import settings
from django.core.cache import cache
from django.db.models import JSONField
from django.db.models.expressions import RawSQL
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import GenerationJob
from ..services import DepartmentViewService
from core.rbac import CanViewTimetable, DepartmentAccessPermission, has_department_access

logger = logging.getLogger(__name__)

_DAY_STR_MAP: dict[str, int] = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2,
    "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6,
}


class TimetableVariantViewSet(viewsets.ViewSet):
    """
    Timetable variant management -- immutable generated results.

    Variants are written once (by the FastAPI worker) and never mutated.
    All reads are heavily cached; entries are loaded on-demand to keep
    list responses small (< 50 KB vs. the raw 5-50 MB JSON blob).
    """

    permission_classes = [IsAuthenticated, CanViewTimetable]

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated, DepartmentAccessPermission])
    def department_view(self, request, pk=None):
        """Return variant entries filtered to a specific department."""
        department_id = request.query_params.get("department_id", "all")

        if department_id != "all" and not has_department_access(request.user, department_id):
            return Response(
                {"error": "Access denied to this department"},
                status=status.HTTP_403_FORBIDDEN,
            )

        job_id = request.query_params.get("job_id")
        if not job_id:
            return Response(
                {"error": "job_id parameter required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            job = GenerationJob.objects.get(id=job_id)
        except GenerationJob.DoesNotExist:
            return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

        variants = (job.timetable_data or {}).get("variants", [])
        variant = next(
            (v for idx, v in enumerate(variants) if f"{job_id}-variant-{idx + 1}" == pk),
            None,
        )
        if not variant:
            return Response({"error": "Variant not found"}, status=status.HTTP_404_NOT_FOUND)

        entries = variant.get("timetable_entries", [])
        filtered = DepartmentViewService.filter_by_department(entries, department_id)
        return Response({
            "variant_id": pk,
            "department_id": department_id,
            "timetable_entries": self._convert_timetable_entries(filtered),
            "department_stats": DepartmentViewService.get_department_stats(entries),
            "total_entries": len(entries),
            "filtered_entries": len(filtered),
        })

    def list(self, request):
        """
        List variant metadata without timetable entries (fast, < 50 KB).

        Uses a PostgreSQL JSONB expression to strip the bulky timetable_entries
        array server-side before the data crosses the wire.
        """
        job_id = request.query_params.get("job_id")
        if not job_id:
            return Response({"error": "job_id required"}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"variants_list_{job_id}"
        cached = cache.get(cache_key)
        if cached:
            response = Response(cached)
            response["Cache-Control"] = "private, max-age=3600"
            return response

        try:
            job = (
                GenerationJob.objects
                .only("id", "organization_id", "created_at")
                .annotate(
                    variants_meta=RawSQL(
                        """
                        SELECT jsonb_agg(v - 'timetable_entries')
                        FROM jsonb_array_elements(
                            COALESCE(timetable_data->'variants', '[]'::jsonb)
                        ) AS v
                        """,
                        (),
                        output_field=JSONField(),
                    )
                )
                .get(id=job_id)
            )
        except GenerationJob.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        result = [
            self._build_variant_summary(job, idx, v)
            for idx, v in enumerate(job.variants_meta or [])
            if v is not None
        ]
        cache.set(cache_key, result, 3600)
        response = Response(result)
        response["Cache-Control"] = "private, max-age=3600"
        return response

    @action(detail=True, methods=["get"])
    def entries(self, request, pk=None):
        """
        Load timetable entries for a specific variant on demand.
        Returns HTTP 304 when the client already has the current version (ETag).
        """
        job_id = request.query_params.get("job_id")
        if not job_id:
            return Response({"error": "job_id required"}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"variant_entries_{pk}"
        etag_value = f'"{hashlib.md5(cache_key.encode()).hexdigest()}"'

        cached = cache.get(cache_key)
        if cached:
            if request.META.get("HTTP_IF_NONE_MATCH") == etag_value:
                return Response(status=304)
            response = Response({"timetable_entries": cached})
            response["Cache-Control"] = "private, max-age=3600"
            response["ETag"] = etag_value
            return response

        raw_entries = self._fetch_variant_entries(job_id, pk)
        if raw_entries is None:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        entry_cap = getattr(settings, "TIMETABLE_ENTRY_DISPLAY_LIMIT", 2000)
        entries = self._convert_timetable_entries(raw_entries[:entry_cap])
        cache.set(cache_key, entries, 3600)
        response = Response({"timetable_entries": entries})
        response["Cache-Control"] = "private, max-age=3600"
        response["ETag"] = etag_value
        return response

    @action(detail=True, methods=["post"])
    def select(self, request, pk=None):
        """Mark a variant as selected."""
        return Response({"success": True, "variant_id": str(pk)})

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fetch_variant_entries(self, job_id: str, pk: str) -> list | None:
        """
        Use a PostgreSQL JSONB path expression to extract only the target
        variant's entries without loading every variant into Python.
        Falls back to a Python-level scan on annotation failure.
        Returns None when the job does not exist.
        """
        try:
            job = (
                GenerationJob.objects
                .only("id")
                .annotate(
                    target_entries=RawSQL(
                        """
                        timetable_data->'variants'->
                        (
                          SELECT (idx - 1)::int
                          FROM   jsonb_array_elements(
                                     COALESCE(timetable_data->'variants', '[]'::jsonb)
                                 ) WITH ORDINALITY AS t(v, idx)
                          WHERE  %s = (id::text || '-variant-' || idx::text)
                          LIMIT  1
                        )->'timetable_entries'
                        """,
                        (pk,),
                        output_field=JSONField(),
                    )
                )
                .get(id=job_id)
            )
            return job.target_entries or []
        except GenerationJob.DoesNotExist:
            return None
        except Exception as exc:
            logger.warning(
                "JSONB annotation failed -- falling back to Python scan",
                extra={"job_id": job_id, "variant_pk": pk, "error": str(exc)},
            )
            return self._fetch_variant_entries_fallback(job_id, pk)

    def _fetch_variant_entries_fallback(self, job_id: str, pk: str) -> list | None:
        """Python-level fallback when the JSONB annotation is unavailable."""
        try:
            job = GenerationJob.objects.only("timetable_data").get(id=job_id)
        except GenerationJob.DoesNotExist:
            return None
        for idx, v in enumerate((job.timetable_data or {}).get("variants", [])):
            if f"{job_id}-variant-{idx + 1}" == pk:
                return v.get("timetable_entries", [])
        return []

    def _build_variant_summary(self, job, idx: int, v: dict) -> dict:
        """Build the lightweight summary dict for one variant (no entries)."""
        qm = v.get("quality_metrics", {}) or {}
        sta = v.get("statistics", {}) or {}
        return {
            "id": f"{job.id}-variant-{idx + 1}",
            "job_id": str(job.id),
            "variant_number": idx + 1,
            "organization_id": str(job.organization_id),
            "timetable_entries": [],  # populated on-demand via /entries/
            "statistics": {
                "total_classes": sta.get("total_classes", v.get("entry_count", 0)),
                "total_conflicts": qm.get("total_conflicts", v.get("conflicts", 0)),
            },
            "quality_metrics": {
                "overall_score": qm.get("overall_score", v.get("score", 0)),
                "total_conflicts": qm.get("total_conflicts", v.get("conflicts", 0)),
                "room_utilization_score": qm.get("room_utilization_score", v.get("room_utilization", 0)),
            },
            "generated_at": job.created_at.isoformat(),
        }

    def _convert_timetable_entries(self, entries: list) -> list:
        """
        Normalise FastAPI entry format -> frontend TimetableEntry format.

        FastAPI stores: course_code, subject_name, faculty_name, room_code,
          day (int 0-5), start_time ('09:00'), end_time ('10:00').
        Frontend expects: subject_code, room_number, time_slot ('09:00-10:00'),
          day (int 0-4).
        """
        result = []
        for e in entries:
            day_raw = e.get("day", 0)
            day = day_raw if isinstance(day_raw, int) else _DAY_STR_MAP.get(day_raw, 0)
            start_t = e.get("start_time", "")
            end_t = e.get("end_time", "")
            result.append({
                "day": day,
                "time_slot": f"{start_t}-{end_t}" if start_t else e.get("time_slot", ""),
                "subject_code": e.get("course_code", e.get("subject_code", "")),
                "subject_name": e.get("subject_name", e.get("course_name", "")),
                "faculty_id": e.get("faculty_id", ""),
                "faculty_name": e.get("faculty_name", ""),
                "room_number": e.get("room_code", e.get("room_number", "")),
                "batch_name": e.get("batch_name", ""),
                "department_id": e.get("department_id", ""),
            })
        return result
