import pytest
from datetime import date, timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from api.models import User, Project, Milestone, Task, Comment, Notification, ActivityLog


class TestUserModel:
    def test_str(self, user):
        assert str(user) == "testuser (test@example.com)"

    def test_full_name_with_names(self, user):
        assert user.full_name == "Test User"

    def test_full_name_fallback_to_username(self, db):
        u = User.objects.create_user(username='noname', password='pass')
        assert u.full_name == "noname"

    def test_default_role(self, db):
        u = User.objects.create_user(username='def', password='pass')
        assert u.role == 'user'

    def test_default_metrics(self, user):
        assert user.avg_completion_time == 0
        assert user.delay_rate == 0
        assert user.productivity_pattern == {}


class TestProjectModel:
    def test_str(self, project):
        assert str(project) == 'Test Project'

    def test_default_progress(self, db, user):
        p = Project.objects.create(name='P', owner=user)
        assert p.progress == 0

    def test_save_sets_start_date_when_no_dates(self, db, user):
        p = Project.objects.create(name='P2', owner=user)
        assert p.start_date == timezone.now().date()

    def test_save_preserves_explicit_dates(self, db, user):
        explicit_start = date(2026, 1, 1)
        p = Project.objects.create(
            name='P3', owner=user,
            start_date=explicit_start, deadline=date(2026, 6, 1),
        )
        assert p.start_date == explicit_start

    def test_update_progress_no_tasks(self, project):
        project.update_progress()
        project.refresh_from_db()
        assert project.progress == 0

    def test_update_progress_with_tasks(self, project, user):
        Task.objects.create(title='T1', status='completed', project=project, created_by=user)
        Task.objects.create(title='T2', status='todo', project=project, created_by=user)
        project.update_progress()
        project.refresh_from_db()
        assert project.progress == 50.0

    def test_default_color(self, project):
        assert project.color == '#4299E1'


class TestMilestoneModel:
    def test_str(self, milestone, project):
        assert str(milestone) == f"Sprint 1 - {project.name}"

    def test_update_progress_no_tasks(self, milestone):
        milestone.update_progress()
        milestone.refresh_from_db()
        assert milestone.progress == 0
        assert milestone.status == 'not_started'

    def test_update_progress_completed(self, milestone, project, user):
        Task.objects.create(
            title='Done', status='completed',
            project=project, milestone=milestone, created_by=user,
        )
        milestone.update_progress()
        milestone.refresh_from_db()
        assert milestone.progress == 100
        assert milestone.status == 'completed'

    def test_update_progress_in_progress(self, milestone, project, user):
        Task.objects.create(
            title='Done', status='completed',
            project=project, milestone=milestone, created_by=user,
        )
        Task.objects.create(
            title='WIP', status='in_progress',
            project=project, milestone=milestone, created_by=user,
        )
        milestone.due_date = date.today() + timedelta(days=10)
        milestone.save()
        milestone.update_progress()
        milestone.refresh_from_db()
        assert milestone.progress == 50.0
        assert milestone.status == 'in_progress'

    def test_update_progress_delayed(self, milestone, project, user):
        Task.objects.create(
            title='Done', status='completed',
            project=project, milestone=milestone, created_by=user,
        )
        Task.objects.create(
            title='WIP', status='in_progress',
            project=project, milestone=milestone, created_by=user,
        )
        milestone.due_date = date.today() - timedelta(days=1)
        milestone.save()
        milestone.update_progress()
        milestone.refresh_from_db()
        assert milestone.status == 'delayed'


class TestTaskModel:
    def test_str(self, task):
        assert str(task) == 'Test Task'

    def test_save_sets_completed_at(self, task):
        task.status = 'completed'
        task.save()
        task.refresh_from_db()
        assert task.completed_at is not None

    def test_save_does_not_overwrite_completed_at(self, task):
        task.status = 'completed'
        task.save()
        task.refresh_from_db()
        first_completed_at = task.completed_at
        task.title = 'Updated'
        task.save()
        task.refresh_from_db()
        assert task.completed_at == first_completed_at

    def test_save_calculates_actual_time_on_completion(self, task):
        task.status = 'completed'
        task.actual_time = None
        task.save()
        task.refresh_from_db()
        assert task.actual_time is not None
        assert task.actual_time >= 0

    def test_is_delayed_true(self, task):
        task.deadline = date.today() - timedelta(days=1)
        task.status = 'todo'
        assert task.is_delayed is True

    def test_is_delayed_false_completed(self, task):
        task.deadline = date.today() - timedelta(days=1)
        task.status = 'completed'
        assert task.is_delayed is False

    def test_is_delayed_false_no_deadline(self, task):
        task.deadline = None
        assert task.is_delayed is False

    def test_is_delayed_false_future(self, task):
        task.deadline = date.today() + timedelta(days=5)
        task.status = 'in_progress'
        assert task.is_delayed is False

    def test_default_order(self, task):
        assert task.order == 0

    def test_default_tags_checklist_attachments(self, task):
        assert task.tags == []
        assert task.checklist == []
        assert task.attachments == []

    def test_save_updates_project_progress(self, project, user):
        t = Task.objects.create(
            title='T', status='completed', project=project, created_by=user,
        )
        project.refresh_from_db()
        assert project.progress > 0


class TestCommentModel:
    def test_str(self, comment, user, task):
        assert str(comment) == f"Commentaire de {user} sur {task}"

    def test_defaults(self, comment):
        assert comment.edited is False
        assert comment.attachments == []
        assert comment.mentions == []

    def test_reply_relationship(self, comment, task, user):
        reply = Comment.objects.create(
            content='Reply', task=task, author=user, parent=comment,
        )
        assert reply.parent == comment
        assert comment.replies.count() == 1


class TestNotificationModel:
    def test_str(self, notification, user):
        assert str(notification) == f"Notification pour {user}: New task"

    def test_default_is_read(self, notification):
        assert notification.is_read is False

    def test_data_field(self, notification):
        assert notification.data == {'task_id': 1}


class TestActivityLogModel:
    def test_str(self, activity_log, user):
        s = str(activity_log)
        assert user.username in s
        assert 'create' in s
        assert 'task' in s

    def test_metadata(self, activity_log):
        assert activity_log.metadata == {'title': 'Test'}
