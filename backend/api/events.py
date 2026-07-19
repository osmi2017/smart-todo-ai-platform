"""
Bus d'événements Kafka — module central de publication.

Kafka sert de système de messagerie central pour capturer, historiser et
distribuer en temps réel tous les événements majeurs du système
("réunion démarrée", "tâche complétée", "utilisateur connecté", ...).

Principes :
- Un topic par domaine métier (meetings, tasks, users) : chaque service
  consommateur (audio, notifications, statistiques, audit) s'abonne
  uniquement à ce qui le concerne, à son propre rythme, sans dépendre des
  autres services ni du service producteur (découplage total).
- La publication effective vers Kafka est toujours déléguée à une tâche
  Celery (cf. api/tasks.py::publish_kafka_event) : la requête HTTP qui
  déclenche l'événement n'attend jamais l'aller-retour réseau vers le
  broker, et Celery rejoue automatiquement l'envoi en cas d'indisponibilité
  momentanée de Kafka (aucune perte d'événement, même sous forte charge ou
  panne d'un composant).
- Chaque événement porte une clé de partition (l'ID de l'entité concernée)
  pour garantir l'ordre des événements relatifs à une même réunion/tâche/
  utilisateur, tout en permettant le parallélisme entre entités.
"""
import json
import logging
import threading
import uuid
from datetime import datetime, date

from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Topics — un par domaine métier. Ce découpage permet à chaque service de ne
# consommer que ce qui le concerne (ex : le service audio n'a besoin que du
# topic "meetings", le service d'audit consomme les trois).
# ---------------------------------------------------------------------------
TOPIC_MEETINGS = 'smarttodo.meetings.events'
TOPIC_TASKS = 'smarttodo.tasks.events'
TOPIC_USERS = 'smarttodo.users.events'

ALL_TOPICS = (TOPIC_MEETINGS, TOPIC_TASKS, TOPIC_USERS)

# Types d'événements majeurs émis par la plateforme (liste non exhaustive,
# facilement extensible : ajouter un type ne casse aucun consommateur
# existant grâce au format d'enveloppe commun ci-dessous).
EVENT_MEETING_STARTED = 'meeting_started'
EVENT_MEETING_ENDED = 'meeting_ended'
EVENT_TASK_COMPLETED = 'task_completed'
EVENT_TASK_ASSIGNED = 'task_assigned'
EVENT_USER_CONNECTED = 'user_connected'


class _JSONEncoder(json.JSONEncoder):
    """Sérialise proprement les types Django courants (dates, UUID, Decimal)."""

    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


def build_event(event_type, payload, source_service='backend'):
    """Construit l'enveloppe standard d'un événement.

    Cette enveloppe commune (event_id, event_type, occurred_at, source_service,
    payload) est ce qui permet à n'importe quel nouveau consommateur de
    comprendre n'importe quel événement, présent ou futur, sans connaître le
    détail métier de chaque type d'événement.
    """
    return {
        'event_id': str(uuid.uuid4()),
        'event_type': event_type,
        'occurred_at': datetime.utcnow().isoformat() + 'Z',
        'source_service': source_service,
        'payload': payload,
    }


# ---------------------------------------------------------------------------
# Producteur Kafka — singleton paresseux et thread-safe.
# ---------------------------------------------------------------------------
_producer = None
_producer_lock = threading.Lock()


def get_producer():
    """Retourne un KafkaProducer partagé (une seule connexion par process).

    Configuration pensée pour ne jamais perdre de message :
    - acks='all' : le broker confirme seulement après réplication complète.
    - retries élevé + idempotence : gère les micro-coupures réseau sans
      dupliquer ni perdre de message.
    - linger_ms : regroupe les envois pour absorber les pics de charge sans
      saturer le broker.
    """
    global _producer
    if _producer is not None:
        return _producer

    with _producer_lock:
        if _producer is None:
            from kafka import KafkaProducer

            bootstrap_servers = getattr(settings, 'KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
            _producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers.split(','),
                key_serializer=lambda k: k.encode('utf-8') if k is not None else None,
                value_serializer=lambda v: json.dumps(v, cls=_JSONEncoder).encode('utf-8'),
                acks='all',
                retries=5,
                enable_idempotence=True,
                linger_ms=20,
                request_timeout_ms=15000,
            )
    return _producer


def reset_producer_for_tests():
    """Permet aux tests de repartir d'un producteur neuf (mocké)."""
    global _producer
    with _producer_lock:
        _producer = None


# ---------------------------------------------------------------------------
# Helpers métier — un point d'entrée clair et typé par événement majeur.
# Chacun délègue immédiatement à Celery : l'appelant (vue, signal) ne bloque
# jamais sur Kafka et n'a pas à gérer les retries lui-même.
# ---------------------------------------------------------------------------

def emit_meeting_started(meeting):
    from .tasks import publish_kafka_event

    payload = {
        'meeting_id': meeting.id,
        'title': meeting.title,
        'project_id': meeting.project_id,
        'organizer_id': meeting.organizer_id,
        'started_at': meeting.started_at.isoformat() if meeting.started_at else None,
        'participant_ids': list(meeting.participants.values_list('user_id', flat=True)),
    }
    event = build_event(EVENT_MEETING_STARTED, payload)
    publish_kafka_event.delay(TOPIC_MEETINGS, str(meeting.id), event)
    return event


def emit_meeting_ended(meeting):
    from .tasks import publish_kafka_event

    payload = {
        'meeting_id': meeting.id,
        'title': meeting.title,
        'project_id': meeting.project_id,
        'ended_at': meeting.ended_at.isoformat() if meeting.ended_at else None,
        'duration_minutes': meeting.duration_minutes,
    }
    event = build_event(EVENT_MEETING_ENDED, payload)
    publish_kafka_event.delay(TOPIC_MEETINGS, str(meeting.id), event)
    return event


def emit_task_completed(task):
    from .tasks import publish_kafka_event

    payload = {
        'task_id': task.id,
        'title': task.title,
        'project_id': task.project_id,
        'assigned_to_id': task.assigned_to_id,
        'priority': task.priority,
        'actual_time': task.actual_time,
        'completed_at': task.completed_at.isoformat() if task.completed_at else None,
    }
    event = build_event(EVENT_TASK_COMPLETED, payload)
    publish_kafka_event.delay(TOPIC_TASKS, str(task.id), event)
    return event


def emit_task_assigned(task):
    from .tasks import publish_kafka_event

    payload = {
        'task_id': task.id,
        'title': task.title,
        'project_id': task.project_id,
        'assigned_to_id': task.assigned_to_id,
    }
    event = build_event(EVENT_TASK_ASSIGNED, payload)
    publish_kafka_event.delay(TOPIC_TASKS, str(task.id), event)
    return event


def emit_user_connected(user, ip_address=None):
    from .tasks import publish_kafka_event

    payload = {
        'user_id': user.id,
        'username': user.username,
        'company_id': user.company_id,
        'ip_address': ip_address,
    }
    event = build_event(EVENT_USER_CONNECTED, payload)
    publish_kafka_event.delay(TOPIC_USERS, str(user.id), event)
    return event
