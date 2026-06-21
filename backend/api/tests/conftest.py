import pytest
from datetime import date, timedelta
from django.utils import timezone
from api.models import User, Project, Milestone, Task, Comment, Notification, ActivityLog


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User',
        role='member',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username='admin',
        email='admin@example.com',
        password='adminpass123',
        role='admin',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username='other',
        email='other@example.com',
        password='otherpass123',
        role='member',
    )


@pytest.fixture
def project(db, user):
    return Project.objects.create(
        name='Test Project',
        description='A test project',
        status='in_progress',
        owner=user,
        start_date=date.today(),
        deadline=date.today() + timedelta(days=30),
    )


@pytest.fixture
def milestone(db, project):
    return Milestone.objects.create(
        name='Sprint 1',
        description='First sprint',
        due_date=date.today() + timedelta(days=14),
        status='in_progress',
        project=project,
    )


@pytest.fixture
def task(db, project, user, milestone):
    return Task.objects.create(
        title='Test Task',
        description='A test task',
        priority=2,
        status='todo',
        deadline=date.today() + timedelta(days=7),
        estimated_time=4.0,
        project=project,
        milestone=milestone,
        assigned_to=user,
        created_by=user,
    )


@pytest.fixture
def completed_task(db, project, user):
    return Task.objects.create(
        title='Completed Task',
        description='Already done',
        priority=1,
        status='completed',
        project=project,
        assigned_to=user,
        created_by=user,
    )


@pytest.fixture
def comment(db, task, user):
    return Comment.objects.create(
        content='This is a test comment',
        task=task,
        author=user,
    )


@pytest.fixture
def notification(db, user):
    return Notification.objects.create(
        recipient=user,
        type='task_assigned',
        title='New task',
        message='You have been assigned a task',
        data={'task_id': 1},
    )


@pytest.fixture
def activity_log(db, user):
    return ActivityLog.objects.create(
        user=user,
        action='create',
        entity_type='task',
        entity_id=1,
        metadata={'title': 'Test'},
    )
