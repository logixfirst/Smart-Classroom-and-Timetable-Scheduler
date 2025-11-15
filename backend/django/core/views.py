"""
Core application views for health checks and monitoring.
"""
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis
import os


def health_check(request):
    """
    Health check endpoint for monitoring service status.
    Checks database, cache (Redis), and returns overall health status.
    """
    health_status = {
        "status": "healthy",
        "service": "SIH28 Backend",
        "database": "unknown",
        "cache": "unknown",
    }

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"

    # Check Redis cache connection
    try:
        cache.set("health_check", "ok", 10)
        if cache.get("health_check") == "ok":
            health_status["cache"] = "connected"
        else:
            health_status["cache"] = "error: cache test failed"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["cache"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Return appropriate HTTP status code
    status_code = 200 if health_status["status"] == "healthy" else 503

    return JsonResponse(health_status, status=status_code)


def ping(request):
    """
    Simple ping endpoint for basic availability check.
    Returns 200 OK with minimal response.
    """
    return JsonResponse({"status": "ok", "message": "pong"})
