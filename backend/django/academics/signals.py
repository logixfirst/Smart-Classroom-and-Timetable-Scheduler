"""Django signals for automatic cache invalidation"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Course, CourseOffering, Faculty, Room, Student
import redis
import os
import logging

logger = logging.getLogger(__name__)

# Connect to Redis
try:
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    redis_client = redis.from_url(redis_url, decode_responses=False)
except:
    redis_client = None
    logger.warning("Redis not available for cache invalidation")

def invalidate_cache(org_name: str):
    """Invalidate timetable data cache when data changes"""
    if not redis_client:
        return
    
    try:
        # Bump version for both semesters
        import time
        new_version = str(int(time.time()))
        for semester in [1, 2]:
            version_key = f"ttdata:version:{org_name}:{semester}"
            redis_client.setex(version_key, 86400, new_version)
        logger.info(f"[CACHE] Invalidated cache for {org_name}")
    except Exception as e:
        logger.warning(f"Cache invalidation failed: {e}")

@receiver([post_save, post_delete], sender=Course)
@receiver([post_save, post_delete], sender=CourseOffering)
@receiver([post_save, post_delete], sender=Student)
@receiver([post_save, post_delete], sender=Faculty)
@receiver([post_save, post_delete], sender=Room)
def invalidate_on_data_change(sender, instance, **kwargs):
    """Auto-invalidate cache when courses, enrollments, faculty, or rooms change"""
    try:
        # Get organization name from instance
        if hasattr(instance, 'org'):
            org_name = instance.org.org_name
        elif hasattr(instance, 'course') and hasattr(instance.course, 'org'):
            org_name = instance.course.org.org_name
        elif hasattr(instance, 'offering') and hasattr(instance.offering, 'course'):
            org_name = instance.offering.course.org.org_name
        else:
            return
        
        invalidate_cache(org_name)
    except Exception as e:
        logger.warning(f"Signal handler error: {e}")
