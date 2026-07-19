"""
Configuration Celery pour le traitement asynchrone en arrière-plan.

Ce module démarre l'application Celery utilisée pour déléguer toutes les
opérations lourdes (rappels de meetings en masse, génération de rapports de
projet, traitement audio/vidéo) hors du cycle requête/réponse HTTP, afin que
l'API et l'UI restent instantanées et réactives.
"""
import os

from celery import Celery
from celery.schedules import crontab

# Indique à Celery où trouver la configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('smart_todo_ai')

# Toute clé CELERY_* de settings.py est automatiquement reprise ici
app.config_from_object('django.conf:settings', namespace='CELERY')

# Découvre automatiquement un fichier tasks.py dans chaque app Django installée
app.autodiscover_tasks()

# Planification périodique (Celery Beat) — pas besoin de service externe,
# le scheduler tourne dans son propre worker "beat".
app.conf.beat_schedule = {
    'send-meeting-reminders-every-5-minutes': {
        'task': 'api.tasks.send_bulk_meeting_reminders',
        'schedule': crontab(minute='*/5'),
    },
    'send-milestone-deadline-reminders-daily': {
        'task': 'api.tasks.send_milestone_deadline_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    'cleanup-expired-task-results-daily': {
        'task': 'api.tasks.cleanup_stale_notifications',
        'schedule': crontab(hour=3, minute=0),
    },
    'publish-pending-domain-events-every-minute': {
        'task': 'api.tasks.publish_pending_domain_events',
        'schedule': 60.0,
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
