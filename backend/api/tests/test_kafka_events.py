"""Tests pour le bus d'événements Kafka.

Aucun broker Kafka réel n'est nécessaire : le producteur est mocké (le
KafkaProducer réel n'est jamais instancié pendant les tests), et
KAFKA_EVENTS_ENABLED=False (settings_test.py) empêche toute tentative de
connexion réseau lors de l'exécution "naturelle" des tâches Celery
déclenchées par les vues/signaux.
"""
import uuid
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from api import events
from api.models import AuditEvent, Meeting, Task
from api.tasks import publish_kafka_event
from api.management.commands.consume_audit_events import process_message


# ---------------------------------------------------------------------------
# Construction de l'enveloppe d'événement
# ---------------------------------------------------------------------------

class TestBuildEvent:
    def test_event_has_required_envelope_fields(self):
        event = events.build_event('task_completed', {'task_id': 1})
        assert set(['event_id', 'event_type', 'occurred_at', 'source_service', 'payload']) <= set(event.keys())
        assert event['event_type'] == 'task_completed'
        assert event['payload'] == {'task_id': 1}
        # event_id doit être un UUID valide
        uuid.UUID(event['event_id'])

    def test_each_event_gets_a_unique_id(self):
        e1 = events.build_event('task_completed', {})
        e2 = events.build_event('task_completed', {})
        assert e1['event_id'] != e2['event_id']


# ---------------------------------------------------------------------------
# Tâche Celery de publication (avec producteur Kafka mocké)
# ---------------------------------------------------------------------------

class TestPublishKafkaEventTask:
    def test_skips_publish_when_kafka_disabled(self, settings):
        settings.KAFKA_EVENTS_ENABLED = False
        result = publish_kafka_event.apply(args=('topic', 'key', {'event_type': 'x'})).get()
        assert result == {'skipped': True, 'reason': 'kafka_disabled'}

    def test_publishes_and_waits_for_broker_ack(self, settings):
        settings.KAFKA_EVENTS_ENABLED = True

        fake_metadata = MagicMock(topic='smarttodo.tasks.events', partition=0, offset=42)
        fake_future = MagicMock()
        fake_future.get.return_value = fake_metadata
        fake_producer = MagicMock()
        fake_producer.send.return_value = fake_future

        with patch('api.events.get_producer', return_value=fake_producer):
            result = publish_kafka_event.apply(
                args=('smarttodo.tasks.events', '123', {'event_type': 'task_completed', 'event_id': 'abc'})
            ).get()

        fake_producer.send.assert_called_once()
        called_args, called_kwargs = fake_producer.send.call_args
        assert called_args[0] == 'smarttodo.tasks.events'
        assert called_kwargs['key'] == '123'
        assert result['offset'] == 42


# ---------------------------------------------------------------------------
# Déclenchement métier (les vues/signaux appellent bien .delay() avec le bon
# topic/clé/événement, sans jamais toucher réellement Kafka)
# ---------------------------------------------------------------------------

class TestEventEmissionTriggers:
    def test_meeting_start_action_emits_meeting_started(self, api_client, user, project, other_user):
        meeting = Meeting.objects.create(
            title='Weekly sync', status='scheduled', organizer=user, project=project,
        )
        api_client.force_authenticate(user=user)

        with patch('api.tasks.publish_kafka_event') as mock_task:
            response = api_client.post(f'/api/meetings/{meeting.id}/start/')

        assert response.status_code == 200
        meeting.refresh_from_db()
        assert meeting.status == 'in_progress'
        assert meeting.started_at is not None

        mock_task.delay.assert_called_once()
        topic, key, event = mock_task.delay.call_args[0]
        assert topic == events.TOPIC_MEETINGS
        assert key == str(meeting.id)
        assert event['event_type'] == events.EVENT_MEETING_STARTED
        assert event['payload']['meeting_id'] == meeting.id

    def test_meeting_cannot_be_started_twice(self, api_client, user, project):
        meeting = Meeting.objects.create(
            title='Already running', status='in_progress', organizer=user, project=project,
            started_at=timezone.now(),
        )
        api_client.force_authenticate(user=user)
        with patch('api.tasks.publish_kafka_event'):
            response = api_client.post(f'/api/meetings/{meeting.id}/start/')
        assert response.status_code == 400

    def test_task_completion_emits_task_completed_event(self, db, project, user):
        task = Task.objects.create(
            title='Ship feature', project=project, status='todo',
            assigned_to=user, created_by=user,
        )
        with patch('api.signals.emit_task_completed') as mock_emit:
            task.status = 'completed'
            task.save()

        mock_emit.assert_called_once_with(task)

    def test_task_save_without_status_change_does_not_emit(self, db, project, user):
        task = Task.objects.create(
            title='Ship feature', project=project, status='completed',
            assigned_to=user, created_by=user,
        )
        with patch('api.signals.emit_task_completed') as mock_emit:
            task.description = 'updated description'
            task.save()

        mock_emit.assert_not_called()

    def test_login_emits_user_connected_event(self, api_client, user):
        with patch('api.views.emit_user_connected') as mock_emit:
            response = api_client.post('/api/auth/login/', {
                'username': user.username, 'password': 'testpass123',
            })
        assert response.status_code == 200
        mock_emit.assert_called_once()
        called_user = mock_emit.call_args[0][0]
        assert called_user.id == user.id

    def test_failed_login_does_not_emit_event(self, api_client, user):
        with patch('api.views.emit_user_connected') as mock_emit:
            response = api_client.post('/api/auth/login/', {
                'username': user.username, 'password': 'wrong-password',
            })
        assert response.status_code == 400
        mock_emit.assert_not_called()


# ---------------------------------------------------------------------------
# Consommateur d'audit — logique de traitement des messages (sans broker réel)
# ---------------------------------------------------------------------------

class TestAuditConsumerProcessing:
    def test_process_message_creates_audit_event(self, db):
        event = events.build_event('meeting_started', {'meeting_id': 5}, source_service='backend')
        audit_event = process_message(events.TOPIC_MEETINGS, '5', event)

        assert audit_event is not None
        stored = AuditEvent.objects.get(event_id=event['event_id'])
        assert stored.event_type == 'meeting_started'
        assert stored.topic == events.TOPIC_MEETINGS
        assert stored.payload == {'meeting_id': 5}

    def test_process_message_is_idempotent_on_duplicate_event_id(self, db):
        event = events.build_event('task_completed', {'task_id': 9})
        first = process_message(events.TOPIC_TASKS, '9', event)
        second = process_message(events.TOPIC_TASKS, '9', event)

        assert first is not None
        assert second is None  # déjà consommé, pas de doublon
        assert AuditEvent.objects.filter(event_id=event['event_id']).count() == 1

    def test_process_message_ignores_event_without_id(self, db):
        result = process_message(events.TOPIC_USERS, '1', {'event_type': 'user_connected', 'payload': {}})
        assert result is None
        assert AuditEvent.objects.count() == 0
