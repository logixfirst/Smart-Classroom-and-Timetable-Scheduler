"""
Celery configuration for ERP project
"""
import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')

# Create Celery app
app = Celery('erp')

# Load config from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks(['academics'])

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
