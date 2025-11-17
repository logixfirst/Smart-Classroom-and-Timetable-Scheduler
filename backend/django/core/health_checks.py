"""
Health Check Endpoints - Monitor system health
Add to erp/urls.py
"""
import time

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """
    Comprehensive health check endpoint
    Returns status of all critical services
    """
    health_status = {"status": "healthy", "timestamp": time.time(), "services": {}}

    # Check Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_status["services"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful",
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": str(e),
        }

    # Check Redis Cache
    try:
        cache_key = "health_check_test"
        cache.set(cache_key, "test_value", timeout=10)
        value = cache.get(cache_key)
        cache.delete(cache_key)

        if value == "test_value":
            health_status["services"]["cache"] = {
                "status": "healthy",
                "message": "Redis cache working",
            }
        else:
            health_status["status"] = "degraded"
            health_status["services"]["cache"] = {
                "status": "degraded",
                "message": "Cache read/write mismatch",
            }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["cache"] = {"status": "unhealthy", "message": str(e)}

    # Check Sentry (if configured)
    if hasattr(settings, "SENTRY_DSN") and settings.SENTRY_DSN:
        health_status["services"]["sentry"] = {
            "status": "configured",
            "message": "Error tracking enabled",
        }
    else:
        health_status["services"]["sentry"] = {
            "status": "not_configured",
            "message": "Sentry not configured",
        }

    # Return appropriate HTTP status code
    status_code = 200
    if health_status["status"] == "unhealthy":
        status_code = 503
    elif health_status["status"] == "degraded":
        status_code = 200  # Still operational but degraded

    return JsonResponse(health_status, status=status_code)


def liveness_probe(request):
    """
    Kubernetes liveness probe
    Returns 200 if application is alive
    """
    return JsonResponse({"status": "alive"}, status=200)


def readiness_probe(request):
    """
    Kubernetes readiness probe
    Returns 200 if application is ready to serve traffic
    """
    ready = True
    services = {}

    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        services["database"] = "ready"
    except Exception as e:
        ready = False
        services["database"] = f"not_ready: {str(e)}"

    # Check cache
    try:
        cache.get("readiness_check")
        services["cache"] = "ready"
    except Exception as e:
        ready = False
        services["cache"] = f"not_ready: {str(e)}"

    if ready:
        return JsonResponse({"status": "ready", "services": services}, status=200)
    else:
        return JsonResponse({"status": "not_ready", "services": services}, status=503)


def metrics(request):
    """
    Prometheus-style metrics endpoint
    Returns application metrics
    """
    from academics.models import Department, Faculty, Student
    from django.contrib.auth import get_user_model

    User = get_user_model()

    metrics_data = {
        "# HELP total_users Total number of users",
        "# TYPE total_users gauge",
        f"total_users {User.objects.count()}",
        "",
        "# HELP total_students Total number of students",
        "# TYPE total_students gauge",
        f"total_students {Student.objects.count()}",
        "",
        "# HELP total_faculty Total number of faculty",
        "# TYPE total_faculty gauge",
        f"total_faculty {Faculty.objects.count()}",
        "",
        "# HELP total_departments Total number of departments",
        "# TYPE total_departments gauge",
        f"total_departments {Department.objects.count()}",
        "",
    }

    # Cache metrics
    try:
        cache_info = cache._cache.info() if hasattr(cache._cache, "info") else {}
        if cache_info:
            metrics_data.extend(
                [
                    "# HELP cache_hits Total cache hits",
                    "# TYPE cache_hits counter",
                    f"cache_hits {cache_info.get('keyspace_hits', 0)}",
                    "",
                    "# HELP cache_misses Total cache misses",
                    "# TYPE cache_misses counter",
                    f"cache_misses {cache_info.get('keyspace_misses', 0)}",
                    "",
                ]
            )
    except Exception:
        pass

    return JsonResponse("\n".join(metrics_data), content_type="text/plain", safe=False)
