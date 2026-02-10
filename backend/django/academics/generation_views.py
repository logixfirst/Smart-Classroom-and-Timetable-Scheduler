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
        """Use lightweight serializer for list view (excludes timetable_data)"""
        if self.action == 'list':
            return GenerationJobListSerializer
        return GenerationJobSerializer

    def get_queryset(self):
        """Filter jobs based on user role and status"""
        queryset = GenerationJob.objects.all().order_by('-created_at')
        
        # CRITICAL: Use select_related to avoid N+1 queries
        queryset = queryset.select_related('organization')
        
        # CRITICAL: Defer timetable_data for list view (can be 5-50MB per job!)
        if self.action == 'list':
            queryset = queryset.defer('timetable_data')
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            # Handle comma-separated statuses
            statuses = [s.strip() for s in status_filter.split(',')]
            queryset = queryset.filter(status__in=statuses)
        
        return queryset

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
            
            # Get time configuration: PRIORITY ORDER
            # 1. Use form data from request.data['config'] if provided (user just filled form)
            # 2. Fall back to database TimetableConfiguration (cached from previous generation)
            # 3. Use hardcoded defaults as last resort
            from .timetable_config_models import TimetableConfiguration
            
            form_config = request.data.get("config")  # From generation form
            
            try:
                if form_config:
                    # User provided form data - use it directly
                    time_config_dict = {
                        'working_days': form_config.get('working_days', 6),
                        'slots_per_day': form_config.get('slots_per_day', 9),
                        'start_time': form_config.get('start_time', '08:00'),
                        'end_time': form_config.get('end_time', '17:00'),
                        'slot_duration_minutes': 60,
                        'lunch_break_enabled': form_config.get('lunch_break_enabled', True),
                        'lunch_break_start': form_config.get('lunch_break_start', '12:00'),
                        'lunch_break_end': form_config.get('lunch_break_end', '13:00'),
                    }
                    logger.info(f"Using form config from request: {time_config_dict}")
                else:
                    # No form data - try database cache
                    time_config = TimetableConfiguration.objects.filter(
                        organization=org,
                        academic_year=academic_year,
                        semester=1 if semester == 'odd' else 2
                    ).order_by('-last_used_at').first()
                    
                    if not time_config:
                        # Fallback to latest config for this org
                        time_config = TimetableConfiguration.objects.filter(
                            organization=org
                        ).order_by('-last_used_at').first()
                    
                    if time_config:
                        time_config_dict = {
                            'working_days': time_config.working_days,
                            'slots_per_day': time_config.slots_per_day,
                            'start_time': time_config.start_time.strftime('%H:%M'),
                            'end_time': time_config.end_time.strftime('%H:%M'),
                            'slot_duration_minutes': time_config.slot_duration_minutes,
                            'lunch_break_enabled': time_config.lunch_break_enabled,
                            'lunch_break_start': time_config.lunch_break_start.strftime('%H:%M') if time_config.lunch_break_enabled else None,
                            'lunch_break_end': time_config.lunch_break_end.strftime('%H:%M') if time_config.lunch_break_enabled else None,
                        }
                        logger.info(f"Using cached config from database: {time_config_dict}")
                        time_config.save(update_fields=['last_used_at'])
                    else:
                        # Use default config if none found
                        time_config_dict = {
                            'working_days': 6,
                            'slots_per_day': 9,
                            'start_time': '08:00',
                            'end_time': '17:00',
                            'slot_duration_minutes': 60,
                            'lunch_break_enabled': True,
                            'lunch_break_start': '12:00',
                            'lunch_break_end': '13:00',
                        }
                        logger.warning(f"No TimetableConfiguration found, using defaults: {time_config_dict}")
            except Exception as config_error:
                logger.error(f"Error fetching time config: {config_error}, using defaults")
                time_config_dict = {
                    'working_days': 6,
                    'slots_per_day': 9,
                    'start_time': '08:00',
                    'end_time': '17:00',
                    'slot_duration_minutes': 60,
                    'lunch_break_enabled': True,
                    'lunch_break_start': '12:00',
                    'lunch_break_end': '13:00',
                }
            
            # Create job entry for university-wide generation
            job = GenerationJob.objects.create(
                organization=org,
                status="running",  # Set to running immediately
                progress=0,
                # PERFORMANCE: Store in indexed fields for fast queries
                academic_year=academic_year,
                semester=1 if semester == 'odd' else 2,  # Normalize to int
                timetable_data={
                    'academic_year': academic_year,
                    'semester': semester,
                    'org_id': str(org_id),
                    'priority': priority_value,
                    'generation_type': 'full',
                    'scope': 'university',
                    'time_config': time_config_dict  # CRITICAL: Include time configuration
                }
            )
            
            # CRITICAL FIX: Set Redis cache IMMEDIATELY after job creation
            # This prevents race condition where frontend polls before cache exists
            import redis
            import json
            from django.conf import settings
            
            try:
                redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                cache_key = f"progress:job:{job.id}"
                initial_progress = {
                    'job_id': str(job.id),
                    'progress': 0,
                    'status': 'running',
                    'stage': 'Starting',
                    'message': 'Initializing timetable generation...',
                    'timestamp': timezone.now().isoformat(),
                    'time_remaining_seconds': None
                }
                redis_client.setex(cache_key, 3600, json.dumps(initial_progress))
                logger.info(f"[INIT] Redis progress cache set for job {job.id}")
            except Exception as e:
                logger.error(f"Failed to set initial Redis cache: {e}")
                # Fallback to Django cache
                cache.set(cache_key, initial_progress, timeout=3600)

            # Return IMMEDIATELY to frontend (don't wait for Celery/FastAPI)
            job_serializer = GenerationJobSerializer(job)
            response_data = {
                "success": True,
                "message": "Timetable generation started for all 127 departments",
                "job_id": str(job.id),
                "estimated_time": "8-11 minutes",
                "job": job_serializer.data,
            }
            
            # CRITICAL: Return response FIRST, then queue job in background
            # This prevents frontend from waiting for FastAPI connection
            response = Response(response_data, status=status.HTTP_201_CREATED)
            
            # Queue job AFTER response is created (async, non-blocking)
            import threading
            threading.Thread(
                target=self._queue_generation_job,
                args=(job, org_id, priority),
                daemon=True
            ).start()
            
            return response

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

    @action(detail=False, methods=["get"], url_path="progress/(?P<job_id>[^/.]+)")
    def get_progress_public(self, request, job_id=None):
        """
        Public progress endpoint (no auth required)
        GET /api/progress/{job_id}/
        """
        try:
            job = GenerationJob.objects.filter(id=job_id).first()
            if not job:
                return Response({
                    "success": False,
                    "error": "Job not found",
                    "job_id": job_id,
                    "status": "not_found",
                    "progress": 0,
                    "message": "Job not found in database"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Try Redis first (real-time progress from FastAPI)
            cache_key = f"progress:job:{job.id}"
            redis_data = cache.get(cache_key)
            
            if redis_data:
                import json
                if isinstance(redis_data, str):
                    progress_data = json.loads(redis_data)
                else:
                    progress_data = redis_data
                
                return Response({
                    "success": True,
                    "job_id": str(job.id),
                    "status": progress_data.get('status', job.status),
                    "progress": progress_data.get('progress', job.progress),
                    "stage": progress_data.get('stage', progress_data.get('message', 'Processing...')),
                    "message": progress_data.get('message', 'Processing...'),
                    "time_remaining_seconds": progress_data.get('time_remaining_seconds'),
                    "updated_at": progress_data.get('timestamp', job.updated_at.isoformat() if job.updated_at else None)
                })
            
            # Fallback to database
            return Response({
                "success": True,
                "job_id": str(job.id),
                "status": job.status,
                "progress": job.progress or 1,
                "stage": "Starting...",
                "message": "Initializing generation...",
                "time_remaining_seconds": None,
                "updated_at": job.updated_at.isoformat() if job.updated_at else None
            })

        except Exception as e:
            logger.error(f"Error fetching progress for {job_id}: {str(e)}")
            return Response(
                {"success": False, "error": str(e), "job_id": job_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    
    @action(detail=True, methods=["get"], url_path="progress")
    def get_progress(self, request, pk=None):
        """
        Get real-time progress from Redis
        GET /api/generation-jobs/{job_id}/progress/
        """
        try:
            job = self.get_object()
            
            # Use the public endpoint logic
            return self.get_progress_public(request, job_id=str(job.id)).data

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
