import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils.dateparse import parse_datetime

from .events import EventTypes
from .models import (
    Company,
    EventAuditLog,
    EventMetric,
    ProcessedEvent,
    User,
)
from .services.notifications import create_notification
from .tasks import process_meeting_ai, transcribe_meeting_audio

SUPPORTED_SERVICES = ('audit', 'statistics', 'notifications', 'audio', 'dashboard')


def _broadcast_dashboard_refresh(company_id, reason='update'):
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        group = f'dashboard_{company_id or "global"}'
        async_to_sync(channel_layer.group_send)(
            group,
            {
                'type': 'dashboard_refresh',
                'reason': reason,
            },
        )
    except Exception:
        import logging
        logging.getLogger(__name__).warning('Unable to push dashboard refresh', exc_info=True)


def handle_event(service: str, event: dict) -> bool:
    if service not in SUPPORTED_SERVICES:
        raise ValueError(f'Unsupported event service: {service}')

    event_id = uuid.UUID(event['id'])

    with transaction.atomic():
        try:
            with transaction.atomic():
                ProcessedEvent.objects.create(service=service, event_id=event_id)
        except IntegrityError:
            return False

        if service == 'audit':
            _handle_audit(event, event_id)
        elif service == 'statistics':
            _handle_statistics(event)
        elif service == 'notifications':
            _handle_notifications(event)
        elif service == 'audio':
            _handle_audio(event)
        elif service == 'dashboard':
            _handle_dashboard(event)

    return True


def _handle_audit(event: dict, event_id: uuid.UUID) -> None:
    company_id = event.get('company_id')
    actor_id = event.get('actor_id')
    if company_id and not Company.objects.filter(id=company_id).exists():
        company_id = None
    if actor_id and not User.objects.filter(id=actor_id).exists():
        actor_id = None

    EventAuditLog.objects.create(
        event_id=event_id,
        event_type=event['type'],
        aggregate_type=event['subject'].split('/', 1)[0],
        aggregate_id=event['subject'].split('/', 1)[1],
        company_id=company_id,
        actor_id=actor_id,
        payload=event.get('data', {}),
        occurred_at=parse_datetime(event['time']),
    )


def _handle_statistics(event: dict) -> None:
    occurred_at = parse_datetime(event['time'])
    company_id = event.get('company_id')
    tenant_key = str(company_id) if company_id is not None else 'global'
    if company_id and not Company.objects.filter(id=company_id).exists():
        company_id = None
    metric, created = EventMetric.objects.get_or_create(
        tenant_key=tenant_key,
        event_type=event['type'],
        date=occurred_at.date(),
        defaults={'company_id': company_id, 'count': 1},
    )
    if not created:
        EventMetric.objects.filter(id=metric.id).update(count=F('count') + 1)


def _handle_notifications(event: dict) -> None:
    data = event.get('data', {})
    event_type = event['type']

    if event_type == EventTypes.TASK_ASSIGNED:
        _notify_users(
            [data.get('assigned_to_id')],
            'task_assigned',
            'Nouvelle tâche assignée',
            f"La tâche « {data.get('title', '')} » vous a été assignée.",
            {'task_id': data.get('task_id'), 'project_id': data.get('project_id')},
        )
    elif event_type == EventTypes.TASK_COMPLETED:
        _notify_users(
            data.get('recipient_ids', []),
            'task_completed',
            'Tâche terminée',
            f"La tâche « {data.get('title', '')} » a été terminée.",
            {'task_id': data.get('task_id'), 'project_id': data.get('project_id')},
        )
    elif event_type == EventTypes.COMMENT_CREATED:
        _notify_users(
            [data.get('recipient_id')],
            'comment_added',
            'Nouveau commentaire',
            f"{data.get('author_name', 'Un utilisateur')} a commenté la tâche « {data.get('task_title', '')} ».",
            {'task_id': data.get('task_id'), 'comment_id': data.get('comment_id')},
        )
    elif event_type == EventTypes.PROJECT_CREATED:
        _notify_users(
            [data.get('owner_id')],
            'project_created',
            'Projet créé',
            f"Le projet « {data.get('name', '')} » a été créé.",
            {'project_id': data.get('project_id')},
        )
    elif event_type in (EventTypes.MEETING_STARTED, EventTypes.MEETING_COMPLETED):
        started = event_type == EventTypes.MEETING_STARTED
        _notify_users(
            data.get('participant_ids', []),
            'meeting_started' if started else 'meeting_completed',
            'Réunion démarrée' if started else 'Réunion terminée',
            f"La réunion « {data.get('title', '')} » a {'démarré' if started else 'été terminée'}.",
            {'meeting_id': data.get('meeting_id')},
        )


def _notify_users(recipient_ids: list, notification_type: str, title: str, message: str, data: dict) -> None:
    ids = {recipient_id for recipient_id in recipient_ids if recipient_id is not None}
    for recipient in User.objects.filter(id__in=ids):
        create_notification(recipient, notification_type, title, message, data)


def _handle_audio(event: dict) -> None:
    data = event.get('data', {})
    if event['type'] == EventTypes.MEETING_TRANSCRIPTION_REQUESTED:
        transcribe_meeting_audio.delay(data['meeting_id'], data.get('requested_by_id'))
    elif event['type'] == EventTypes.MEETING_AI_PROCESSING_REQUESTED:
        process_meeting_ai.delay(data['meeting_id'], data.get('requested_by_id'))


DASHBOARD_EVENTS = frozenset({
    EventTypes.TASK_CREATED,
    EventTypes.TASK_UPDATED,
    EventTypes.TASK_ASSIGNED,
    EventTypes.TASK_UNASSIGNED,
    EventTypes.TASK_STATUS_CHANGED,
    EventTypes.TASK_COMPLETED,
    EventTypes.TASK_DELETED,
    EventTypes.PROJECT_CREATED,
    EventTypes.PROJECT_UPDATED,
    EventTypes.PROJECT_DELETED,
    EventTypes.MEETING_CREATED,
    EventTypes.MEETING_UPDATED,
    EventTypes.MEETING_STATUS_CHANGED,
    EventTypes.MEETING_STARTED,
    EventTypes.MEETING_COMPLETED,
    EventTypes.MEETING_CANCELLED,
    EventTypes.COMMENT_CREATED,
    EventTypes.COMMENT_UPDATED,
    EventTypes.COMMENT_DELETED,
    EventTypes.FILE_UPLOADED,
    EventTypes.FILE_SHARED,
    EventTypes.FILE_DELETED,
})


def _handle_dashboard(event: dict) -> None:
    event_type = event['type']
    if event_type not in DASHBOARD_EVENTS:
        return

    reason = event_type.replace('.', '_')
    company_id = event.get('company_id')
    _broadcast_dashboard_refresh(company_id, reason=reason)
