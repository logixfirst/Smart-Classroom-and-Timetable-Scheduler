"""
WebSocket consumers for real-time timetable generation progress
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class TimetableProgressConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for timetable generation progress updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        self.room_group_name = f'timetable_progress_{self.job_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"WebSocket connected for job {self.job_id}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected for job {self.job_id}")
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'ping')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
        except Exception as e:
            logger.error(f"Error receiving WebSocket message: {e}")
    
    async def progress_update(self, event):
        """Send progress update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'progress',
            'data': event['data']
        }))
