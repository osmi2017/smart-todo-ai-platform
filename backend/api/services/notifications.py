import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from api.models import Notification, User

logger = logging.getLogger(__name__)


def push_realtime_notification(
    recipient_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
) -> None:
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            f'notifications_{recipient_id}',
            {
                'type': 'send_notification',
                'notification_type': notification_type,
                'title': title,
                'message': message,
                'data': data or {},
                'created_at': timezone.now().isoformat(),
            },
        )
    except Exception:
        logger.warning('Unable to push WebSocket notification', exc_info=True)


def create_notification(
    recipient: User,
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
) -> Notification:
    notification = Notification.objects.create(
        recipient=recipient,
        type=notification_type,
        title=title,
        message=message,
        data=data or {},
    )
    push_realtime_notification(
        recipient.id,
        notification_type,
        title,
        message,
        data,
    )
    return notification
