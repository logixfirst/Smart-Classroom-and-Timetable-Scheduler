"""Clear stuck generation jobs"""

import os
import sys
import django

# Add Django project to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "django"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "erp.settings")

django.setup()

from academics.models import GenerationJob

# Find stuck jobs
stuck_jobs = GenerationJob.objects.filter(status__in=["pending", "running"])
count = stuck_jobs.count()

print(f"Found {count} stuck jobs")

if count > 0:
    # Clear them
    stuck_jobs.update(status="failed", error_message="Manually cleared - stuck job")
    print(f"✅ Cleared {count} stuck jobs")
else:
    print("✅ No stuck jobs found")

# Also clear Redis cache
try:
    from django.core.cache import cache

    cache.clear()
    print("✅ Cleared Redis cache")
except Exception as e:
    print(f"⚠️ Could not clear cache: {e}")
