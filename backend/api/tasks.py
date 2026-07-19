"""
Tâches Celery — délégation en arrière-plan de toutes les opérations lourdes
et asynchrones de la plateforme :

- Rappels de meetings envoyés en masse (bulk reminders)
- Traitement IA des réunions (transcription, résumé, extraction d'actions)
- Génération de rapports de projet
- Notifications temps réel poussées via WebSocket (channels + Redis)

Chaque tâche est volontairement petite et idempotente pour pouvoir être
rejouée sans effet de bord (retry Celery automatique en cas d'échec).
"""
from datetime import timedelta

from celery import shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Avg, Count, F
from django.utils import timezone

from . import kafka_client
from .models import EventOutbox

logger = get_task_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers communs
# ---------------------------------------------------------------------------

def _push_realtime_notification(recipient_id, notification_type, title, message, data=None):
    from .services.notifications import push_realtime_notification

    push_realtime_notification(recipient_id, notification_type, title, message, data)


def _notify(recipient, notification_type, title, message, data=None):
    from .services.notifications import create_notification

    create_notification(recipient, notification_type, title, message, data)


# ---------------------------------------------------------------------------
# Transactional outbox -> Kafka
# ---------------------------------------------------------------------------

@shared_task(name='api.tasks.publish_domain_event', bind=True, max_retries=None)
def publish_domain_event(self, event_id):
    if not settings.KAFKA_ENABLED:
        return {'status': 'disabled', 'event_id': event_id}

    try:
        event = EventOutbox.objects.get(event_id=event_id)
    except EventOutbox.DoesNotExist:
        return {'status': 'missing', 'event_id': event_id}

    if event.status == 'published':
        return {'status': 'already_published', 'event_id': event_id}

    EventOutbox.objects.filter(id=event.id).update(attempts=F('attempts') + 1)
    try:
        kafka_client.publish_outbox_event(event)
    except Exception as exc:
        EventOutbox.objects.filter(id=event.id).update(last_error=str(exc))
        countdown = min(300, 2 ** min(event.attempts + 1, 8))
        raise self.retry(exc=exc, countdown=countdown)

    EventOutbox.objects.filter(id=event.id).update(
        status='published',
        published_at=timezone.now(),
        last_error='',
    )
    return {'status': 'published', 'event_id': event_id}


@shared_task(name='api.tasks.publish_pending_domain_events')
def publish_pending_domain_events(batch_size=500):
    if not settings.KAFKA_ENABLED:
        return {'dispatched': 0, 'status': 'disabled'}

    event_ids = list(
        EventOutbox.objects.filter(status='pending')
        .order_by('created_at')
        .values_list('event_id', flat=True)[:batch_size]
    )
    for event_id in event_ids:
        publish_domain_event.delay(str(event_id))
    return {'dispatched': len(event_ids)}


# ---------------------------------------------------------------------------
# Rappels de meetings (bulk, en arrière-plan)
# ---------------------------------------------------------------------------

@shared_task(name='api.tasks.send_bulk_meeting_reminders')
def send_bulk_meeting_reminders():
    """Tâche périodique (Celery Beat, toutes les 5 min) : repère les réunions
    qui démarrent dans les 30 prochaines minutes et déclenche un rappel pour
    chaque participant, en parallèle, sans bloquer quoi que ce soit côté UI.
    """
    from .models import Meeting

    now = timezone.now()
    window_end = now + timedelta(minutes=30)

    upcoming_meetings = Meeting.objects.filter(
        status='scheduled',
        scheduled_at__gte=now,
        scheduled_at__lte=window_end,
        reminder_sent_at__isnull=True,
    ).prefetch_related('participants__user')

    dispatched = 0
    for meeting in upcoming_meetings:
        participant_ids = list(
            meeting.participants.values_list('user_id', flat=True)
        )
        for user_id in participant_ids:
            send_meeting_reminder.delay(meeting.id, user_id)
            dispatched += 1

        # Marqué immédiatement pour ne jamais renvoyer deux fois le même rappel,
        # même si le prochain tick de beat tombe avant la fin du traitement ci-dessus.
        meeting.reminder_sent_at = now
        meeting.save(update_fields=['reminder_sent_at'])

    logger.info(
        'send_bulk_meeting_reminders: %d réunion(s) traitée(s), %d rappel(s) délégué(s)',
        upcoming_meetings.count() if hasattr(upcoming_meetings, 'count') else 0,
        dispatched,
    )
    return {'reminders_dispatched': dispatched}


@shared_task(name='api.tasks.send_meeting_reminder', bind=True, max_retries=3, default_retry_delay=30)
def send_meeting_reminder(self, meeting_id, user_id):
    """Envoie le rappel individuel (notification + WebSocket) à un participant.
    Découplée de send_bulk_meeting_reminders pour que l'échec d'un envoi
    (utilisateur supprimé, etc.) ne bloque jamais les autres."""
    from .models import Meeting, User

    try:
        meeting = Meeting.objects.get(id=meeting_id)
        user = User.objects.get(id=user_id)
    except (Meeting.DoesNotExist, User.DoesNotExist) as exc:
        logger.warning('send_meeting_reminder: meeting=%s user=%s introuvable', meeting_id, user_id)
        return {'error': str(exc)}

    when = meeting.scheduled_at.strftime('%H:%M') if meeting.scheduled_at else 'bientôt'
    _notify(
        recipient=user,
        notification_type='meeting_reminder',
        title='Rappel de réunion',
        message=f"La réunion « {meeting.title} » commence à {when}.",
        data={'meeting_id': meeting.id, 'scheduled_at': meeting.scheduled_at.isoformat() if meeting.scheduled_at else None},
    )
    return {'meeting_id': meeting.id, 'user_id': user.id, 'status': 'sent'}


@shared_task(name='api.tasks.send_milestone_deadline_reminders')
def send_milestone_deadline_reminders():
    """Tâche périodique (quotidienne) : prévient les responsables de projet des
    jalons dont l'échéance approche (J-3) ou est dépassée."""
    from .models import Milestone

    now = timezone.now().date()
    soon = now + timedelta(days=3)

    at_risk = Milestone.objects.filter(
        due_date__lte=soon,
        status__in=['not_started', 'in_progress', 'delayed'],
    ).select_related('project', 'project__owner')

    notified = 0
    for milestone in at_risk:
        owner = milestone.project.owner
        if not owner:
            continue
        overdue = milestone.due_date < now
        title = 'Jalon en retard' if overdue else 'Échéance de jalon proche'
        message = (
            f"Le jalon « {milestone.name} » du projet « {milestone.project.name} » "
            f"{'est en retard' if overdue else 'arrive à échéance le ' + milestone.due_date.isoformat()}."
        )
        _notify(
            recipient=owner,
            notification_type='milestone_due',
            title=title,
            message=message,
            data={'milestone_id': milestone.id, 'project_id': milestone.project_id},
        )
        notified += 1

    return {'milestones_notified': notified}


@shared_task(name='api.tasks.cleanup_stale_notifications')
def cleanup_stale_notifications():
    """Tâche périodique d'entretien : purge les notifications lues de plus de 90 jours."""
    from .models import Notification

    cutoff = timezone.now() - timedelta(days=90)
    deleted, _ = Notification.objects.filter(is_read=True, created_at__lt=cutoff).delete()
    return {'deleted': deleted}


# ---------------------------------------------------------------------------
# Traitement IA des réunions (audio/vidéo lourd -> délégué en background)
# ---------------------------------------------------------------------------

@shared_task(name='api.tasks.transcribe_meeting_audio', bind=True, max_retries=2, default_retry_delay=60)
def transcribe_meeting_audio(self, meeting_id, user_id=None):
    """Transcrit l'audio d'une réunion via Whisper, en arrière-plan.
    Évite qu'un upload de fichier audio/vidéo volumineux ne bloque la requête HTTP."""
    from .models import Meeting, User
    from .services.ai_service import transcribe_audio

    meeting = Meeting.objects.get(id=meeting_id)
    requester = User.objects.filter(id=user_id).first() if user_id else meeting.organizer

    if requester:
        _notify(
            requester, 'meeting_processing', 'Transcription en cours',
            f"La transcription de « {meeting.title} » a démarré.",
            {'meeting_id': meeting.id},
        )

    if not meeting.audio_file:
        if requester:
            _notify(
                requester, 'task_failed', 'Transcription impossible',
                f"Aucun fichier audio n'est associé à « {meeting.title} ».",
                {'meeting_id': meeting.id},
            )
        return {'error': 'No audio file uploaded'}

    result = transcribe_audio(meeting.audio_file.path)

    if result['transcript']:
        meeting.transcript = result['transcript']
        meeting.save(update_fields=['transcript'])

    if requester:
        if result['error']:
            _notify(
                requester, 'task_failed', 'Erreur de transcription',
                f"La transcription de « {meeting.title} » a échoué : {result['error']}",
                {'meeting_id': meeting.id},
            )
        else:
            _notify(
                requester, 'meeting_processed', 'Transcription terminée',
                f"La transcription de « {meeting.title} » est disponible.",
                {'meeting_id': meeting.id},
            )

    return {'meeting_id': meeting.id, 'transcript_length': len(meeting.transcript or ''), 'error': result['error']}


@shared_task(name='api.tasks.process_meeting_ai', bind=True, max_retries=2, default_retry_delay=60)
def process_meeting_ai(self, meeting_id, user_id=None):
    """Pipeline IA complet d'une réunion, exécuté hors requête HTTP :
    1. Transcription audio (si présent et pas encore fait)
    2. Génération du résumé structuré
    3. Extraction des actions items -> création des MeetingActionItem

    À chaque étape, une notification temps réel est poussée à l'utilisateur
    à l'origine de la demande pour que l'UI reste réactive et informative.
    """
    from .models import Meeting, MeetingSummary, MeetingActionItem, User, ActivityLog
    from .services.ai_service import transcribe_audio, summarize_meeting, extract_action_items
    from .serializers_meeting import MeetingSummarySerializer, MeetingActionItemSerializer

    meeting = Meeting.objects.get(id=meeting_id)
    requester = User.objects.filter(id=user_id).first() if user_id else meeting.organizer

    if requester:
        _notify(
            requester, 'meeting_processing', 'Traitement IA en cours',
            f"L'analyse IA de « {meeting.title} » a démarré (transcription, résumé, actions).",
            {'meeting_id': meeting.id},
        )

    # Étape 1 : transcription si nécessaire
    if meeting.audio_file and not meeting.transcript:
        result = transcribe_audio(meeting.audio_file.path)
        if result['transcript']:
            meeting.transcript = result['transcript']
            meeting.save(update_fields=['transcript'])

    content = meeting.transcript or meeting.raw_notes
    if not content:
        if requester:
            _notify(
                requester, 'task_failed', 'Traitement IA impossible',
                f"Aucun contenu à analyser pour « {meeting.title} » (ajoutez un audio ou des notes).",
                {'meeting_id': meeting.id},
            )
        return {'error': 'No content to process'}

    # Étape 2 : résumé
    participant_names = list(meeting.participants.values_list('user__username', flat=True))
    summary_result = summarize_meeting(content, meeting.raw_notes)

    summary, _created = MeetingSummary.objects.update_or_create(
        meeting=meeting,
        defaults={
            'summary_text': summary_result['summary_text'],
            'key_points': summary_result['key_points'],
            'decisions': summary_result['decisions'],
            'follow_ups': summary_result['follow_ups'],
            'model_used': summary_result.get('model_used', 'fallback'),
        },
    )

    # Étape 3 : actions items
    action_result = extract_action_items(content, meeting.raw_notes, participant_names)

    created_items = []
    for item_data in action_result.get('action_items', []):
        assigned_user = None
        assigned_name = item_data.get('assigned_to')
        if assigned_name:
            assigned_user = User.objects.filter(username__iexact=assigned_name).first()

        action_item = MeetingActionItem.objects.create(
            meeting=meeting,
            title=item_data.get('title', 'Untitled'),
            description=item_data.get('description', ''),
            priority=item_data.get('priority', 2),
            assigned_to=assigned_user,
            deadline=item_data.get('deadline'),
        )
        created_items.append(action_item)

    error = summary_result.get('error', '') or action_result.get('error', '')
    meeting.ai_processed = True
    meeting.ai_processing_error = error
    meeting.save(update_fields=['ai_processed', 'ai_processing_error'])

    if requester:
        ActivityLog.objects.create(
            user=requester,
            action='update',
            entity_type='meeting',
            entity_id=meeting.id,
            metadata={'title': meeting.title, 'source': 'celery_task'},
        )
        if error:
            _notify(
                requester, 'task_failed', 'Traitement IA partiel',
                f"L'analyse de « {meeting.title} » s'est terminée avec des erreurs : {error}",
                {'meeting_id': meeting.id},
            )
        else:
            _notify(
                requester, 'meeting_processed', 'Analyse IA terminée',
                f"Résumé et {len(created_items)} action(s) extraite(s) pour « {meeting.title} ».",
                {'meeting_id': meeting.id, 'action_items_count': len(created_items)},
            )

    return {
        'meeting_id': meeting.id,
        'summary': MeetingSummarySerializer(summary).data,
        'action_items': MeetingActionItemSerializer(created_items, many=True).data,
        'error': error,
    }


# ---------------------------------------------------------------------------
# Génération de rapports de projet (agrégation lourde -> délégué en background)
# ---------------------------------------------------------------------------

@shared_task(name='api.tasks.generate_project_report', bind=True, max_retries=2, default_retry_delay=60)
def generate_project_report(self, project_id, user_id, report_format='json'):
    """Génère un rapport complet d'un projet (avancement, tâches, jalons,
    charge par membre, risques) et le stocke comme File téléchargeable.
    Opération volontairement déléguée : agrégations sur potentiellement
    des milliers de tâches/activités, jamais exécutée dans le cycle requête/réponse.
    """
    import json as json_lib

    from .models import Project, Task, Milestone, User, File, ActivityLog

    project = Project.objects.get(id=project_id)
    requester = User.objects.get(id=user_id)

    _notify(
        requester, 'report_processing', 'Génération du rapport en cours',
        f"Le rapport du projet « {project.name} » est en cours de génération.",
        {'project_id': project.id},
    )

    tasks = Task.objects.filter(project=project)
    milestones = Milestone.objects.filter(project=project)
    completed_tasks = tasks.filter(status='completed')
    delayed_tasks = [t for t in tasks.exclude(status='completed') if t.is_delayed]

    workload_by_member = list(
        tasks.values('assigned_to__id', 'assigned_to__username')
        .annotate(task_count=Count('id'), avg_time=Avg('actual_time'))
        .order_by('-task_count')
    )

    report_payload = {
        'project': {
            'id': project.id,
            'name': project.name,
            'status': project.status,
            'progress': project.progress,
            'risk_score': project.risk_score,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'deadline': project.deadline.isoformat() if project.deadline else None,
        },
        'summary': {
            'total_tasks': tasks.count(),
            'completed_tasks': completed_tasks.count(),
            'delayed_tasks': len(delayed_tasks),
            'completion_rate': round((completed_tasks.count() / tasks.count() * 100), 1) if tasks.count() else 0,
            'total_milestones': milestones.count(),
            'completed_milestones': milestones.filter(status='completed').count(),
            'delayed_milestones': milestones.filter(status='delayed').count(),
        },
        'workload_by_member': workload_by_member,
        'delayed_tasks_detail': [
            {'id': t.id, 'title': t.title, 'deadline': t.deadline.isoformat() if t.deadline else None,
             'assigned_to': t.assigned_to.username if t.assigned_to else None}
            for t in delayed_tasks
        ],
        'generated_at': timezone.now().isoformat(),
        'generated_by': requester.username,
    }

    report_json = json_lib.dumps(report_payload, indent=2, ensure_ascii=False)
    filename = f"rapport_{project.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"

    company = requester.company
    file_obj = None
    if company:
        file_obj = File.objects.create(
            name=filename,
            file=ContentFile(report_json.encode('utf-8'), name=filename),
            mime_type='application/json',
            size_bytes=len(report_json.encode('utf-8')),
            company=company,
            uploaded_by=requester,
            description=f"Rapport auto-généré pour le projet {project.name}",
        )
        company.storage_used += file_obj.size_bytes
        company.save(update_fields=['storage_used'])

    ActivityLog.objects.create(
        user=requester,
        action='create',
        entity_type='project_report',
        entity_id=project.id,
        metadata={'project_name': project.name, 'file_id': file_obj.id if file_obj else None},
    )

    _notify(
        requester, 'report_ready', 'Rapport de projet prêt',
        f"Le rapport du projet « {project.name} » est disponible au téléchargement.",
        {'project_id': project.id, 'file_id': file_obj.id if file_obj else None},
    )

    return {
        'project_id': project.id,
        'file_id': file_obj.id if file_obj else None,
        'summary': report_payload['summary'],
    }
