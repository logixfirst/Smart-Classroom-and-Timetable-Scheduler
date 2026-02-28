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

        all_variants = [v for v in (job.variants_meta or []) if v is not None]
        result = [
            self._build_variant_summary(job, idx, v, all_variants=all_variants)
            for idx, v in enumerate(all_variants)
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

    @action(detail=False, methods=["get"], url_path="compare")
    def compare(self, request):
        """
        Side-by-side diff of two variants for a given department scope.

        Query params:
          job_id          — required
          a               — variant id  (e.g. "{job_id}-variant-1")
          b               — variant id  (e.g. "{job_id}-variant-2")
          department_id   — optional; "all" or a dept UUID

        Returns:
          shared_slots    — entries present and identical in both A and B
          only_in_a       — entries in A not matched in B
          only_in_b       — entries in B not matched in A
          conflicts_a     — entries in A that have has_conflict=True
          conflicts_b     — entries in B that have has_conflict=True
          summary         — { identical, diff_a, diff_b, conflicts_a, conflicts_b }
        """
        job_id = request.query_params.get("job_id")
        var_a_id = request.query_params.get("a")
        var_b_id = request.query_params.get("b")
        dept_id = request.query_params.get("department_id", "all")

        if not job_id or not var_a_id or not var_b_id:
            return Response(
                {"error": "job_id, a, and b params required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = (
            f"variant_compare_{var_a_id}_{var_b_id}_{dept_id}"
        )
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        raw_a = self._fetch_variant_entries(job_id, var_a_id)
        raw_b = self._fetch_variant_entries(job_id, var_b_id)

        if raw_a is None or raw_b is None:
            return Response(
                {"error": "One or both variants not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        entries_a = self._convert_timetable_entries(raw_a)
        entries_b = self._convert_timetable_entries(raw_b)

        if dept_id != "all":
            entries_a = [e for e in entries_a if e.get("department_id") == dept_id]
            entries_b = [e for e in entries_b if e.get("department_id") == dept_id]

        result = self._diff_entries(entries_a, entries_b)
        cache.set(cache_key, result, 300)
        return Response(result)

    # ------------------------------------------------------------------
    # Diff helper
    # ------------------------------------------------------------------

    def _entry_key(self, entry: dict) -> str:
        """Canonical identity key for deduplication in diff."""
        return "|".join([
            str(entry.get("day", "")),
            str(entry.get("time_slot", "")),
            str(entry.get("subject_code", "")),
            str(entry.get("faculty_id", "")),
            str(entry.get("room_number", "")),
            str(entry.get("batch_name", "")),
        ])

    def _diff_entries(self, entries_a: list, entries_b: list) -> dict:
        """
        Compute symmetric diff between two variant entry lists.

        Entry identity: (day, time_slot, subject_code, faculty_id, room_number, batch_name)
        If the key exists in both → shared (identical).
        If only in A → only_in_a.
        If only in B → only_in_b.
        """
        map_a = {self._entry_key(e): e for e in entries_a}
        map_b = {self._entry_key(e): e for e in entries_b}

        keys_a = set(map_a)
        keys_b = set(map_b)

        shared = [map_a[k] for k in (keys_a & keys_b)]
        only_in_a = [map_a[k] for k in (keys_a - keys_b)]
        only_in_b = [map_b[k] for k in (keys_b - keys_a)]
        conflicts_a = [e for e in entries_a if e.get("has_conflict")]
        conflicts_b = [e for e in entries_b if e.get("has_conflict")]

        return {
            "shared_slots": shared,
            "only_in_a": only_in_a,
            "only_in_b": only_in_b,
            "conflicts_a": conflicts_a,
            "conflicts_b": conflicts_b,
            "summary": {
                "identical": len(shared),
                "diff_a": len(only_in_a),
                "diff_b": len(only_in_b),
                "conflicts_a": len(conflicts_a),
                "conflicts_b": len(conflicts_b),
            },
        }

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

    # ------------------------------------------------------------------
    # Scoring helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_score_faculty_load(qm: dict) -> int:
        """
        Derive faculty-load score (0-100) from quality_metrics.

        Looks for workload_balance / faculty_satisfaction first, then
        falls back to inverting a raw avg-load metric.
        Higher = faculty less overloaded = better.
        """
        raw = (
            qm.get("workload_balance_score")
            or qm.get("faculty_satisfaction")
            or qm.get("workload_balance")
        )
        if raw is not None:
            return min(100, max(0, int(round(float(raw)))))
        # Inverse of overload_ratio if available
        overload = qm.get("overload_ratio") or qm.get("faculty_overload_rate")
        if overload is not None:
            return min(100, max(0, int(round(100 - float(overload) * 100))))
        return 70  # neutral default when data absent

    @staticmethod
    def _compute_score_student_gaps(qm: dict) -> int:
        """
        Derive student-gap score (0-100) from quality_metrics.

        Fewer gaps → higher score. Looks for compactness / schedule_density.
        """
        raw = (
            qm.get("compactness_score")
            or qm.get("schedule_density")
            or qm.get("student_gap_score")
        )
        if raw is not None:
            return min(100, max(0, int(round(float(raw)))))
        gap_rate = qm.get("avg_gap_hours_per_day") or qm.get("gap_rate")
        if gap_rate is not None:
            return min(100, max(0, int(round(100 - float(gap_rate) * 20))))
        return 70  # neutral default

    @staticmethod
    def _derive_optimization_label(
        score_faculty: int,
        score_room: int,
        score_student: int,
    ) -> str:
        """
        Choose a human-readable label based on which dimension scores highest.
        """
        scores = {
            "Faculty Optimized": score_faculty,
            "Room Optimized": score_room,
            "Student Experience": score_student,
        }
        return max(scores, key=lambda k: scores[k])

    def _build_variant_summary(
        self, job, idx: int, v: dict, all_variants: list | None = None
    ) -> dict:
        """
        Build the lightweight summary dict for one variant (no entries).

        Extended fields vs. old version:
          score_faculty_load     — faculty workload balance (0-100)
          score_room_utilization — room utilisation (0-100)
          score_student_gaps     — schedule compactness (0-100)
          conflict_count         — hard conflicts (int)
          soft_violation_count   — soft violations (int)
          optimization_label     — "Faculty Optimized" etc.
          is_recommended         — True on the variant with highest overall_score
        """
        qm = v.get("quality_metrics", {}) or {}
        sta = v.get("statistics", {}) or {}

        score_overall = int(round(float(
            qm.get("overall_score", v.get("score", 0)) or 0
        )))
        score_room = int(round(float(
            qm.get("room_utilization_score", v.get("room_utilization", 0)) or 0
        )))
        score_faculty = self._compute_score_faculty_load(qm)
        score_student = self._compute_score_student_gaps(qm)
        conflict_count = int(qm.get("total_conflicts", v.get("conflicts", 0)) or 0)
        soft_violations = int(qm.get("soft_violation_count", v.get("soft_violations", 0)) or 0)

        # is_recommended: True when this variant has the highest overall_score
        # across all variants in the same job. Pass `all_variants` to enable.
        is_recommended = False
        if all_variants:
            best_score = max(
                (
                    float((av.get("quality_metrics") or {}).get("overall_score") or
                          av.get("score", 0) or 0)
                    for av in all_variants if av
                ),
                default=0,
            )
            is_recommended = (score_overall >= best_score and best_score > 0)

        return {
            "id": f"{job.id}-variant-{idx + 1}",
            "job_id": str(job.id),
            "variant_number": idx + 1,
            "organization_id": str(job.organization_id),
            "timetable_entries": [],  # populated on-demand via /entries/
            "statistics": {
                "total_classes": sta.get("total_classes", v.get("entry_count", 0)),
                "total_conflicts": conflict_count,
            },
            "quality_metrics": {
                "overall_score": score_overall,
                "total_conflicts": conflict_count,
                "room_utilization_score": score_room,
                "score_faculty_load": score_faculty,
                "score_student_gaps": score_student,
                "soft_violation_count": soft_violations,
                "optimization_label": self._derive_optimization_label(
                    score_faculty, score_room, score_student
                ),
                "is_recommended": is_recommended,
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
                "year": e.get("year", e.get("student_year", None)),
                "section": e.get("section", e.get("section_name", "")),
                "has_conflict": bool(e.get("has_conflict", e.get("conflict", False))),
                "conflict_description": e.get("conflict_description", e.get("conflict_reason", "")),
                "enrolled_count": e.get("enrolled_count", e.get("enrollment_count", 0)),
                "room_capacity": e.get("room_capacity", e.get("capacity", 0)),
            })
        return result
