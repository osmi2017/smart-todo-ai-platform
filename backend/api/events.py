import logging
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Optional

from django.conf import settings
from django.db import transaction

from .models import Company, EventOutbox, User

logger = logging.getLogger(__name__)
_current_actor = ContextVar('event_actor', default=None)


@contextmanager
def event_actor(actor: User):
    token = _current_actor.set(actor)
    try:
        yield
    finally:
        _current_actor.reset(token)


def get_event_actor(fallback: Optional[User] = None) -> Optional[User]:
    return _current_actor.get() or fallback


class EventTypes:
    USER_REGISTERED = 'user.registered'
    USER_LOGGED_IN = 'user.logged_in'
    USER_LOGGED_OUT = 'user.logged_out'
    USER_CREATED = 'user.created'
    USER_ROLE_CHANGED = 'user.role_changed'
    COMPANY_CREATED = 'company.created'
    GROUP_CREATED = 'group.created'
    GROUP_MEMBER_ADDED = 'group.member_added'
    GROUP_MEMBER_REMOVED = 'group.member_removed'
    PROJECT_CREATED = 'project.created'
    PROJECT_UPDATED = 'project.updated'
    PROJECT_DELETED = 'project.deleted'
    TASK_CREATED = 'task.created'
    TASK_UPDATED = 'task.updated'
    TASK_ASSIGNED = 'task.assigned'
    TASK_UNASSIGNED = 'task.unassigned'
    TASK_STATUS_CHANGED = 'task.status_changed'
    TASK_COMPLETED = 'task.completed'
    TASK_DELETED = 'task.deleted'
    COMMENT_CREATED = 'comment.created'
    MEETING_CREATED = 'meeting.created'
    MEETING_UPDATED = 'meeting.updated'
    MEETING_STATUS_CHANGED = 'meeting.status_changed'
    MEETING_STARTED = 'meeting.started'
    MEETING_COMPLETED = 'meeting.completed'
    MEETING_CANCELLED = 'meeting.cancelled'
    MEETING_TRANSCRIPTION_REQUESTED = 'meeting.audio.transcription_requested'
    MEETING_AI_PROCESSING_REQUESTED = 'meeting.ai.processing_requested'
    FILE_UPLOADED = 'file.uploaded'
    FILE_SHARED = 'file.shared'
    FILE_DELETED = 'file.deleted'


def emit_event(
    event_type: str,
    aggregate_type: str,
    aggregate_id,
    payload: dict,
    actor: Optional[User] = None,
    company: Optional[Company] = None,
    schema_version: int = 1,
) -> EventOutbox:
    if company is None and actor is not None:
        company = actor.company

    event = EventOutbox.objects.create(
        event_type=event_type,
        aggregate_type=aggregate_type,
        aggregate_id=str(aggregate_id),
        company=company,
        company_id_snapshot=company.id if company else None,
        actor=actor,
        actor_id_snapshot=actor.id if actor else None,
        payload=payload,
        schema_version=schema_version,
    )

    if settings.KAFKA_ENABLED:
        transaction.on_commit(lambda: _dispatch_event(event.event_id))

    return event


def event_envelope(event: EventOutbox) -> dict:
    return {
        'specversion': '1.0',
        'id': str(event.event_id),
        'type': event.event_type,
        'source': settings.KAFKA_EVENT_SOURCE,
        'subject': f'{event.aggregate_type}/{event.aggregate_id}',
        'time': event.created_at.isoformat(),
        'datacontenttype': 'application/json',
        'schema_version': event.schema_version,
        'company_id': event.company_id_snapshot,
        'actor_id': event.actor_id_snapshot,
        'data': event.payload,
    }


def _dispatch_event(event_id) -> None:
    try:
        from .tasks import publish_domain_event

        publish_domain_event.delay(str(event_id))
    except Exception:
        logger.exception(
            'Kafka event %s remains in the outbox and will be retried by the sweeper',
            event_id,
        )
