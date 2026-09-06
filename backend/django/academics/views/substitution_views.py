"""
Substitution APIs for quick proxy assignment.

Flow:
1. POST /api/timetable/substitutions/                     -> create request + top recommendations
2. POST /api/timetable/substitutions/{id}/apply/          -> atomically apply selected proxy
3. POST /api/timetable/substitutions/{id}/rollback/       -> rollback applied proxy
"""

from __future__ import annotations

import re
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    ChangeAuditLog,
    CourseOffering,
    Faculty,
    GenerationJob,
    SubstitutionAssignment,
    SubstitutionProposal,
    SubstitutionRequest,
    TimetableOverlayEntry,
)


class SubstitutionViewSet(viewsets.ViewSet):
    """Create, recommend, apply, and rollback faculty substitutions."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        org_id = getattr(request.user, "organization_id", None)
        if not org_id:
            return Response([], status=status.HTTP_200_OK)

        recent = (
            SubstitutionRequest.objects
            .select_related("original_faculty", "substitute_faculty")
            .filter(organization_id=org_id)
            .order_by("-created_at")[:25]
        )

        data = [
            {
                "id": str(item.id),
                "variant_id": item.variant_id,
                "schedule_date": item.schedule_date.isoformat(),
                "day_index": item.day_index,
                "time_slot": item.time_slot,
                "status": item.status,
                "urgency": item.urgency,
                "subject_code": item.subject_code,
                "subject_name": item.subject_name,
                "original_faculty": {
                    "id": str(item.original_faculty_id),
                    "name": item.original_faculty.faculty_name,
                    "code": item.original_faculty.faculty_code,
                },
                "substitute_faculty": (
                    {
                        "id": str(item.substitute_faculty_id),
                        "name": item.substitute_faculty.faculty_name,
                        "code": item.substitute_faculty.faculty_code,
                    }
                    if item.substitute_faculty_id else None
                ),
                "created_at": item.created_at.isoformat(),
            }
            for item in recent
        ]
        return Response(data)

    def create(self, request):
        org_id = getattr(request.user, "organization_id", None)
        if not org_id:
            return Response({"error": "User organization is required"}, status=status.HTTP_400_BAD_REQUEST)

        required = ["job_id", "variant_id", "schedule_date", "day_index", "time_slot", "faculty_id"]
        missing = [field for field in required if not request.data.get(field)]
        if missing:
            return Response({"error": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

        job_id = request.data.get("job_id")
        variant_id = request.data.get("variant_id")
        schedule_date = request.data.get("schedule_date")
        day_index = int(request.data.get("day_index"))
        time_slot = str(request.data.get("time_slot")).strip()
        original_faculty_id = request.data.get("faculty_id")
        urgency = (request.data.get("urgency") or "high").lower()
        reason = (request.data.get("reason") or "").strip()
        subject_code = (request.data.get("subject_code") or "").strip()
        subject_name = (request.data.get("subject_name") or "").strip()

        if urgency not in {"low", "medium", "high", "critical"}:
            return Response({"error": "Invalid urgency"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            job = GenerationJob.objects.get(id=job_id, organization_id=org_id)
        except GenerationJob.DoesNotExist:
            return Response({"error": "Generation job not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            original_faculty = Faculty.objects.get(faculty_id=original_faculty_id, organization_id=org_id)
        except Faculty.DoesNotExist:
            return Response({"error": "Original faculty not found"}, status=status.HTTP_404_NOT_FOUND)

        entries = self._fetch_variant_entries(job, variant_id)
        target_entry = self._find_target_entry(
            entries,
            day_index=day_index,
            time_slot=time_slot,
            faculty_id=str(original_faculty_id),
            subject_code=subject_code,
        )
        if not target_entry:
            return Response({"error": "Unable to resolve slot for substitution"}, status=status.HTTP_404_NOT_FOUND)

        offering_id = self._extract_offering_id(target_entry)
        offering = None
        if offering_id:
            offering = CourseOffering.objects.filter(offering_id=offering_id).first()

        recommendations = self._recommend_candidates(
            org_id=org_id,
            entries=entries,
            target_entry=target_entry,
            original_faculty_id=str(original_faculty_id),
            offering=offering,
        )

        with transaction.atomic():
            sub_request = SubstitutionRequest.objects.create(
                organization_id=org_id,
                job=job,
                variant_id=variant_id,
                schedule_date=schedule_date,
                day_index=day_index,
                time_slot=time_slot,
                original_faculty=original_faculty,
                offering=offering,
                subject_code=subject_code or target_entry.get("subject_code", ""),
                subject_name=subject_name or target_entry.get("subject_name", ""),
                reason=reason,
                urgency=urgency,
                status="recommended",
                requested_by=request.user,
            )

            proposal_payload = []
            for idx, rec in enumerate(recommendations, start=1):
                proposal = SubstitutionProposal.objects.create(
                    request=sub_request,
                    candidate_faculty=rec["faculty"],
                    rank=idx,
                    score=Decimal(str(rec["score"])),
                    score_breakdown=rec["score_breakdown"],
                )
                proposal_payload.append(
                    {
                        "proposal_id": str(proposal.id),
                        "faculty_id": str(rec["faculty"].faculty_id),
                        "faculty_name": rec["faculty"].faculty_name,
                        "faculty_code": rec["faculty"].faculty_code,
                        "department_id": str(rec["faculty"].department_id),
                        "score": float(rec["score"]),
                        "score_breakdown": rec["score_breakdown"],
                    }
                )

            ChangeAuditLog.objects.create(
                organization_id=org_id,
                actor=request.user,
                action="substitution.request.created",
                entity_type="SubstitutionRequest",
                entity_id=str(sub_request.id),
                reason=reason,
                new_state={
                    "variant_id": variant_id,
                    "day_index": day_index,
                    "time_slot": time_slot,
                    "subject_code": sub_request.subject_code,
                    "urgency": urgency,
                    "recommendation_count": len(proposal_payload),
                },
            )

        return Response(
            {
                "request_id": str(sub_request.id),
                "status": sub_request.status,
                "target": {
                    "variant_id": variant_id,
                    "schedule_date": schedule_date,
                    "day_index": day_index,
                    "time_slot": time_slot,
                    "subject_code": sub_request.subject_code,
                    "subject_name": sub_request.subject_name,
                    "original_faculty_id": str(original_faculty_id),
                    "original_faculty_name": original_faculty.faculty_name,
                },
                "recommendations": proposal_payload,
                "latency_target": {"p50": "<2s", "p95": "<5s", "p99": "<10s"},
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        org_id = getattr(request.user, "organization_id", None)
        if not org_id:
            return Response({"error": "User organization is required"}, status=status.HTTP_400_BAD_REQUEST)

        proposal_id = request.data.get("proposal_id")
        substitute_faculty_id = request.data.get("substitute_faculty_id")

        with transaction.atomic():
            try:
                sub_request = (
                    SubstitutionRequest.objects
                    .select_for_update()
                    .select_related("job", "original_faculty")
                    .get(id=pk, organization_id=org_id)
                )
            except SubstitutionRequest.DoesNotExist:
                return Response({"error": "Substitution request not found"}, status=status.HTTP_404_NOT_FOUND)

            if sub_request.status == "applied":
                return Response({"error": "Substitution already applied"}, status=status.HTTP_400_BAD_REQUEST)

            proposal = None
            substitute_faculty = None
            if proposal_id:
                proposal = (
                    SubstitutionProposal.objects
                    .select_related("candidate_faculty")
                    .filter(id=proposal_id, request=sub_request)
                    .first()
                )
                if not proposal:
                    return Response({"error": "Proposal not found for this request"}, status=status.HTTP_404_NOT_FOUND)
                substitute_faculty = proposal.candidate_faculty
            elif substitute_faculty_id:
                substitute_faculty = Faculty.objects.filter(
                    faculty_id=substitute_faculty_id,
                    organization_id=org_id,
                    is_active=True,
                ).first()
                if not substitute_faculty:
                    return Response({"error": "Substitute faculty not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response(
                    {"error": "proposal_id or substitute_faculty_id required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            assignment = SubstitutionAssignment.objects.create(
                request=sub_request,
                proposal=proposal,
                substitute_faculty=substitute_faculty,
                status="applied",
                applied_by=request.user,
                notes=(request.data.get("notes") or "").strip(),
            )

            if proposal:
                proposal.is_selected = True
                proposal.save(update_fields=["is_selected"])

            sub_request.substitute_faculty = substitute_faculty
            sub_request.status = "applied"
            sub_request.save(update_fields=["substitute_faculty", "status", "updated_at"])

            original_entry = {
                "faculty_id": str(sub_request.original_faculty_id),
                "faculty_name": sub_request.original_faculty.faculty_name,
                "day_index": sub_request.day_index,
                "time_slot": sub_request.time_slot,
                "subject_code": sub_request.subject_code,
                "subject_name": sub_request.subject_name,
            }
            patched_entry = {
                **original_entry,
                "faculty_id": str(substitute_faculty.faculty_id),
                "faculty_name": substitute_faculty.faculty_name,
                "is_substitution": True,
                "substitution_request_id": str(sub_request.id),
            }

            overlay = TimetableOverlayEntry.objects.create(
                organization_id=org_id,
                request=sub_request,
                assignment=assignment,
                job=sub_request.job,
                variant_id=sub_request.variant_id,
                schedule_date=sub_request.schedule_date,
                day_index=sub_request.day_index,
                time_slot=sub_request.time_slot,
                original_entry=original_entry,
                patched_entry=patched_entry,
                status="active",
                created_by=request.user,
            )

            ChangeAuditLog.objects.create(
                organization_id=org_id,
                actor=request.user,
                action="substitution.applied",
                entity_type="SubstitutionRequest",
                entity_id=str(sub_request.id),
                reason=sub_request.reason,
                old_state=original_entry,
                new_state=patched_entry,
            )

        return Response(
            {
                "success": True,
                "request_id": str(sub_request.id),
                "assignment_id": str(assignment.id),
                "overlay_id": str(overlay.id),
                "status": sub_request.status,
                "substitute_faculty": {
                    "id": str(substitute_faculty.faculty_id),
                    "name": substitute_faculty.faculty_name,
                    "code": substitute_faculty.faculty_code,
                },
            }
        )

    @action(detail=True, methods=["post"])
    def rollback(self, request, pk=None):
        org_id = getattr(request.user, "organization_id", None)
        if not org_id:
            return Response({"error": "User organization is required"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                sub_request = (
                    SubstitutionRequest.objects
                    .select_for_update()
                    .select_related("assignment")
                    .get(id=pk, organization_id=org_id)
                )
            except SubstitutionRequest.DoesNotExist:
                return Response({"error": "Substitution request not found"}, status=status.HTTP_404_NOT_FOUND)

            assignment = getattr(sub_request, "assignment", None)
            if not assignment or assignment.status != "applied":
                return Response({"error": "No applied assignment to rollback"}, status=status.HTTP_400_BAD_REQUEST)

            assignment.status = "rolled_back"
            assignment.rollback_at = timezone.now()
            assignment.save(update_fields=["status", "rollback_at"])

            TimetableOverlayEntry.objects.filter(assignment=assignment, status="active").update(status="rolled_back")

            previous_substitute = sub_request.substitute_faculty_id
            sub_request.substitute_faculty = None
            sub_request.status = "rolled_back"
            sub_request.save(update_fields=["substitute_faculty", "status", "updated_at"])

            ChangeAuditLog.objects.create(
                organization_id=org_id,
                actor=request.user,
                action="substitution.rolled_back",
                entity_type="SubstitutionRequest",
                entity_id=str(sub_request.id),
                reason=(request.data.get("reason") or "").strip(),
                old_state={"substitute_faculty_id": str(previous_substitute) if previous_substitute else None},
                new_state={"substitute_faculty_id": None},
            )

        return Response({"success": True, "request_id": str(sub_request.id), "status": sub_request.status})

    def _fetch_variant_entries(self, job: GenerationJob, variant_id: str) -> list[dict]:
        variants = (job.timetable_data or {}).get("variants", [])
        for idx, variant in enumerate(variants, start=1):
            if f"{job.id}-variant-{idx}" == variant_id:
                return variant.get("timetable_entries", []) or []
        return []

    def _find_target_entry(
        self,
        entries: list[dict],
        *,
        day_index: int,
        time_slot: str,
        faculty_id: str,
        subject_code: str,
    ) -> dict | None:
        for entry in entries:
            entry_day = self._normalize_day(entry.get("day"))
            if entry_day != day_index:
                continue
            entry_time = self._entry_time_slot(entry)
            if entry_time != time_slot:
                continue
            if str(entry.get("faculty_id", "")) != str(faculty_id):
                continue
            if subject_code and str(entry.get("subject_code", "")) != subject_code:
                continue
            return entry
        return None

    @staticmethod
    def _normalize_day(day_value) -> int:
        if isinstance(day_value, int):
            return day_value
        day_map = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }
        return day_map.get(str(day_value).strip().lower(), -1)

    @staticmethod
    def _entry_time_slot(entry: dict) -> str:
        if entry.get("start_time") and entry.get("end_time"):
            return f"{entry.get('start_time')}-{entry.get('end_time')}"
        return str(entry.get("time_slot", "")).strip()

    @staticmethod
    def _extract_offering_id(entry: dict) -> str:
        if entry.get("offering_id"):
            return str(entry["offering_id"])
        course_id = str(entry.get("course_id", ""))
        match = re.search(r"_off_([0-9a-fA-F\-]{36})", course_id)
        return match.group(1) if match else ""

    def _recommend_candidates(
        self,
        *,
        org_id,
        entries: list[dict],
        target_entry: dict,
        original_faculty_id: str,
        offering: CourseOffering | None,
    ) -> list[dict]:
        target_day = self._normalize_day(target_entry.get("day"))
        target_time_slot = self._entry_time_slot(target_entry)
        target_dept = str(target_entry.get("department_id") or "")

        busy_faculty_ids = {
            str(e.get("faculty_id"))
            for e in entries
            if self._normalize_day(e.get("day")) == target_day and self._entry_time_slot(e) == target_time_slot
        }

        weekly_load = {}
        for e in entries:
            fid = str(e.get("faculty_id") or "")
            if not fid:
                continue
            weekly_load[fid] = weekly_load.get(fid, 0) + 1

        faculty_qs = Faculty.objects.filter(organization_id=org_id, is_active=True).select_related("department")
        candidates = []
        for faculty in faculty_qs:
            faculty_id = str(faculty.faculty_id)
            if faculty_id == str(original_faculty_id):
                continue
            if faculty_id in busy_faculty_ids:
                continue

            if target_dept and str(faculty.department_id) != target_dept and not faculty.can_teach_cross_department:
                continue

            max_weekly = faculty.max_hours_per_week or 18
            current_load = weekly_load.get(faculty_id, 0)
            if current_load >= max_weekly:
                continue

            taught_same_course = False
            if offering:
                taught_same_course = CourseOffering.objects.filter(
                    course_id=offering.course_id,
                    primary_faculty=faculty,
                    is_active=True,
                ).exists()

            score_breakdown = {
                "same_department": 25 if target_dept and str(faculty.department_id) == target_dept else 0,
                "taught_same_course": 30 if taught_same_course else 0,
                "cross_department_penalty": -10 if target_dept and str(faculty.department_id) != target_dept else 0,
                "load_penalty": -min(25, int((current_load / max_weekly) * 25)) if max_weekly > 0 else 0,
                "remaining_capacity_bonus": max(0, int((1 - (current_load / max_weekly)) * 20)) if max_weekly > 0 else 0,
            }

            score = 100 + sum(score_breakdown.values())
            candidates.append(
                {
                    "faculty": faculty,
                    "score": max(0, score),
                    "score_breakdown": {
                        **score_breakdown,
                        "current_weekly_load": current_load,
                        "max_weekly_load": max_weekly,
                    },
                }
            )

        candidates.sort(key=lambda item: item["score"], reverse=True)
        return candidates[:3]
