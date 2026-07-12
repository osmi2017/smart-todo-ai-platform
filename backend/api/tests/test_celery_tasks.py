"""Tests pour les tâches Celery (rappels, traitement IA de réunion, rapports).

CELERY_TASK_ALWAYS_EAGER=True (settings_test.py) : les tâches s'exécutent
en synchrone dans le process de test, sans nécessiter Redis ni de worker.
"""
import json
from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import (
    Meeting, MeetingParticipant, MeetingSummary, MeetingActionItem,
    Notification, File, Task,
)
from api.tasks import (
    send_bulk_meeting_reminders,
    send_meeting_reminder,
    process_meeting_ai,
    transcribe_meeting_audio,
    generate_project_report,
)


@pytest.fixture
def upcoming_meeting(db, user, project, other_user):
    meeting = Meeting.objects.create(
        title='Daily Standup',
        status='scheduled',
        scheduled_at=timezone.now() + timedelta(minutes=10),
        organizer=user,
        project=project,
        raw_notes='Discussed blockers on the API integration.',
    )
    MeetingParticipant.objects.create(meeting=meeting, user=user, role='organizer')
    MeetingParticipant.objects.create(meeting=meeting, user=other_user, role='attendee')
    return meeting


class TestMeetingReminders:
    def test_bulk_reminders_dispatches_per_participant(self, upcoming_meeting):
        result = send_bulk_meeting_reminders()

        assert result['reminders_dispatched'] == 2
        # Une notification a bien été créée pour chaque participant
        assert Notification.objects.filter(
            type='meeting_reminder', recipient=upcoming_meeting.organizer
        ).exists()

    def test_bulk_reminders_marks_meeting_to_avoid_duplicates(self, upcoming_meeting):
        send_bulk_meeting_reminders()
        upcoming_meeting.refresh_from_db()
        assert upcoming_meeting.reminder_sent_at is not None

        # Un deuxième passage ne doit rien redéclencher pour cette réunion
        result = send_bulk_meeting_reminders()
        assert result['reminders_dispatched'] == 0

    def test_bulk_reminders_ignores_meetings_outside_window(self, db, user, project):
        far_meeting = Meeting.objects.create(
            title='Next week planning',
            status='scheduled',
            scheduled_at=timezone.now() + timedelta(days=7),
            organizer=user,
            project=project,
        )
        result = send_bulk_meeting_reminders()
        assert result['reminders_dispatched'] == 0
        far_meeting.refresh_from_db()
        assert far_meeting.reminder_sent_at is None

    def test_single_reminder_creates_notification(self, upcoming_meeting, user):
        result = send_meeting_reminder(upcoming_meeting.id, user.id)
        assert result['status'] == 'sent'
        notif = Notification.objects.get(recipient=user, type='meeting_reminder')
        assert upcoming_meeting.title in notif.message


class TestProcessMeetingAI:
    def test_process_meeting_with_notes_creates_summary_and_actions(self, upcoming_meeting, user):
        result = process_meeting_ai(upcoming_meeting.id, user.id)

        upcoming_meeting.refresh_from_db()
        assert upcoming_meeting.ai_processed is True
        assert MeetingSummary.objects.filter(meeting=upcoming_meeting).exists()
        assert 'summary' in result

    def test_process_meeting_without_content_fails_gracefully(self, db, user, project):
        empty_meeting = Meeting.objects.create(
            title='Empty meeting',
            status='scheduled',
            organizer=user,
            project=project,
        )
        result = process_meeting_ai(empty_meeting.id, user.id)
        assert 'error' in result
        assert Notification.objects.filter(
            recipient=user, type='task_failed'
        ).exists()

    def test_process_meeting_notifies_requester(self, upcoming_meeting, user):
        process_meeting_ai(upcoming_meeting.id, user.id)
        # Sans clé OpenAI configurée (cas des tests), le service IA retombe sur
        # un résumé de secours et signale une erreur : on doit être notifié
        # dans un cas comme dans l'autre, jamais laissé sans nouvelles.
        assert Notification.objects.filter(
            recipient=user, type__in=['meeting_processed', 'task_failed']
        ).exists()


class TestTranscribeMeetingAudio:
    def test_transcribe_without_audio_file_returns_error(self, upcoming_meeting, user):
        result = transcribe_meeting_audio(upcoming_meeting.id, user.id)
        assert result['error'] == 'No audio file uploaded'
        assert Notification.objects.filter(recipient=user, type='task_failed').exists()


class TestGenerateProjectReport:
    def test_generates_report_file_and_notification(self, db, user, project):
        Task.objects.create(
            title='Design API', project=project, status='completed',
            assigned_to=user, created_by=user,
        )
        Task.objects.create(
            title='Write docs', project=project, status='todo',
            assigned_to=user, created_by=user,
        )

        result = generate_project_report(project.id, user.id)

        assert result['project_id'] == project.id
        assert result['summary']['total_tasks'] == 2
        assert result['summary']['completed_tasks'] == 1

        assert File.objects.filter(id=result['file_id']).exists()
        report_file = File.objects.get(id=result['file_id'])
        assert report_file.mime_type == 'application/json'

        report_content = json.loads(report_file.file.read())
        assert report_content['project']['id'] == project.id

        assert Notification.objects.filter(recipient=user, type='report_ready').exists()

    def test_report_updates_company_storage_usage(self, db, user, project, company):
        initial_storage = company.storage_used
        generate_project_report(project.id, user.id)
        company.refresh_from_db()
        assert company.storage_used > initial_storage
