import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Notification

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'notifications_{self.user_id}'

        # Vérifier l'authentification
        if self.scope['user'].is_authenticated and self.scope['user'].id == self.user_id:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept(subprotocol=self.scope.get('jwt_subprotocol'))
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON via WebSocket from user %s", self.user_id)
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON',
            }))
            return

        action = data.get('action')

        if action == 'mark_read':
            notification_id = data.get('notification_id')
            if notification_id is None:
                await self.send(text_data=json.dumps({
                    'error': 'notification_id is required',
                }))
                return
            success = await self.mark_notification_read(notification_id)
            await self.send(text_data=json.dumps({
                'action': 'mark_read',
                'notification_id': notification_id,
                'success': success,
            }))
        else:
            await self.send(text_data=json.dumps({
                'error': f'Unknown action: {action}',
            }))

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=self.scope['user'])
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            logger.warning(
                "Notification %s not found for user %s",
                notification_id, self.scope['user'].id,
            )
            return False

    async def send_notification(self, event):
        await self.send(text_data=json.dumps({
            'id': event.get('notification_id'),
            'type': event['notification_type'],
            'title': event['title'],
            'message': event['message'],
            'data': event.get('data', {}),
            'is_read': False,
            'created_at': event['created_at'],
        }))
