import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Task, Comment, Project, Notification, User
from datetime import date

logger = logging.getLogger(__name__)


def _send_ws_notification(channel_layer, user_id, payload):
    """Send a WebSocket notification, logging failures instead of crashing."""
    try:
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            payload,
        )
    except Exception:
        logger.exception(
            "Failed to send WebSocket notification to user %s", user_id,
        )


@receiver(post_save, sender=Task)
def task_notification(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()

    if created:
        # Notification pour assignation de tâche
        if instance.assigned_to:
            try:
                Notification.objects.create(
                    recipient=instance.assigned_to,
                    type='task_assigned',
                    title='Nouvelle tâche assignée',
                    message=f"La tâche '{instance.title}' vous a été assignée",
                    data={'task_id': instance.id, 'project_id': instance.project_id}
                )
            except Exception:
                logger.exception(
                    "Failed to create task_assigned notification for task %s",
                    instance.id,
                )

            _send_ws_notification(channel_layer, instance.assigned_to.id, {
                'type': 'send_notification',
                'notification_type': 'task_assigned',
                'title': 'Nouvelle tâche assignée',
                'message': f"La tâche '{instance.title}' vous a été assignée",
                'data': {'task_id': instance.id},
                'created_at': str(instance.created_at)
            })

    # Vérifier si la tâche est en retard
    if instance.deadline and instance.deadline < date.today() and instance.status != 'completed':
        if instance.assigned_to:
            try:
                Notification.objects.create(
                    recipient=instance.assigned_to,
                    type='task_delayed',
                    title='Tâche en retard',
                    message=f"La tâche '{instance.title}' est en retard",
                    data={'task_id': instance.id}
                )
            except Exception:
                logger.exception(
                    "Failed to create task_delayed notification for task %s",
                    instance.id,
                )


@receiver(post_save, sender=Comment)
def comment_notification(sender, instance, created, **kwargs):
    if not created:
        return

    assigned_to = instance.task.assigned_to
    if assigned_to is None or instance.author == assigned_to:
        return

    channel_layer = get_channel_layer()

    try:
        Notification.objects.create(
            recipient=assigned_to,
            type='comment_added',
            title='Nouveau commentaire',
            message=f"{instance.author.username} a commenté la tâche '{instance.task.title}'",
            data={'task_id': instance.task.id, 'comment_id': instance.id}
        )
    except Exception:
        logger.exception(
            "Failed to create comment_added notification for comment %s",
            instance.id,
        )

    _send_ws_notification(channel_layer, assigned_to.id, {
        'type': 'send_notification',
        'notification_type': 'comment_added',
        'title': 'Nouveau commentaire',
        'message': f"{instance.author.username} a commenté la tâche '{instance.task.title}'",
        'data': {'task_id': instance.task.id},
        'created_at': str(instance.created_at)
    })
