"""
Endpoint générique pour interroger l'état d'une tâche Celery en arrière-plan
(transcription, traitement IA de réunion, génération de rapport, ...).

Le frontend reçoit surtout ses mises à jour via WebSocket (notifications
temps réel), mais ce endpoint de polling reste utile en secours (ex : avant
que la connexion WebSocket ne soit établie, ou pour un client qui préfère
interroger activement l'avancement d'une tâche precise).
"""
from celery.result import AsyncResult
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_status(request, task_id):
    """Retourne l'état d'une tâche Celery : PENDING, STARTED, SUCCESS, FAILURE, RETRY."""
    result = AsyncResult(task_id)

    payload = {
        'task_id': task_id,
        'status': result.status,
        'ready': result.ready(),
    }

    if result.ready():
        if result.successful():
            payload['result'] = result.result
        else:
            # On évite de faire fuiter la trace complète de l'exception au client
            payload['error'] = str(result.result) if result.result else 'Task failed'

    return Response(payload)
