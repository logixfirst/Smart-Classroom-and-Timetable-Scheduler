"""
Timetable Generation API Views
Handles timetable generation, progress tracking, and approval workflow
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime
import requests
import os
import logging

from .models import GenerationJob, Timetable, Department, Batch
from .serializers import (
    GenerationJobSerializer,
    GenerationJobCreateSerializer,
    TimetableSerializer,
)

logger = logging.getLogger(__name__)


class GenerationJobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing timetable generation jobs
    """

    queryset = GenerationJob.objects.all()
    serializer_class = GenerationJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter jobs based on user role"""
        user = self.request.user
        if user.role == "admin":
            return GenerationJob.objects.all()
        elif user.role in ["staff", "faculty"]:
            return GenerationJob.objects.filter(
                department__department_id=user.department
            )
        return GenerationJob.objects.filter(created_by=user)

    @action(detail=False, methods=["post"], url_path="generate")
    def generate_timetable(self, request):
        """
        Start a new timetable generation job
        POST /api/timetable/generate/
        Body: {
            "department_id": "CSE",
            "batch_id": "2024-CSE-A",
            "semester": 3,
            "academic_year": "2024-25"
        }
        """
        serializer = GenerationJobCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Create generation job
        try:
            department = Department.objects.get(
                department_id=serializer.validated_data["department_id"]
            )
            batch = Batch.objects.get(batch_id=serializer.validated_data["batch_id"])

            # Create job entry
            job = GenerationJob.objects.create(
                department=department,
                batch=batch,
                semester=serializer.validated_data["semester"],
                academic_year=serializer.validated_data["academic_year"],
                status="queued",
                progress=0,
                created_by=request.user,
            )

            # Push job to Redis queue for FastAPI processing
            self._queue_generation_job(job)

            # Return job details
            job_serializer = GenerationJobSerializer(job)
            return Response(
                {
                    "success": True,
                    "message": "Timetable generation started",
                    "job": job_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.error(f"Error creating generation job: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"], url_path="status")
    def get_status(self, request, pk=None):
        """
        Get current status and progress of a generation job
        GET /api/timetable/status/{job_id}/
        """
        try:
            job = self.get_object()

            # Check Redis for real-time progress
            cache_key = f"generation_progress:{job.job_id}"
            redis_progress = cache.get(cache_key)

            if redis_progress is not None:
                job.progress = redis_progress
                job.save(update_fields=["progress"])

            serializer = GenerationJobSerializer(job)
            return Response({"success": True, "job": serializer.data})

        except Exception as e:
            logger.error(f"Error fetching job status: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"], url_path="progress")
    def get_progress(self, request, pk=None):
        """
        Get real-time progress from Redis
        GET /api/timetable/progress/{job_id}/
        """
        try:
            job = self.get_object()
            cache_key = f"generation_progress:{job.job_id}"

            # Get progress from Redis
            progress = cache.get(cache_key)
            if progress is None:
                progress = job.progress

            return Response(
                {
                    "success": True,
                    "job_id": str(job.job_id),
                    "status": job.status,
                    "progress": progress,
                    "updated_at": job.updated_at.isoformat()
                    if job.updated_at
                    else None,
                }
            )

        except Exception as e:
            logger.error(f"Error fetching progress: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """
        Approve a completed generation job and publish timetable
        POST /api/timetable/approve/{job_id}/
        Body: { "action": "approve" | "reject", "comments": "..." }
        """
        if request.user.role not in ["admin", "staff"]:
            return Response(
                {
                    "success": False,
                    "error": "Only admin and staff can approve timetables",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            job = self.get_object()
            action_type = request.data.get("action", "approve")
            comments = request.data.get("comments", "")

            if job.status != "completed":
                return Response(
                    {
                        "success": False,
                        "error": "Can only approve/reject completed jobs",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action_type == "approve":
                job.status = "approved"
                # Update associated timetable status
                Timetable.objects.filter(generation_job=job).update(
                    status="published", updated_at=timezone.now()
                )
                message = "Timetable approved and published"
            else:
                job.status = "rejected"
                message = "Timetable rejected"

            job.completed_at = timezone.now()
            job.save()

            serializer = GenerationJobSerializer(job)
            return Response(
                {"success": True, "message": message, "job": serializer.data}
            )

        except Exception as e:
            logger.error(f"Error approving job: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"], url_path="result")
    def get_result(self, request, pk=None):
        """
        Get generated timetable for a job
        GET /api/timetable/result/{job_id}/
        """
        try:
            job = self.get_object()

            if job.status not in ["completed", "approved"]:
                return Response(
                    {
                        "success": False,
                        "error": "Timetable generation not completed yet",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get timetables for this job
            timetables = Timetable.objects.filter(generation_job=job).prefetch_related(
                "slots"
            )
            serializer = TimetableSerializer(timetables, many=True)

            return Response(
                {
                    "success": True,
                    "job_id": str(job.job_id),
                    "status": job.status,
                    "timetables": serializer.data,
                }
            )

        except Exception as e:
            logger.error(f"Error fetching timetable result: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _queue_generation_job(self, job):
        """
        Queue job in Redis for FastAPI worker to pick up
        """
        try:
            # Store job data in Redis queue
            cache_key = f"generation_queue:{job.job_id}"
            job_data = {
                "job_id": str(job.job_id),
                "department_id": job.department.department_id,
                "batch_id": job.batch.batch_id,
                "semester": job.semester,
                "academic_year": job.academic_year,
                "created_at": job.created_at.isoformat(),
            }
            cache.set(cache_key, job_data, timeout=3600)  # 1 hour

            # Trigger FastAPI service
            fastapi_url = os.getenv("FASTAPI_AI_SERVICE_URL", "http://localhost:8001")
            try:
                requests.post(
                    f"{fastapi_url}/api/generate/{job.job_id}", json=job_data, timeout=5
                )
                logger.info(f"Triggered FastAPI generation for job {job.job_id}")
            except requests.exceptions.RequestException as e:
                logger.warning(
                    f"Could not trigger FastAPI service: {e}. Job queued in Redis."
                )

        except Exception as e:
            logger.error(f"Error queuing job: {str(e)}")
            job.status = "failed"
            job.error_message = str(e)
            job.save()
