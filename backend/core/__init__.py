# Assure que l'app Celery est chargée dès le démarrage de Django,
# pour que shared_task fonctionne correctement dans tout le projet.
from .celery import app as celery_app

__all__ = ('celery_app',)
