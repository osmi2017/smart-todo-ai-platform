import base64
import json

import pytest
from django.db import transaction
from rest_framework.test import APIClient

from api import event_handlers, kafka_client
from api.event_handlers import handle_event
from api.events import EventTypes, emit_event, event_envelope
from api.models import EventAuditLog, EventMetric, EventOutbox, Notification, ProcessedEvent
from api.tasks import publish_domain_event


@pytest.mark.django_db
def test_emit_event_creates_tenant_scoped_cloud_event(company, user):
    event = emit_event(
        EventTypes.USER_LOGGED_IN,
        'user',
        user.id,
        {'user_id': user.id, 'username': user.username},
        actor=user,
        company=company,
    )

    envelope = event_envelope(event)
    assert event.status == 'pending'
    assert envelope['specversion'] == '1.0'
    assert envelope['id'] == str(event.event_id)
    assert envelope['type'] == EventTypes.USER_LOGGED_IN
    assert envelope['subject'] == f'user/{user.id}'
    assert envelope['company_id'] == company.id
    assert envelope['actor_id'] == user.id
    assert envelope['data']['username'] == user.username


@pytest.mark.django_db
def test_outbox_event_rolls_back_with_business_transaction(company, user):
    with pytest.raises(RuntimeError):
        with transaction.atomic():
            emit_event(
                EventTypes.USER_LOGGED_IN,
                'user',
                user.id,
                {'user_id': user.id},
                actor=user,
                company=company,
            )
            raise RuntimeError('rollback')

    assert not EventOutbox.objects.filter(event_type=EventTypes.USER_LOGGED_IN).exists()


@pytest.mark.django_db
def test_logout_endpoint_emits_event(user):
    client = APIClient()
    login = client.post('/api/auth/login/', {'username': user.username, 'password': 'testpass123'})
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['token']}")
    EventOutbox.objects.all().delete()

    response = client.post('/api/auth/logout/')

    assert response.status_code == 200
    event = EventOutbox.objects.get(event_type=EventTypes.USER_LOGGED_OUT)
    assert event.aggregate_id == str(user.id)
    assert event.company_id_snapshot == user.company_id
    assert event.actor_id_snapshot == user.id


@pytest.mark.django_db
def test_task_signals_publish_created_assigned_and_completed_events(task):
    created_types = set(
        EventOutbox.objects.filter(aggregate_type='task', aggregate_id=str(task.id))
        .values_list('event_type', flat=True)
    )
    assert EventTypes.TASK_CREATED in created_types
    assert EventTypes.TASK_ASSIGNED in created_types

    EventOutbox.objects.filter(aggregate_type='task', aggregate_id=str(task.id)).delete()
    task.status = 'completed'
    task.save(update_fields=['status'])

    completed_types = set(
        EventOutbox.objects.filter(aggregate_type='task', aggregate_id=str(task.id))
        .values_list('event_type', flat=True)
    )
    assert completed_types == {EventTypes.TASK_STATUS_CHANGED, EventTypes.TASK_COMPLETED}


@pytest.mark.django_db
def test_audit_consumer_is_idempotent(company, user):
    event = emit_event(
        EventTypes.USER_LOGGED_IN,
        'user',
        user.id,
        {'user_id': user.id},
        actor=user,
        company=company,
    )
    envelope = event_envelope(event)

    assert handle_event('audit', envelope) is True
    assert handle_event('audit', envelope) is False
    assert EventAuditLog.objects.filter(event_id=event.event_id).count() == 1
    assert ProcessedEvent.objects.filter(service='audit', event_id=event.event_id).count() == 1


@pytest.mark.django_db
def test_statistics_consumer_counts_each_event_once(company, user):
    first = emit_event(
        EventTypes.TASK_COMPLETED,
        'task',
        '1',
        {'task_id': 1},
        actor=user,
        company=company,
    )
    second = emit_event(
        EventTypes.TASK_COMPLETED,
        'task',
        '2',
        {'task_id': 2},
        actor=user,
        company=company,
    )

    assert handle_event('statistics', event_envelope(first)) is True
    assert handle_event('statistics', event_envelope(first)) is False
    assert handle_event('statistics', event_envelope(second)) is True

    metric = EventMetric.objects.get(
        tenant_key=str(company.id),
        event_type=EventTypes.TASK_COMPLETED,
        date=first.created_at.date(),
    )
    metric.refresh_from_db()
    assert metric.count == 2


@pytest.mark.django_db
def test_notification_consumer_is_idempotent(company, user, project):
    event = emit_event(
        EventTypes.TASK_ASSIGNED,
        'task',
        '42',
        {
            'task_id': 42,
            'title': 'Kafka task',
            'project_id': project.id,
            'assigned_to_id': user.id,
        },
        actor=user,
        company=company,
    )
    envelope = event_envelope(event)

    assert handle_event('notifications', envelope) is True
    assert handle_event('notifications', envelope) is False
    assert Notification.objects.filter(
        recipient=user,
        type='task_assigned',
        data__task_id=42,
    ).count() == 1


@pytest.mark.django_db
def test_audio_consumer_dispatches_heavy_task(company, user, monkeypatch):
    dispatched = []
    monkeypatch.setattr(
        event_handlers.transcribe_meeting_audio,
        'delay',
        lambda meeting_id, requested_by_id: dispatched.append((meeting_id, requested_by_id)),
    )
    event = emit_event(
        EventTypes.MEETING_TRANSCRIPTION_REQUESTED,
        'meeting',
        '42',
        {'meeting_id': 42, 'requested_by_id': user.id},
        actor=user,
        company=company,
    )

    assert handle_event('audio', event_envelope(event)) is True
    assert handle_event('audio', event_envelope(event)) is False
    assert dispatched == [(42, user.id)]


@pytest.mark.django_db
def test_kafka_producer_uses_tenant_key_and_event_headers(company, user, monkeypatch):
    event = emit_event(
        EventTypes.USER_LOGGED_IN,
        'user',
        user.id,
        {'user_id': user.id},
        actor=user,
        company=company,
    )

    class FakeProducer:
        def __init__(self):
            self.message = None

        def produce(self, **kwargs):
            self.message = kwargs
            kwargs['on_delivery'](None, None)

        def flush(self, _timeout):
            return 0

    producer = FakeProducer()
    monkeypatch.setattr(kafka_client, 'get_producer', lambda: producer)

    kafka_client.publish_outbox_event(event)

    assert producer.message['key'] == str(company.id).encode('utf-8')
    assert producer.message['headers']['event_type'] == EventTypes.USER_LOGGED_IN
    payload = json.loads(producer.message['value'].decode('utf-8'))
    assert payload['id'] == str(event.event_id)
    assert payload['company_id'] == company.id


def test_dead_letter_publisher_preserves_failed_message(settings, monkeypatch):
    produced = {}

    class FakeProducer:
        def produce(self, **kwargs):
            produced.update(kwargs)
            kwargs['on_delivery'](None, None)

        def flush(self, _timeout):
            return 0

    settings.KAFKA_DEAD_LETTER_TOPIC = 'events.dlq'
    monkeypatch.setattr(kafka_client, 'get_producer', lambda: FakeProducer())
    original = b'{"id":"event-1"}'

    kafka_client.publish_dead_letter('audit', original, 'invalid schema')

    payload = json.loads(produced['value'].decode('utf-8'))
    assert produced['topic'] == 'events.dlq'
    assert payload['service'] == 'audit'
    assert payload['error'] == 'invalid schema'
    assert base64.b64decode(payload['original_message_base64']) == original


@pytest.mark.django_db
def test_publish_task_marks_outbox_event_published(company, user, settings, monkeypatch):
    event = emit_event(
        EventTypes.USER_LOGGED_IN,
        'user',
        user.id,
        {'user_id': user.id},
        actor=user,
        company=company,
    )
    settings.KAFKA_ENABLED = True
    monkeypatch.setattr(kafka_client, 'publish_outbox_event', lambda _event: None)

    result = publish_domain_event.apply(args=[str(event.event_id)], throw=True).result

    event.refresh_from_db()
    assert result['status'] == 'published'
    assert event.status == 'published'
    assert event.published_at is not None
    assert event.attempts == 1
