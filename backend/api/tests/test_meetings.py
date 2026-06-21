import pytest
from datetime import date, timedelta
from django.utils import timezone
from api.models import (
    Meeting, MeetingParticipant, MeetingSummary, MeetingActionItem,
    User, Project, Task,
)


@pytest.fixture
def meeting(db, user, project):
    return Meeting.objects.create(
        title='Sprint Planning',
        description='Plan the next sprint',
        status='scheduled',
        scheduled_at=timezone.now() + timedelta(days=1),
        organizer=user,
        project=project,
    )


@pytest.fixture
def past_meeting(db, user, project):
    return Meeting.objects.create(
        title='Retrospective',
        status='completed',
        scheduled_at=timezone.now() - timedelta(days=1),
        organizer=user,
        project=project,
    )


@pytest.fixture
def participant(db, meeting, other_user):
    return MeetingParticipant.objects.create(
        meeting=meeting, user=other_user, role='attendee',
    )


@pytest.fixture
def summary(db, meeting):
    return MeetingSummary.objects.create(
        meeting=meeting,
        summary_text='We discussed sprint goals.',
        key_points=['Goal 1', 'Goal 2'],
        decisions=['Use React for frontend'],
        follow_ups=['Set up CI'],
    )


@pytest.fixture
def action_item(db, meeting, user):
    return MeetingActionItem.objects.create(
        meeting=meeting,
        title='Set up CI pipeline',
        description='Configure GitHub Actions',
        priority=3,
        assigned_to=user,
        deadline=date.today() + timedelta(days=7),
    )


class TestMeetingModel:
    def test_str(self, meeting):
        assert str(meeting) == 'Sprint Planning'

    def test_is_past_future(self, meeting):
        assert meeting.is_past is False

    def test_is_past_past(self, past_meeting):
        assert past_meeting.is_past is True

    def test_is_past_no_scheduled_at(self, db, user):
        m = Meeting.objects.create(title='No date', organizer=user)
        assert m.is_past is False

    def test_defaults(self, db, user):
        m = Meeting.objects.create(title='Defaults', organizer=user)
        assert m.status == 'scheduled'
        assert m.input_type == 'text'
        assert m.ai_processed is False
        assert m.transcript == ''
        assert m.raw_notes == ''


class TestMeetingParticipantModel:
    def test_str(self, participant, other_user, meeting):
        assert str(participant) == f"{other_user.username} - {meeting.title}"

    def test_default_role(self, db, meeting, user):
        p = MeetingParticipant.objects.create(meeting=meeting, user=user)
        assert p.role == 'attendee'

    def test_default_attended(self, participant):
        assert participant.attended is False

    def test_unique_together(self, participant, meeting, other_user):
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            MeetingParticipant.objects.create(
                meeting=meeting, user=other_user, role='presenter',
            )


class TestMeetingSummaryModel:
    def test_str(self, summary, meeting):
        assert str(summary) == f"Summary: {meeting.title}"

    def test_defaults(self, summary):
        assert summary.model_used == 'gpt-4'

    def test_json_fields(self, summary):
        assert isinstance(summary.key_points, list)
        assert isinstance(summary.decisions, list)
        assert isinstance(summary.follow_ups, list)
        assert len(summary.key_points) == 2

    def test_one_to_one(self, summary, meeting):
        assert meeting.summary == summary


class TestMeetingActionItemModel:
    def test_str(self, action_item):
        assert str(action_item) == 'Set up CI pipeline'

    def test_defaults(self, db, meeting):
        item = MeetingActionItem.objects.create(
            meeting=meeting, title='Test',
        )
        assert item.priority == 2
        assert item.status == 'pending'
        assert item.linked_task is None

    def test_convert_to_task(self, action_item, project):
        task = action_item.convert_to_task(project)
        assert isinstance(task, Task)
        assert task.title == action_item.title
        assert task.priority == action_item.priority
        assert task.project == project
        assert task.status == 'todo'
        action_item.refresh_from_db()
        assert action_item.linked_task == task

    def test_convert_preserves_deadline(self, action_item, project):
        task = action_item.convert_to_task(project)
        assert task.deadline == action_item.deadline

    def test_convert_preserves_assignee(self, action_item, project, user):
        task = action_item.convert_to_task(project)
        assert task.assigned_to == user

    def test_convert_sets_created_by_to_organizer(self, action_item, project, user):
        task = action_item.convert_to_task(project)
        assert task.created_by == action_item.meeting.organizer
