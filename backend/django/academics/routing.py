"""
WebSocket URL routing
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/timetable/progress/(?P<job_id>[^/]+)/$', consumers.TimetableProgressConsumer.as_asgi()),
]
