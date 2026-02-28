"""Django signals for automatic Redis cache invalidation.

Architecture (write-through invalidation pattern):
  1. Admin saves Course/Faculty/Room/Student via Django → signal fires
  2. Signal deletes the affected Redis cache keys immediately
  3. FastAPI reads Redis → MISS → re-fetches from DB → writes to Redis
  4. Subsequent generation jobs read from Redis (instant, ~1ms)

Critical bug fixed: previously `invalidate_cache(org_name)` was called, but
FastAPI's CacheManager keys data by org_id (UUID), so the version keys set by
signals were never read.  Now we use `instance.organization.pk` (the UUID).
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Course, CourseOffering, Faculty, Room, Student
import redis
import os
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis connection (module-level singleton, non-blocking on failure)
# ---------------------------------------------------------------------------
try:
    _redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    _redis_kwargs: dict = {"decode_responses": True}
    if _redis_url.startswith("rediss://"):
        _redis_kwargs["ssl_cert_reqs"] = "none"
    _redis_client = redis.from_url(_redis_url, **_redis_kwargs)
    _redis_client.ping()
    logger.info("[SIGNAL] Redis connected for cache invalidation")
except Exception as _exc:
    _redis_client = None
    logger.warning("[SIGNAL] Redis unavailable — cache invalidation disabled: %s", _exc)


def _delete_org_cache(org_id: str) -> None:
    """Delete all FastAPI data-cache keys for one organisation.

    Called whenever any timetable-relevant record changes.  Uses Redis SCAN
    (not KEYS) to avoid blocking the server on large key spaces.

    Cache key format used by FastAPI CacheManager:
        {resource_type}:{org_id}[:{extra_params}]
    e.g.  courses:abc-uuid:semester:1
          faculty:abc-uuid
          rooms:abc-uuid
          students:abc-uuid
     Also bumps the version key so fetch_courses() detects the invalidation:
          ttdata:version:{org_id}:{semester}
    """
    if not _redis_client:
        return

    import time

    try:
        # Patterns for every cache type FastAPI stores per org
        patterns = [
            f"courses:{org_id}:*",
            f"faculty:{org_id}*",
            f"rooms:{org_id}*",
            f"students:{org_id}*",
            f"config:{org_id}*",
            f"departments:{org_id}*",
        ]

        deleted = 0
        for pattern in patterns:
            keys = list(_redis_client.scan_iter(match=pattern, count=100))
            if keys:
                _redis_client.delete(*keys)
                deleted += len(keys)

        # Bump version key so fetch_courses() version-check sees the change
        new_version = str(int(time.time()))
        for semester in (1, 2):
            _redis_client.setex(
                f"ttdata:version:{org_id}:{semester}",
                86400,
                new_version,
            )

        logger.info(
            "[SIGNAL] Cache invalidated",
            extra={"org_id": org_id, "keys_deleted": deleted, "new_version": new_version},
        )

    except Exception as exc:
        # Never let a cache error break the Django save operation
        logger.warning(
            "[SIGNAL] Cache invalidation error (non-fatal)",
            extra={"org_id": org_id, "error": str(exc)},
        )


def _extract_org_id(instance) -> str | None:
    """Safely extract org_id (UUID string) from any model instance.

    All academics models have an `organization` FK whose pk is the org_id UUID.
    CourseOffering may be reached via its course's org.
    """
    try:
        if hasattr(instance, 'organization_id') and instance.organization_id:
            return str(instance.organization_id)
        if hasattr(instance, 'org') and instance.org:
            return str(instance.org.pk)
        if hasattr(instance, 'course') and hasattr(instance.course, 'organization_id'):
            return str(instance.course.organization_id)
        if hasattr(instance, 'offering') and hasattr(instance.offering, 'course'):
            return str(instance.offering.course.organization_id)
    except Exception as exc:
        logger.warning("[SIGNAL] Could not extract org_id: %s", exc)
    return None


@receiver([post_save, post_delete], sender=Course)
@receiver([post_save, post_delete], sender=CourseOffering)
@receiver([post_save, post_delete], sender=Student)
@receiver([post_save, post_delete], sender=Faculty)
@receiver([post_save, post_delete], sender=Room)
def invalidate_on_data_change(sender, instance, **kwargs):
    """Invalidate Redis timetable-data cache when any relevant record changes.

    Fires on every save/delete for Course, CourseOffering, Student, Faculty,
    Room.  Extracts the org_id UUID and deletes the corresponding Redis keys.
    FastAPI will re-fetch from DB on the next generation request.
    """
    org_id = _extract_org_id(instance)
    if org_id:
        _delete_org_cache(org_id)
    else:
        logger.warning(
            "[SIGNAL] org_id not found for %s pk=%s — skipping cache invalidation",
            sender.__name__,
            getattr(instance, 'pk', '?'),
        )

