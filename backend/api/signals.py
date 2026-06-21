from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Task, Comment, Project, Notification
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

@receiver(post_save, sender=Task)
def task_notification(sender, instance, created, **kwargs):
    """Gère les notifications pour les tâches"""
    if created and instance.assigned_to:
        # Sauvegarde en base
        Notification.objects.create(
            recipient=instance.assigned_to,
            type='task_assigned',
            title='Nouvelle tâche assignée',
            message=f"La tâche '{instance.title}' vous a été assignée",
            data={'task_id': instance.id, 'project_id': instance.project_id}
        )
        
        # WebSocket si disponible
        send_websocket_notification(
            instance.assigned_to.id,
            'task_assigned',
            'Nouvelle tâche assignée',
            f"La tâche '{instance.title}' vous a été assignée",
            {'task_id': instance.id}
        )

@receiver(post_save, sender=Comment)
def comment_notification(sender, instance, created, **kwargs):
    """Gère les notifications pour les commentaires"""
    if created and instance.author != instance.task.assigned_to:
        Notification.objects.create(
            recipient=instance.task.assigned_to,
            type='comment_added',
            title='Nouveau commentaire',
            message=f"{instance.author.username} a commenté la tâche '{instance.task.title}'",
            data={'task_id': instance.task.id, 'comment_id': instance.id}
        )
        
        send_websocket_notification(
            instance.task.assigned_to.id,
            'comment_added',
            'Nouveau commentaire',
            f"{instance.author.username} a commenté la tâche '{instance.task.title}'",
            {'task_id': instance.task.id}
        )

@receiver(post_save, sender=Project)
def project_notification(sender, instance, created, **kwargs):
    """Gère les notifications pour les projets"""
    if created:
        # Notification au propriétaire du projet
        Notification.objects.create(
            recipient=instance.owner,
            type='project_created',
            title='Projet créé',
            message=f"Le projet '{instance.name}' a été créé",
            data={'project_id': instance.id}
        )
