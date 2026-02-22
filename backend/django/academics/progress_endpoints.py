"""
Progress Endpoints - Enterprise Pattern
Single Responsibility: Expose real-time progress to clients

Principles:
- Control plane exposes progress (doesn't generate it)
- Data comes from Redis (single source of truth)
- SSE for real-time push (no polling)
"""
import json
import ssl as ssl_module
import time
import logging
from django.http import StreamingHttpResponse, JsonResponse
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import redis

logger = logging.getLogger(__name__)


def _get_redis_client() -> redis.Redis:
    """
    Create a Redis client with proper SSL configuration.

    Uses ssl_cert_reqs=ssl.CERT_NONE for rediss:// URLs — identical to the
    approach used in erp/settings.py for CACHES and Celery, which is proven
    to work with the installed redis-py version and Upstash TLS endpoints.
    """
    url = settings.REDIS_URL
    if url.startswith("rediss://"):
        return redis.from_url(
            url,
            decode_responses=True,
            ssl_cert_reqs=ssl_module.CERT_NONE,
            socket_timeout=10,
            socket_connect_timeout=10,
            retry_on_timeout=True,
        )
    return redis.from_url(
        url,
        decode_responses=True,
        socket_timeout=10,
        socket_connect_timeout=10,
        retry_on_timeout=True,
    )


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint for progress checking
def get_progress(request, job_id):
    """
    Get current progress snapshot from Redis.
    
    GET /api/generation/progress/{job_id}/
    
    Returns:
        Progress object with stage, percentages, ETA
    """
    try:
        # Connect to Redis
        redis_client = _get_redis_client()

        # Fetch progress
        key = f"progress:job:{job_id}"
        data = redis_client.get(key)
        
        if not data:
            return Response(
                {
                    'job_id': job_id,
                    'status': 'not_found',
                    'message': 'Job not started or progress expired'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse and return
        progress_data = json.loads(data)
        return Response(progress_data)
        
    except redis.ConnectionError:
        logger.error("[PROGRESS] Redis connection failed")
        return Response(
            {'error': 'Progress service unavailable'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.error(f"[PROGRESS] Error fetching progress: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _infer_stage(progress: int) -> str:
    """Map overall_progress % to the closest generation stage name."""
    if progress < 5:
        return 'initializing'
    elif progress < 15:
        return 'loading'
    elif progress < 25:
        return 'clustering'
    elif progress < 85:
        return 'cpsat_solving'
    elif progress < 95:
        return 'ga_optimization'
    else:
        return 'rl_refinement'


def _db_progress_snapshot(job_id: str) -> dict | None:
    """
    Read GenerationJob from the Django DB and build a minimal ProgressData
    dict that is compatible with the frontend's ProgressData interface.

    Returns None if the job does not exist.
    """
    try:
        from academics.models import GenerationJob
        job = (
            GenerationJob.objects
            .filter(id=job_id)
            .values('status', 'progress', 'error_message', 'created_at')
            .first()
        )
        if job is None:
            return None

        pct = float(job['progress'] or 0)
        created_ts = int(job['created_at'].timestamp()) if job['created_at'] else int(time.time())
        return {
            'job_id': job_id,
            'stage': _infer_stage(int(pct)),
            'stage_progress': pct,
            'overall_progress': pct,
            'status': job['status'],
            'eta_seconds': None,
            'started_at': created_ts,
            'last_updated': int(time.time()),
            'metadata': {
                'source': 'db_fallback',
                'error': job['error_message'],
            },
        }
    except Exception as db_err:
        logger.warning(f"[SSE] DB snapshot failed for job {job_id}: {db_err}")
        return None


@csrf_exempt
@require_http_methods(["GET"])
def stream_progress(request, job_id):
    """
    Server-Sent Events (SSE) stream for real-time progress updates.

    GET /api/generation/stream/{job_id}/

    CRITICAL: Uses plain Django view (not DRF) to avoid 406 errors.
    DRF's content negotiation rejects StreamingHttpResponse with 406.

    Architecture (dual-source, resilient):
    - PRIMARY: Redis key "progress:job:{job_id}" written by FastAPI worker.
    - FALLBACK: Django DB (GenerationJob model) when Redis key is absent.

    This dual-source approach means the frontend *always* gets progress
    data even if FastAPI is using a different Redis DB index or the key
    hasn't been written yet.  The "Connecting..." spinner will resolve
    within DB_POLL_INTERVAL seconds in the worst case.
    """
    def event_stream():
        MAX_REDIS_RECONNECTS = 5
        REDIS_POLL_INTERVAL = 1   # seconds between Redis reads
        DB_POLL_INTERVAL = 3      # seconds between DB fallback reads
        TERMINAL = frozenset(('completed', 'failed', 'cancelled'))

        # Send 'connected' immediately — browser knows the channel is alive
        # before any slow I/O is attempted.
        yield f'event: connected\ndata: {{"job_id": "{job_id}"}}\n\n'

        redis_client = None
        redis_reconnect_count = 0
        key = f'progress:job:{job_id}'
        last_redis_data: str | None = None
        last_db_snapshot: str | None = None
        last_db_check: float = 0.0

        while True:
            # ── 1. (re)connect to Redis when needed ───────────────────────
            if redis_client is None:
                try:
                    redis_client = _get_redis_client()
                    redis_client.ping()          # fail-fast TLS check
                    if redis_reconnect_count > 0:
                        logger.info(
                            f'[SSE] Redis reconnected (attempt {redis_reconnect_count}) '
                            f'for job {job_id}'
                        )
                    redis_reconnect_count = 0
                except Exception as conn_err:
                    redis_reconnect_count += 1
                    logger.error(
                        f'[SSE] Redis connection failed '
                        f'(attempt {redis_reconnect_count}): {conn_err}'
                    )
                    if redis_reconnect_count > MAX_REDIS_RECONNECTS:
                        logger.warning(
                            f'[SSE] Redis unavailable after {MAX_REDIS_RECONNECTS} '
                            f'retries — switching to DB-only mode for job {job_id}'
                        )
                        # Don't break — fall through to DB fallback below
                    else:
                        backoff = min(2 ** redis_reconnect_count, 30)
                        time.sleep(backoff)
                        # Still try DB while waiting

            # ── 2. Try Redis (primary source) ─────────────────────────────
            redis_data: str | None = None
            if redis_client is not None:
                try:
                    redis_data = redis_client.get(key)
                except (redis.ConnectionError, redis.TimeoutError) as redis_err:
                    logger.warning(
                        f'[SSE] Redis read error for job {job_id}: {redis_err}. '
                        f'Reconnecting next tick.'
                    )
                    try:
                        redis_client.close()
                    except Exception:
                        pass
                    redis_client = None
                    redis_reconnect_count += 1
                except Exception as unexpected_err:
                    logger.error(
                        f'[SSE] Unexpected Redis error for job {job_id}: {unexpected_err}'
                    )
                    redis_client = None

            if redis_data:
                # ── 3a. Redis hit — emit live progress ────────────────────
                if redis_data != last_redis_data:
                    try:
                        progress_obj = json.loads(redis_data)
                        yield f'event: progress\ndata: {redis_data}\n\n'
                        last_redis_data = redis_data
                        last_db_snapshot = None  # reset so DB doesn't re-emit stale data

                        if progress_obj.get('status') in TERMINAL:
                            yield (
                                f'event: done\ndata: {{"status": '
                                f'"{progress_obj["status"]}"}}\n\n'
                            )
                            break
                    except (json.JSONDecodeError, KeyError) as parse_err:
                        logger.warning(
                            f'[SSE] Bad Redis data for job {job_id}: {parse_err}'
                        )
            else:
                # ── 3b. Redis miss — fall back to Django DB ────────────────
                now = time.time()
                if now - last_db_check >= DB_POLL_INTERVAL:
                    last_db_check = now
                    snapshot = _db_progress_snapshot(job_id)

                    if snapshot is None:
                        # Job doesn't exist at all
                        logger.warning(
                            f'[SSE] Job {job_id} not found in DB — closing stream'
                        )
                        yield (
                            'event: error\ndata: {"message": '
                            '"Job not found"}\n\n'
                        )
                        break

                    snapshot_str = json.dumps(snapshot)
                    if snapshot_str != last_db_snapshot:
                        yield f'event: progress\ndata: {snapshot_str}\n\n'
                        last_db_snapshot = snapshot_str
                        logger.info(
                            f'[SSE] DB fallback emitted for job {job_id}: '
                            f'status={snapshot["status"]} progress={snapshot["overall_progress"]}%'
                        )

                    if snapshot['status'] in TERMINAL:
                        yield (
                            f'event: done\ndata: {{"status": '
                            f'"{snapshot["status"]}"}}\n\n'
                        )
                        break

            time.sleep(REDIS_POLL_INTERVAL)
    
    # Return SSE response
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    
    # CRITICAL SSE headers
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    # CRITICAL: Prevent GZipMiddleware from buffering the stream.
    # GZipMiddleware wraps streaming_content with compress_sequence(), which
    # only flushes when its internal gzip buffer fills up (~8 KB).  For SSE
    # this means events are never flushed in real-time — the browser stays
    # stuck at "Connecting…" indefinitely.
    # Setting Content-Encoding here causes GZipMiddleware.process_response()
    # to skip the response entirely (it checks `response.has_header('Content-Encoding')`).
    response['Content-Encoding'] = 'identity'
    
    # CORS headers for cross-origin SSE (Next.js on :3000, Django on :8000)
    response['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    response['Access-Control-Allow-Credentials'] = 'true'
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for progress service.
    
    GET /api/generation/health/
    """
    try:
        # Check Redis connectivity
        redis_client = _get_redis_client()
        redis_client.ping()
        
        return Response({
            'status': 'healthy',
            'service': 'progress_tracker',
            'redis': 'connected'
        })
    except Exception as e:
        return Response(
            {
                'status': 'unhealthy',
                'error': str(e)
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
