import pytest
from datetime import date, timedelta
from django.test import RequestFactory
from api.models import User, Project, Milestone, Task, Comment
from api.serializers import (
    UserSerializer, UserRegisterSerializer,
    ProjectSerializer, MilestoneSerializer,
    TaskSerializer, TaskDetailSerializer,
    ActivityLogSerializer, DashboardStatsSerializer,
)
from api.serializers_comment import CommentSerializer


class TestUserSerializer:
    def test_fields(self, user):
        data = UserSerializer(user).data
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'
        assert 'password' not in data

    def test_read_only_fields(self, user):
        data = UserSerializer(user).data
        assert 'id' in data
        assert 'date_joined' in data


class TestUserRegisterSerializer:
    def test_valid_registration(self, db):
        payload = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'securepass123',
            'password2': 'securepass123',
            'first_name': 'New',
            'last_name': 'User',
        }
        serializer = UserRegisterSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        user = serializer.save()
        assert user.username == 'newuser'
        assert user.check_password('securepass123')

    def test_password_mismatch(self, db):
        payload = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'pass1',
            'password2': 'pass2',
        }
        serializer = UserRegisterSerializer(data=payload)
        assert not serializer.is_valid()
        assert 'non_field_errors' in serializer.errors

    def test_missing_fields(self, db):
        serializer = UserRegisterSerializer(data={})
        assert not serializer.is_valid()
        assert 'username' in serializer.errors
        assert 'password' in serializer.errors
        assert 'password2' in serializer.errors


class TestProjectSerializer:
    def test_serialization(self, project, user):
        data = ProjectSerializer(project).data
        assert data['name'] == 'Test Project'
        assert data['owner_name'] == user.username
        assert 'members_count' in data
        assert 'task_count' in data
        assert 'completed_task_count' in data
        assert 'milestones_count' in data

    def test_members_count(self, project, other_user):
        project.members.add(other_user)
        data = ProjectSerializer(project).data
        assert data['members_count'] == 1

    def test_task_counts(self, project, user):
        Task.objects.create(title='T1', status='todo', project=project, created_by=user)
        Task.objects.create(title='T2', status='completed', project=project, created_by=user)
        data = ProjectSerializer(project).data
        assert data['task_count'] == 2
        assert data['completed_task_count'] == 1


class TestMilestoneSerializer:
    def test_serialization(self, milestone, project):
        data = MilestoneSerializer(milestone).data
        assert data['name'] == 'Sprint 1'
        assert data['project_name'] == project.name
        assert 'task_count' in data
        assert 'completed_task_count' in data

    def test_task_counts(self, milestone, project, user):
        Task.objects.create(
            title='T1', status='completed',
            project=project, milestone=milestone, created_by=user,
        )
        data = MilestoneSerializer(milestone).data
        assert data['task_count'] == 1
        assert data['completed_task_count'] == 1


class TestTaskSerializer:
    def test_serialization(self, task, project, user):
        data = TaskSerializer(task).data
        assert data['title'] == 'Test Task'
        assert data['project_name'] == project.name
        assert data['assigned_to_name'] == user.username
        assert data['is_delayed'] is False

    def test_read_only_fields(self, task):
        data = TaskSerializer(task).data
        assert 'predicted_time' in data
        assert 'delay_probability' in data
        assert 'completed_at' in data


class TestTaskDetailSerializer:
    def test_includes_comments_count(self, task, user):
        Comment.objects.create(content='c1', task=task, author=user)
        Comment.objects.create(content='c2', task=task, author=user)
        data = TaskDetailSerializer(task).data
        assert data['comments_count'] == 2

    def test_includes_dependencies_details(self, task, project, user):
        dep = Task.objects.create(
            title='Dep', status='todo', project=project, created_by=user,
        )
        task.dependencies.add(dep)
        data = TaskDetailSerializer(task).data
        assert len(data['dependencies_details']) == 1
        assert data['dependencies_details'][0]['title'] == 'Dep'


class TestCommentSerializer:
    def test_serialization(self, comment, user):
        data = CommentSerializer(comment).data
        assert data['content'] == 'This is a test comment'
        assert data['author_name'] == user.username
        assert 'replies_count' in data
        assert 'time_ago' in data

    def test_replies_count(self, comment, task, user):
        Comment.objects.create(
            content='reply', task=task, author=user, parent=comment,
        )
        data = CommentSerializer(comment).data
        assert data['replies_count'] == 1

    def test_create_detects_mentions(self, db, task, user, other_user):
        factory = RequestFactory()
        request = factory.post('/')
        request.user = user
        serializer = CommentSerializer(
            data={'content': f'Hey @{other_user.username} check this', 'task': task.id},
            context={'request': request},
        )
        assert serializer.is_valid(), serializer.errors
        obj = serializer.save(author=user)
        assert other_user.id in obj.mentions

    def test_create_ignores_nonexistent_mentions(self, db, task, user):
        factory = RequestFactory()
        request = factory.post('/')
        request.user = user
        serializer = CommentSerializer(
            data={'content': '@nonexistent hello', 'task': task.id},
            context={'request': request},
        )
        assert serializer.is_valid(), serializer.errors
        obj = serializer.save(author=user)
        assert obj.mentions == []

    def test_update_sets_edited_flag(self, comment):
        serializer = CommentSerializer(comment, data={'content': 'edited'}, partial=True)
        assert serializer.is_valid(), serializer.errors
        obj = serializer.save()
        assert obj.edited is True


class TestActivityLogSerializer:
    def test_serialization(self, activity_log, user):
        data = ActivityLogSerializer(activity_log).data
        assert data['user_name'] == user.username
        assert data['action'] == 'create'
        assert data['entity_type'] == 'task'
