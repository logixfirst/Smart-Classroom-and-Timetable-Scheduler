"""
Timetable Workflow API - Review and Approval System
"""
import logging

from django.core.cache import cache
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import GenerationJob
from core.rbac import (
    CanApproveTimetable,
    CanViewTimetable,
)

logger = logging.getLogger(__name__)


PENDING_APPROVAL_STATUSES = ['completed', 'approved', 'rejected']
PENDING_ONLY_STATUS = 'completed'


class TimetableWorkflowViewSet(viewsets.ViewSet):
    """Timetable workflow management"""
    permission_classes = [IsAuthenticated, CanViewTimetable]

    def list(self, request):
        """List generation jobs available for approval review."""
        status_filter = request.query_params.get('status', '')
        cache_key = f'workflows_list_{request.user.id}_{status_filter}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        qs = (
            GenerationJob.objects
            .only('id', 'organization_id', 'status', 'academic_year', 'semester', 'created_at')
            .order_by('-created_at')
        )
        if status_filter in PENDING_APPROVAL_STATUSES:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.filter(status__in=PENDING_APPROVAL_STATUSES)

        items = [
            {
                'id': str(j.id),
                'status': j.status,
                'academic_year': j.academic_year or '',
                'semester': j.semester,
                'created_at': j.created_at.isoformat(),
                'organization_id': str(j.organization_id),
            }
            for j in qs[:50]
        ]
        data = {'count': len(items), 'results': items}
        cache.set(cache_key, data, 60)
        return Response(data)

    def retrieve(self, request, pk=None):
        """Get workflow details by ID - FAST VERSION"""
        cache_key = f'workflow_{pk}'
        cached = cache.get(cache_key)
        if cached:
            # CRITICAL: Never serve cached non-terminal status.
            # If we cached status='running' earlier and the job has since
            # completed, returning the stale 'running' value causes the
            # review page to redirect back to the status page, which then
            # sees 'completed' in Redis and redirects back to review — an
            # infinite redirect loop.  Only trust the cache for terminal states.
            terminal_statuses = ('completed', 'failed', 'cancelled', 'approved', 'rejected')
            if cached.get('status') in terminal_statuses:
                response = Response(cached)
                response['Cache-Control'] = 'private, max-age=3600'
                return response
            # Non-terminal cached entry — fall through to a fresh DB read.

        try:
            job = GenerationJob.objects.only(
                'id', 'organization_id', 'created_at', 'status',
                'academic_year', 'semester',
            ).get(id=pk)

            TERMINAL = ('completed', 'failed', 'cancelled', 'approved', 'rejected')

            # ── Self-healing: if DB says non-terminal, cross-check Redis ─────────
            # FastAPI writes status=completed to Redis before updating the DB.
            # If the DB write failed (e.g. Neon connection pool exhausted), the
            # DB will permanently say 'running' while Redis correctly says
            # 'completed'.  This causes an infinite review ↔ status redirect loop.
            # Fix: read the Redis progress key and, if it says completed/failed,
            # update the DB now and return the correct status.
            if job.status not in TERMINAL:
                try:
                    import json as _json
                    import redis as _redis
                    import ssl as _ssl
                    from django.conf import settings as _settings
                    _url = _settings.REDIS_URL
                    if _url.startswith('rediss://'):
                        _r = _redis.from_url(
                            _url, decode_responses=True,
                            ssl_cert_reqs=_ssl.CERT_NONE, socket_timeout=3,
                        )
                    else:
                        _r = _redis.from_url(_url, decode_responses=True, socket_timeout=3)
                    _raw = _r.get(f'progress:job:{pk}')
                    if _raw:
                        _prog = _json.loads(_raw)
                        _redis_status = _prog.get('status')
                        if _redis_status in ('completed', 'failed', 'cancelled'):
                            # Heal the DB — the FastAPI psycopg2 write must have failed.
                            logger.info(
                                '[WORKFLOW] DB says %s but Redis says %s for job %s — healing DB',
                                job.status, _redis_status, pk,
                            )
                            job.status = _redis_status
                            if _redis_status == 'completed':
                                job.progress = 100
                            job.save(update_fields=['status', 'progress', 'updated_at'])
                            # Enqueue Celery task to also warm variant/workflow caches.
                            try:
                                from academics.celery_tasks import fastapi_callback_task
                                fastapi_callback_task.delay(
                                    str(pk), _redis_status,
                                    variants=None, error=None,
                                )
                            except Exception as _ce:
                                logger.warning(
                                    '[WORKFLOW] Could not enqueue cache-warm task: %s', _ce
                                )
                except Exception as _redis_err:
                    # Redis unavailable — fall back to DB status as-is
                    logger.debug('[WORKFLOW] Redis cross-check failed: %s', _redis_err)

            data = {
                'id': str(job.id),
                'job_id': str(job.id),
                'organization_id': str(job.organization_id),
                'status': job.status,
                'academic_year': job.academic_year,
                'semester': job.semester,
                'created_at': job.created_at.isoformat(),
                'timetable_entries': [],  # Don't load entries here
            }
            # Only cache immutable terminal states to prevent stale 'running'
            # cache entries from causing infinite review ↔ status redirects.
            if job.status in TERMINAL:
                cache.set(cache_key, data, 3600)
            response = Response(data)
            ttl = 3600 if job.status in TERMINAL else 5
            response['Cache-Control'] = f'private, max-age={ttl}'
            return response
        except GenerationJob.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTimetable])
    def approve(self, request, pk=None):
        """Approve timetable workflow (Registrar only)"""
        try:
            job = GenerationJob.objects.get(id=pk)
            comments = request.data.get('comments', '')
            
            job.status = 'approved'
            job.save(update_fields=['status', 'updated_at'])
            cache.delete(f'workflow_{pk}')
            cache.delete_pattern(f'workflows_list_*')  # Bust list caches

            logger.info(
                "Workflow approved",
                extra={"workflow_id": str(pk), "user_id": str(request.user.id)},
            )
            return Response({
                'success': True,
                'message': 'Timetable approved successfully',
                'workflow_id': str(pk),
                'status': 'approved',
            })
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveTimetable])
    def reject(self, request, pk=None):
        """Reject timetable workflow (Registrar only)"""
        try:
            job = GenerationJob.objects.get(id=pk)
            comments = request.data.get('comments', '')
            
            if not comments:
                return Response(
                    {'error': 'Comments required for rejection'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            job.status = 'rejected'
            job.error_message = f"Rejected: {comments}"
            job.save(update_fields=['status', 'error_message', 'updated_at'])
            cache.delete(f'workflow_{pk}')
            cache.delete_pattern(f'workflows_list_*')  # Bust list caches

            logger.info(
                "Workflow rejected",
                extra={"workflow_id": str(pk), "user_id": str(request.user.id)},
            )
            return Response({
                'success': True,
                'message': 'Timetable rejected',
                'workflow_id': str(pk),
                'status': 'rejected',
            })
        except GenerationJob.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )

