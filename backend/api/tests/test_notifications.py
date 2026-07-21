from datetime import timedelta

import jwt
import pytest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.test import override_settings
from django.utils import timezone

from api.models import Notification
from core.asgi import application


@pytest.mark.django_db
def test_notification_api_is_recipient_scoped(api_client, user, other_user, notification):
    Notification.objects.create(
        recipient=other_user,
        type='task_assigned',
        title='Other notification',
        message='Not visible to this user',
    )
    api_client.force_authenticate(user=user)

    response = api_client.get('/api/notifications/')

    assert response.status_code == 200
    assert [item['id'] for item in response.data] == [notification.id]


@pytest.mark.django_db
def test_notification_api_read_actions(api_client, user, notification):
    second = Notification.objects.create(
        recipient=user,
        type='task_completed',
        title='Completed',
        message='Task completed',
    )
    api_client.force_authenticate(user=user)

    count_response = api_client.get('/api/notifications/unread-count/')
    read_response = api_client.post(f'/api/notifications/{notification.id}/read/')
    remaining_response = api_client.get('/api/notifications/unread-count/')
    all_response = api_client.post('/api/notifications/mark-all-read/')

    assert count_response.data == {'count': 2}
    assert read_response.status_code == 200
    assert read_response.data['is_read'] is True
    assert remaining_response.data == {'count': 1}
    assert all_response.data == {'updated': 1}
    second.refresh_from_db()
    assert second.is_read is True


@pytest.mark.django_db
def test_notification_api_cannot_mark_another_users_notification(api_client, user, other_user):
    other_notification = Notification.objects.create(
        recipient=other_user,
        type='task_assigned',
        title='Other notification',
        message='Not visible to this user',
    )
    api_client.force_authenticate(user=user)

    response = api_client.post(f'/api/notifications/{other_notification.id}/read/')

    assert response.status_code == 404
    other_notification.refresh_from_db()
    assert other_notification.is_read is False


@override_settings(
    CHANNEL_LAYERS={
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
)
@pytest.mark.django_db(transaction=True)
def test_notification_websocket_authenticates_jwt_and_delivers_notification_id(user, notification):
    token = jwt.encode(
        {'user_id': user.id, 'exp': timezone.now() + timedelta(minutes=5)},
        settings.JWT_SECRET_KEY,
        algorithm='HS256',
    )

    async def scenario():
        communicator = WebsocketCommunicator(
            application,
            f'/ws/notifications/{user.id}/',
            subprotocols=['access_token', token],
        )
        connected, subprotocol = await communicator.connect()
        assert connected is True
        assert subprotocol == 'access_token'

        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'notifications_{user.id}',
            {
                'type': 'send_notification',
                'notification_id': notification.id,
                'notification_type': notification.type,
                'title': notification.title,
                'message': notification.message,
                'data': notification.data,
                'created_at': notification.created_at.isoformat(),
            },
        )
        payload = await communicator.receive_json_from(timeout=1)
        await communicator.disconnect()

        assert payload['id'] == notification.id
        assert payload['type'] == notification.type
        assert payload['is_read'] is False

    async_to_sync(scenario)()


@override_settings(
    CHANNEL_LAYERS={
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
)
@pytest.mark.django_db(transaction=True)
def test_notification_websocket_rejects_another_users_stream(user, other_user):
    token = jwt.encode(
        {'user_id': user.id, 'exp': timezone.now() + timedelta(minutes=5)},
        settings.JWT_SECRET_KEY,
        algorithm='HS256',
    )

    async def scenario():
        communicator = WebsocketCommunicator(
            application,
            f'/ws/notifications/{other_user.id}/',
            subprotocols=['access_token', token],
        )
        connected, _ = await communicator.connect()
        assert connected is False

    async_to_sync(scenario)()
