from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Task, Comment, Project, Notification
from .events import emit_task_completed
from datetime import date

# Vérifier si channels est disponible
try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    CHANNELS_AVAILABLE = True
except ImportError:
    CHANNELS_AVAILABLE = False

# Vérifier si Redis est disponible
try:
    import redis
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    r.ping()
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False

def send_websocket_notification(recipient_id, notification_type, title, message, data=None):
    """Envoie une notification WebSocket si disponible"""
    if CHANNELS_AVAILABLE and REDIS_AVAILABLE:
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'notifications_{recipient_id}',
                {
                    'type': 'send_notification',
                    'notification_type': notification_type,
                    'title': title,
                    'message': message,
                    'data': data or {},
                }
            )
        except Exception as e:
            print(f"⚠️ Erreur WebSocket: {e}")

@receiver(pre_save, sender=Task)
def task_track_previous_status(sender, instance, **kwargs):
    """Mémorise le statut précédent avant sauvegarde, pour ne détecter la
    transition vers 'completed' qu'une seule fois (et non à chaque save())."""
    if instance.pk:
        previous = Task.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
        instance._previous_status = previous
    else:
        instance._previous_status = None


@receiver(post_save, sender=Task)
def task_completed_event(sender, instance, created, **kwargs):
    """Publie l'événement Kafka 'task_completed' uniquement lors de la
    transition réelle vers 'completed', jamais sur les sauvegardes suivantes
    (idempotence côté producteur)."""
    previous_status = getattr(instance, '_previous_status', None)
    if not created and previous_status != 'completed' and instance.status == 'completed':
        emit_task_completed(instance)


@receiver(post_save, sender=Task)
def publish_task_events(sender, instance, created, **kwargs):
    actor = get_event_actor(instance.created_by)
    company = instance.project.company
    base_payload = {
        'task_id': instance.id,
        'title': instance.title,
        'project_id': instance.project_id,
        'status': instance.status,
        'assigned_to_id': instance.assigned_to_id,
    }

    if created:
        emit_event(
            EventTypes.TASK_CREATED,
            'task',
            instance.id,
            base_payload,
            actor=actor,
            company=company,
        )
        if instance.assigned_to_id:
            emit_event(
                EventTypes.TASK_ASSIGNED,
                'task',
                instance.id,
                base_payload,
                actor=actor,
                company=company,
            )
        return

    previous_status = instance._previous_status
    previous_assigned_to_id = instance._previous_assigned_to_id
    if previous_status and previous_status != instance.status:
        status_payload = {
            **base_payload,
            'previous_status': previous_status,
            'new_status': instance.status,
        }
        emit_event(
            EventTypes.TASK_STATUS_CHANGED,
            'task',
            instance.id,
            status_payload,
            actor=actor,
            company=company,
        )
        if instance.status == 'completed':
            recipient_ids = {
                instance.created_by_id,
                instance.project.owner_id,
                instance.assigned_to_id,
            }
            status_payload['recipient_ids'] = [recipient_id for recipient_id in recipient_ids if recipient_id]
            emit_event(
                EventTypes.TASK_COMPLETED,
                'task',
                instance.id,
                status_payload,
                actor=actor,
                company=company,
            )

    if previous_assigned_to_id != instance.assigned_to_id:
        assignment_type = EventTypes.TASK_ASSIGNED if instance.assigned_to_id else EventTypes.TASK_UNASSIGNED
        emit_event(
            assignment_type,
            'task',
            instance.id,
            {**base_payload, 'previous_assigned_to_id': previous_assigned_to_id},
            actor=actor,
            company=company,
        )


@receiver(post_save, sender=Comment)
def publish_comment_created(sender, instance, created, **kwargs):
    if not created:
        return

    recipient_id = instance.task.assigned_to_id
    emit_event(
        EventTypes.COMMENT_CREATED,
        'comment',
        instance.id,
        {
            'comment_id': instance.id,
            'task_id': instance.task_id,
            'task_title': instance.task.title,
            'author_name': instance.author.username,
            'recipient_id': recipient_id if recipient_id != instance.author_id else None,
        },
        actor=get_event_actor(instance.author),
        company=instance.task.project.company,
    )


@receiver(post_save, sender=Project)
def publish_project_created(sender, instance, created, **kwargs):
    if created:
        emit_event(
            EventTypes.PROJECT_CREATED,
            'project',
            instance.id,
            {
                'project_id': instance.id,
                'name': instance.name,
                'owner_id': instance.owner_id,
                'status': instance.status,
            },
            actor=get_event_actor(instance.owner),
            company=instance.company,
        )


@receiver(pre_save, sender=Meeting)
def capture_meeting_changes(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return

    previous = sender.objects.filter(pk=instance.pk).values('status').first()
    instance._previous_status = previous['status'] if previous else None


@receiver(post_save, sender=Meeting)
def publish_meeting_events(sender, instance, created, **kwargs):
    company = instance.project.company if instance.project else instance.organizer.company
    actor = get_event_actor(instance.organizer)
    participant_ids = list(instance.participants.values_list('user_id', flat=True))
    payload = {
        'meeting_id': instance.id,
        'title': instance.title,
        'status': instance.status,
        'project_id': instance.project_id,
        'participant_ids': participant_ids,
    }

    if created:
        emit_event(
            EventTypes.MEETING_CREATED,
            'meeting',
            instance.id,
            payload,
            actor=actor,
            company=company,
        )
        return

    previous_status = instance._previous_status
    if not previous_status or previous_status == instance.status:
        return

    status_payload = {
        **payload,
        'previous_status': previous_status,
        'new_status': instance.status,
    }
    emit_event(
        EventTypes.MEETING_STATUS_CHANGED,
        'meeting',
        instance.id,
        status_payload,
        actor=actor,
        company=company,
    )

    specific_types = {
        'in_progress': EventTypes.MEETING_STARTED,
        'completed': EventTypes.MEETING_COMPLETED,
        'cancelled': EventTypes.MEETING_CANCELLED,
    }
    specific_type = specific_types.get(instance.status)
    if specific_type:
        emit_event(
            specific_type,
            'meeting',
            instance.id,
            status_payload,
            actor=actor,
            company=company,
        )
