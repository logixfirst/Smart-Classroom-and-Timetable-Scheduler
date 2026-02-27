"""
Timetable Generation API Views
Handles timetable generation, progress tracking, and approval workflow
"""
import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from ..models import Batch, Department, GenerationJob, Timetable
from ..serializers import (
    GenerationJobCreateSerializer,
    GenerationJobSerializer,
    GenerationJobListSerializer,
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

    def get_serializer_class(self):
        """Use lightweight serializer for list/retrieve (excludes 5-50 MB timetable_data).
        Only the internal generate/status/result actions need the full blob."""
        if self.action in ('list', 'retrieve'):
            return GenerationJobListSerializer
        return GenerationJobSerializer

    def get_queryset(self):
        """Filter jobs based on user role and status"""
        queryset = GenerationJob.objects.all().order_by('-created_at')

        # CRITICAL: Use select_related to avoid N+1 queries for org_name
        queryset = queryset.select_related('organization')

        # CRITICAL: Defer timetable_data for list and retrieve views (can be 5-50MB per job!)
        if self.action in ('list', 'retrieve'):
            queryset = queryset.defer('timetable_data')

        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            # Handle comma-separated statuses
            statuses = [s.strip() for s in status_filter.split(',')]
            queryset = queryset.filter(status__in=statuses)

        return queryset

    def list(self, request, *args, **kwargs):
        """List jobs with short-lived HTTP cache hint for the browser."""
        response = super().list(request, *args, **kwargs)
        # Short TTL: job statuses can change (running -> completed).
        # 10 s is enough to benefit navigating back/forward without stale data.
        response['Cache-Control'] = 'private, max-age=10'
        return response

    def retrieve(self, request, *args, **kwargs):
        """Retrieve single job; serve from Redis for completed/failed/cancelled jobs."""
        pk = kwargs.get('pk') or self.kwargs.get('pk')
        cache_key = f'generation_job_meta_{pk}'

        cached = cache.get(cache_key)
        if cached:
            resp = Response(cached)
            resp['Cache-Control'] = 'private, max-age=3600'
            resp['X-Cache'] = 'HIT'
            return resp

        # get_object() is called once here and reused — avoids double DB hit
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        # Only cache immutable terminal states
        if instance.status in ('completed', 'failed', 'cancelled'):
            cache.set(cache_key, data, 3600)
            ttl = 3600
        else:
            ttl = 10
        resp = Response(data)
        resp['Cache-Control'] = f'private, max-age={ttl}'
        return resp

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

        from ..models import Organization
        from ..services.generation_job_service import (
            resolve_time_config,
            create_generation_job,
            enqueue_job_background,
        )

        org = Organization.objects.filter(org_name=org_id).first()
        if not org:
            return Response(
                {"success": False, "error": f"Organization '{org_id}' not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            time_config = resolve_time_config(
                org, academic_year, semester, request.data.get("config")
            )
            job = create_generation_job(org, academic_year, semester, priority, time_config)
        except Exception as exc:
            logger.error("Error creating generation job", extra={"error": str(exc)})
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        enqueue_job_background(job, org_id, priority)
        job_serializer = GenerationJobSerializer(job)
        return Response(
            {
                "success": True,
                "message": "Timetable generation started for all departments",
                "job_id": str(job.id),
                "estimated_time": "8-11 minutes",
                "job": job_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="status")
    def get_status(self, request, pk=None):
        """
        Get current status and progress of a generation job
        GET /api/timetable/status/{job_id}/
        """
        try:
            job = self.get_object()
            serializer = GenerationJobSerializer(job)
            return Response({"success": True, "job": serializer.data})

        except Exception as e:
            logger.error(f"Error fetching job status: {str(e)}")
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _decrement_concurrent_on_complete(self, job):
        """Placeholder for cleanup when job completes"""
        # Tenant limits system removed
        pass
    
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
                fastapi_url = settings.FASTAPI_URL
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
        if request.user.role != "admin":
            return Response(
                {
                    "success": False,
                    "error": "Only admin can approve timetables",
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
                    
                    # CRITICAL: Call FastAPI with short timeout and don't fail if it's down
                    response = requests.post(
                        f"{fastapi_url}/api/generate_variants",
                        json={
                            "job_id": str(job.id),
                            "organization_id": university_id,
                            "semester": 1 if job.timetable_data.get('semester') == 'odd' else 2,
                            "academic_year": job.timetable_data.get('academic_year'),
                            "quality_mode": "balanced"
                        },
                        timeout=3  # Very short timeout - FastAPI returns immediately
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"[OK] FastAPI queued job {job.id}: {result.get('message')}")
                    else:
                        logger.warning(f"[WARN] FastAPI returned {response.status_code}, job will retry")
                        
                except requests.exceptions.ConnectionError:
                    logger.warning(f"[WARN] FastAPI not reachable, job {job.id} will retry when service is available")
                except requests.exceptions.Timeout:
                    logger.warning(f"[WARN] FastAPI timeout, job {job.id} may still be processing")
                except Exception as api_error:
                    logger.warning(f"[WARN] FastAPI call failed: {api_error}, job will retry")
                
                # Job is queued in Redis regardless of FastAPI status
                logger.info(f"[OK] Job {job.id} queued in Redis, will be picked up by worker")
                
        except Exception as e:
            logger.error(f"Error queuing job: {str(e)}")
