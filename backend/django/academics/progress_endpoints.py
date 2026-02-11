"""
Progress Endpoints - Enterprise Pattern
Single Responsibility: Expose real-time progress to clients

Principles:
- Control plane exposes progress (doesn't generate it)
- Data comes from Redis (single source of truth)
- SSE for real-time push (no polling)
"""
import json
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
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        
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


@csrf_exempt
@require_http_methods(["GET"])
def stream_progress(request, job_id):
    """
    Server-Sent Events (SSE) stream for real-time progress updates.
    
    GET /api/generation/stream/{job_id}/
    
    CRITICAL: Uses plain Django view (not DRF) to avoid 406 errors.
    DRF's content negotiation rejects StreamingHttpResponse with 406.
    
    Enterprise pattern:
    - No polling required
    - Real-time push updates
    - Automatic reconnection support
    - Efficient bandwidth usage
    
    Frontend usage:
        const eventSource = new EventSource('/api/generation/stream/{job_id}/');
        eventSource.addEventListener('progress', (event) => {
            const progress = JSON.parse(event.data);
            updateUI(progress);
        });
    """
    def event_stream():
        """Generator function for SSE stream"""
        try:
            # Connect to Redis
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            key = f"progress:job:{job_id}"
            
            # Send initial connection event
            yield f"event: connected\ndata: {{\"job_id\": \"{job_id}\"}}\n\n"
            
            last_data = None
            retry_count = 0
            max_retries = 60  # 60 seconds max for missing job
            
            while True:
                try:
                    # Fetch current progress
                    data = redis_client.get(key)
                    
                    if data:
                        retry_count = 0  # Reset retry counter
                        
                        # Only send if data changed (reduce bandwidth)
                        if data != last_data:
                            progress = json.loads(data)
                            
                            # Format as SSE event
                            yield f"event: progress\ndata: {data}\n\n"
                            last_data = data
                            
                            # Stop stream if job completed/failed/cancelled
                            if progress.get('status') in ['completed', 'failed', 'cancelled']:
                                yield f"event: done\ndata: {{\"status\": \"{progress.get('status')}\"}}\n\n"
                                break
                    else:
                        retry_count += 1
                        if retry_count >= max_retries:
                            # Job not found after 60+ seconds
                            yield f"event: error\ndata: {{\"message\": \"Job not found\"}}\n\n"
                            break
                    
                    # Sleep for 1 second before next poll
                    time.sleep(1)
                    
                except redis.ConnectionError:
                    logger.error("[SSE] Redis connection lost")
                    yield f"event: error\ndata: {{\"message\": \"Connection lost\"}}\n\n"
                    break
                    
        except Exception as e:
            logger.error(f"[SSE] Stream error: {e}")
            yield f"event: error\ndata: {{\"message\": \"{str(e)}\"}}\n\n"
    
    # Return SSE response
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    
    # CRITICAL SSE headers
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    
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
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
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
