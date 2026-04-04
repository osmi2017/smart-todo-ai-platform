from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Task, Comment, Project, Notification, User
from datetime import date

@receiver(post_save, sender=Task)
def task_notification(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    
    if created:
        # Notification pour assignation de tâche
        if instance.assigned_to:
            Notification.objects.create(
                recipient=instance.assigned_to,
                type='task_assigned',
                title='Nouvelle tâche assignée',
                message=f"La tâche '{instance.title}' vous a été assignée",
                data={'task_id': instance.id, 'project_id': instance.project_id}
            )
            
            # Envoyer via WebSocket
            async_to_sync(channel_layer.group_send)(
                f'notifications_{instance.assigned_to.id}',
                {
                    'type': 'send_notification',
                    'notification_type': 'task_assigned',
                    'title': 'Nouvelle tâche assignée',
                    'message': f"La tâche '{instance.title}' vous a été assignée",
                    'data': {'task_id': instance.id},
                    'created_at': str(instance.created_at)
                }
            )
    
    # Vérifier si la tâche est en retard
    if instance.deadline and instance.deadline < date.today() and instance.status != 'completed':
        if instance.assigned_to:
            Notification.objects.create(
                recipient=instance.assigned_to,
                type='task_delayed',
                title='Tâche en retard',
                message=f"La tâche '{instance.title}' est en retard",
                data={'task_id': instance.id}
            )

@receiver(post_save, sender=Comment)
def comment_notification(sender, instance, created, **kwargs):
    if created and instance.author != instance.task.assigned_to:
        channel_layer = get_channel_layer()
        
        Notification.objects.create(
            recipient=instance.task.assigned_to,
            type='comment_added',
            title='Nouveau commentaire',
            message=f"{instance.author.username} a commenté la tâche '{instance.task.title}'",
            data={'task_id': instance.task.id, 'comment_id': instance.id}
        )
        
        async_to_sync(channel_layer.group_send)(
            f'notifications_{instance.task.assigned_to.id}',
            {
                'type': 'send_notification',
                'notification_type': 'comment_added',
                'title': 'Nouveau commentaire',
                'message': f"{instance.author.username} a commenté la tâche '{instance.task.title}'",
                'data': {'task_id': instance.task.id},
                'created_at': str(instance.created_at)
            }
        )
