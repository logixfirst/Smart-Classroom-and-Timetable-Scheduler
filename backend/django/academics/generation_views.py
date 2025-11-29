"""
Timetable Generation API Views
Handles timetable generation, progress tracking, and approval workflow
"""
import logging
import os

import requests
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Batch, Department, GenerationJob, Timetable
from .serializers import (
    GenerationJobCreateSerializer,
    GenerationJobSerializer,
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

    def get_permissions(self):
        """Allow public access to list endpoint for status checking"""
        if self.action == 'list':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Filter jobs based on user role and status - OPTIMIZED"""
        queryset = (
            GenerationJob.objects
            .select_related('organization')
            .only(
                'id', 'status', 'progress', 'created_at', 'updated_at',
                'organization__org_id', 'organization__org_name'
            )
        )
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(',')]
            queryset = queryset.filter(status__in=statuses)
        
        # Limit to last 100 jobs and order by created_at
        return queryset.order_by('-created_at')[:100]

    @action(detail=False, methods=["post"], url_path="generate")
    def generate_timetable(self, request):
        """
        Start a new timetable generation job
        POST /api/generation-jobs/generate/
        Body: {
            "academic_year": "2024-2025",
            "semester": "odd",
            "university_id": 1,
            "priority": "normal"  # optional: high, normal, low
        }
        """
        # Validate required fields FIRST
        academic_year = request.data.get("academic_year")
        semester = request.data.get("semester")
        priority = request.data.get("priority", "normal")  # high, normal, low
        org_id = request.data.get("org_id") or getattr(
            request.user, "organization", None
        )
        
        # Check tenant limits and hardware resources
        from core.tenant_limits import TenantLimits
        
        can_start, error_msg = TenantLimits.can_start_generation(str(org_id))
        if not can_start:
            return Response(
                {
                    "success": False,
                    "error": error_msg,
                    "retry_after": 60
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not academic_year or not semester:
            return Response(
                {"success": False, "error": "academic_year and semester are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not org_id:
            return Response(
                {"success": False, "error": "org_id not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create generation job
        try:
            # Get organization object
            from .models import Organization
            org = Organization.objects.filter(org_name=org_id).first()
            if not org:
                return Response(
                    {"success": False, "error": f"Organization '{org_id}' not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            
            # Increment concurrent count
            from core.tenant_limits import TenantLimits
            TenantLimits.increment_concurrent(str(org_id))
            
            # Get priority from tenant tier if not specified
            if priority == "normal":
                priority_value = TenantLimits.get_priority(str(org_id))
            else:
                priority_value = {'high': 9, 'normal': 5, 'low': 1}.get(priority, 5)
            
            # Create job entry for university-wide generation
            job = GenerationJob.objects.create(
                organization=org,
                status="pending",
                progress=0,
                timetable_data={
                    'academic_year': academic_year,
                    'semester': semester,
                    'org_id': str(org_id),
                    'priority': priority_value,
                    'generation_type': 'full',
                    'scope': 'university'
                }
            )

            # Return IMMEDIATELY to frontend (don't wait for Celery/FastAPI)
            job_serializer = GenerationJobSerializer(job)
            response_data = {
                "success": True,
                "message": "Timetable generation started for all 127 departments",
                "job_id": str(job.id),
                "estimated_time": "8-11 minutes",
                "job": job_serializer.data,
            }
            
            # Queue job AFTER returning response (async)
            import threading
            threading.Thread(
                target=self._queue_generation_job,
                args=(job, org_id, priority),
                daemon=True
            ).start()
            
            return Response(response_data, status=status.HTTP_201_CREATED)

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
            cache_key = f"generation_progress:{job.id}"
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
            cache_key = f"generation_progress:{job.id}"

            # Get progress from Redis
            progress = cache.get(cache_key)
            if progress is None:
                progress = job.progress

            return Response(
                {
                    "success": True,
                    "job_id": str(job.id),
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

    def _decrement_concurrent_on_complete(self, job):
        """Decrement concurrent count when job completes"""
        try:
            from core.tenant_limits import TenantLimits
            org_id = job.timetable_data.get('org_id') if job.timetable_data else None
            if org_id:
                TenantLimits.decrement_concurrent(org_id)
        except Exception as e:
            logger.error(f"Error decrementing concurrent count: {e}")
    
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_generation(self, request, pk=None):
        """
        Cancel a running generation job
        POST /api/timetable/cancel/{job_id}/
        """
        try:
            job = self.get_object()
            
            if job.status in ['completed', 'cancelled']:
                return Response(
                    {'success': False, 'error': f'Cannot cancel {job.status} job'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set cancellation flag in Redis for FastAPI to detect
            cache.set(f"cancel:job:{job.id}", "1", timeout=3600)
            logger.info(f"Set cancellation flag for job {job.id}")
            
            # Also call FastAPI cancel endpoint
            try:
                fastapi_url = os.getenv("FASTAPI_AI_SERVICE_URL", "http://localhost:8001")
                response = requests.post(
                    f"{fastapi_url}/api/cancel/{job.id}",
                    timeout=5
                )
                if response.status_code == 200:
                    logger.info(f"FastAPI acknowledged cancellation for job {job.id}")
            except Exception as e:
                logger.warning(f"Failed to notify FastAPI: {e} (flag set in Redis)")
            
            # Update job status immediately
            job.status = 'cancelling'
            job.save()
            
            serializer = GenerationJobSerializer(job)
            return Response({
                'success': True,
                'message': 'Cancellation requested - job will stop shortly',
                'job': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error cancelling job: {str(e)}")
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
            
            # Decrement concurrent count
            self._decrement_concurrent_on_complete(job)

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

    @action(detail=True, methods=["post"], url_path="select-variant")
    def select_variant(self, request, pk=None):
        """
        Select a variant from generated options
        POST /api/timetable/select-variant/{job_id}/
        Body: { "variant_id": "variant_1" }
        """
        try:
            job = self.get_object()
            variant_id = request.data.get('variant_id')
            
            if not variant_id:
                return Response(
                    {'success': False, 'error': 'variant_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get variant from Redis
            fastapi_url = os.getenv("FASTAPI_AI_SERVICE_URL", "http://localhost:8001")
            response = requests.get(f"{fastapi_url}/api/variants/{job.id}")
            
            if response.status_code != 200:
                return Response(
                    {'success': False, 'error': 'Failed to fetch variants'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            variants_data = response.json()
            selected_variant = next(
                (v for v in variants_data.get('variants', []) if v['id'] == variant_id),
                None
            )
            
            if not selected_variant:
                return Response(
                    {'success': False, 'error': 'Variant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Mark variant as selected
            job.timetable_data = job.timetable_data or {}
            job.timetable_data['selected_variant'] = variant_id
            job.save()
            
            # Update timetable status
            Timetable.objects.filter(
                generation_job=job,
                variant_name=selected_variant['name']
            ).update(status='selected', updated_at=timezone.now())
            
            return Response({
                'success': True,
                'message': f"Variant '{selected_variant['name']}' selected",
                'variant': selected_variant
            })
            
        except Exception as e:
            logger.error(f"Error selecting variant: {str(e)}")
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                    "job_id": str(job.id),
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

    def _queue_generation_job(self, job, university_id, priority="normal"):
        """
        Queue job in Redis/Celery with priority support
        Priority: high (9), normal (5), low (1)
        """
        try:
            # Store job data in Redis queue
            cache_key = f"generation_queue:{job.id}"
            job_data = {
                "job_id": str(job.id),
                "university_id": university_id,
                "semester": job.timetable_data.get('semester'),
                "academic_year": job.timetable_data.get('academic_year'),
                "generation_type": "full",
                "scope": "university",
                "priority": priority,
                "created_at": job.created_at.isoformat(),
            }
            cache.set(cache_key, job_data, timeout=7200)  # 2 hours

            # Use Celery for queuing (hardware-adaptive)
            try:
                from academics.celery_tasks import generate_timetable_task
                
                # Map priority to Celery priority (0-9)
                celery_priority = {
                    'high': 9,
                    'normal': 5,
                    'low': 1
                }.get(priority, 5)
                
                # Queue with priority
                generate_timetable_task.apply_async(
                    args=[str(job.id), university_id, job.timetable_data.get('academic_year'), job.timetable_data.get('semester')],
                    priority=celery_priority
                )
                logger.info(f"Queued job {job.id} with priority {priority} (Celery)")
                
            except Exception as celery_error:
                # Fallback to direct FastAPI call if Celery not available
                logger.warning(f"Celery not available: {celery_error}. Using direct FastAPI call.")
                try:
                    fastapi_url = os.getenv("FASTAPI_AI_SERVICE_URL", "http://localhost:8001")
                    
                    # Call FastAPI with correct endpoint and NO timeout (returns immediately)
                    response = requests.post(
                        f"{fastapi_url}/api/generate_variants",
                        json={
                            "job_id": str(job.id),
                            "organization_id": university_id,
                            "semester": 1 if job.timetable_data.get('semester') == 'odd' else 2,
                            "academic_year": job.timetable_data.get('academic_year'),
                            "quality_mode": "balanced"
                        },
                        timeout=5  # Short timeout since FastAPI returns immediately
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"FastAPI queued job {job.id}: {result.get('message')}")
                    else:
                        logger.error(f"FastAPI returned error: {response.status_code} - {response.text}")
                        
                except Exception as api_error:
                    logger.error(f"FastAPI call failed: {api_error}")
                    # Keep job as pending - worker will pick it up later
                    logger.info(f"Job {job.id} queued in Redis, waiting for worker")
                
        except Exception as e:
            logger.error(f"Error queuing job: {str(e)}")
