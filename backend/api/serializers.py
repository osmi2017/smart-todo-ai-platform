from rest_framework import serializers
from django.contrib.auth import authenticate
from django.db import models
from .models import User, Project, Milestone, Task, ActivityLog, Comment, Company, CompanyGroup, File, FileShare, Notification, StorageNotification
import jwt
from django.conf import settings
from datetime import datetime


class CompanySerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()
    groups_count = serializers.SerializerMethodField()

    storage_tier = serializers.CharField(required=False)
    storage_used = serializers.IntegerField(read_only=True)
    storage_limit_bytes = serializers.IntegerField(read_only=True)
    storage_percent_used = serializers.FloatField(read_only=True)

    class Meta:
        model = Company
        fields = ('id', 'name', 'slug', 'description', 'is_active',
                  'users_count', 'groups_count',
                  'storage_tier', 'storage_used', 'storage_limit_bytes', 'storage_percent_used',
                  'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'storage_used')

    def get_users_count(self, obj):
        return obj.users.count()

    def get_groups_count(self, obj):
        return obj.groups.count()


class CompanyGroupSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), required=False, allow_null=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    members_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source='members', required=False, write_only=True
    )

    class Meta:
        model = CompanyGroup
        fields = ('id', 'name', 'description', 'company', 'company_name',
                  'members_count', 'created_by', 'created_by_name',
                  'member_ids', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')
        validators = []

    def get_members_count(self, obj):
        return obj.members.count()

    def validate(self, data):
        name = data.get('name', getattr(self.instance, 'name', None))
        company = data.get('company', getattr(self.instance, 'company', None))
        if name and company:
            qs = CompanyGroup.objects.filter(name=name, company=company)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'name': 'Un groupe avec ce nom existe déjà dans cette entreprise.'}
                )
        return data


class MemberMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role')
        read_only_fields = fields


class CompanyGroupDetailSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    members_count = serializers.SerializerMethodField()
    members = MemberMinimalSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)

    class Meta:
        model = CompanyGroup
        fields = ('id', 'name', 'description', 'company', 'company_name',
                  'members', 'members_count', 'created_by', 'created_by_name',
                  'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def get_members_count(self, obj):
        return obj.members.count()


class CompanyMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ('id', 'name', 'slug')


class UserSerializer(serializers.ModelSerializer):
    company_detail = CompanyMinimalSerializer(source='company', read_only=True)
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role',
                  'company', 'company_detail', 'groups',
                  'avatar', 'bio', 'avg_completion_time', 'delay_rate', 'date_joined')
        read_only_fields = ('id', 'avg_completion_time', 'delay_rate', 'date_joined')

    def get_groups(self, obj):
        return list(obj.company_groups.values_list('id', flat=True))


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'}, label="Confirmer mot de passe")
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password2', 'first_name', 'last_name')
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("Utilisateur désactivé")
                
                # Générer token JWT
                payload = {
                    'user_id': user.id,
                    'username': user.username,
                    'role': user.role,
                    'exp': datetime.utcnow() + settings.JWT_EXPIRATION_DELTA
                }
                token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')
                
                return {
                    'user': UserSerializer(user).data,
                    'token': token,
                    'message': 'Connexion réussie',
                    'company': CompanyMinimalSerializer(user.company).data if user.company else None,
                }
            raise serializers.ValidationError("Identifiants incorrects")
        raise serializers.ValidationError("Username et password requis")


class CompanyGroupMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyGroup
        fields = ('id', 'name')


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    members_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    milestones_count = serializers.SerializerMethodField()
    groups_detail = CompanyGroupMinimalSerializer(source='groups', many=True, read_only=True)
    managers_detail = MemberMinimalSerializer(source='managers', many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'progress', 'risk_score', 'owner')
    
    def get_members_count(self, obj):
        return obj.members.count()
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_completed_task_count(self, obj):
        return obj.tasks.filter(status='completed').count()
    
    def get_milestones_count(self, obj):
        return obj.milestones.count()

class MilestoneSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Milestone
        fields = [
            'id', 'name', 'description', 'due_date', 'status', 'progress',
            'risk_score', 'project', 'project_name', 'task_count', 
            'completed_task_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'risk_score')
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_completed_task_count(self, obj):
        return obj.tasks.filter(status='completed').count()


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    assigned_to_email = serializers.EmailField(source='assigned_to.email', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    milestone_name = serializers.CharField(source='milestone.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    is_delayed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status', 'deadline',
            'estimated_time', 'actual_time', 'predicted_time', 'delay_probability',
            'predicted_priority', 'tags', 'checklist', 'attachments', 'order',
            'project', 'project_name', 'milestone', 'milestone_name',
            'assigned_to', 'assigned_to_name', 'assigned_to_email',
            'created_by', 'created_by_name', 'dependencies',
            'created_at', 'updated_at', 'completed_at', 'is_delayed'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'completed_at', 
                          'predicted_time', 'delay_probability', 'predicted_priority',
                          'is_delayed')


class TaskDetailSerializer(TaskSerializer):
    """Serializer détaillé pour les tâches avec plus d'informations"""
    comments_count = serializers.SerializerMethodField()
    dependencies_details = TaskSerializer(many=True, read_only=True, source='dependencies')
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ['comments_count', 'dependencies_details']
    
    def get_comments_count(self, obj):
        return obj.comments.count()


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    replies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'content', 'task', 'author', 'author_name', 'author_avatar',
                 'parent', 'replies_count', 'created_at', 'updated_at']
        read_only_fields = ('id', 'created_at', 'updated_at', 'author')
    
    def get_replies_count(self, obj):
        return obj.replies.count()


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_name', 'action', 'entity_type', 'entity_id',
                 'metadata', 'ip_address', 'user_agent', 'created_at']
        read_only_fields = ('id', 'created_at')


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du dashboard"""
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    in_progress_tasks = serializers.IntegerField()
    delayed_tasks = serializers.IntegerField()
    tasks_by_priority = serializers.DictField()
    tasks_by_status = serializers.DictField()
    upcoming_deadlines = TaskSerializer(many=True)
    recent_activities = ActivityLogSerializer(many=True)
    productivity_score = serializers.FloatField()
    
class ProjectMemberSerializer(serializers.ModelSerializer):
    """Sérializer pour les membres du projet"""
    class Meta:
        model = Project
        fields = ['members']


class UserSimpleSerializer(serializers.ModelSerializer):
    """Sérializer simplifié pour les utilisateurs"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'avatar']


class FileShareSerializer(serializers.ModelSerializer):
    shared_with_user_name = serializers.CharField(source='shared_with_user.username', read_only=True, allow_null=True)
    shared_with_user_email = serializers.EmailField(source='shared_with_user.email', read_only=True, allow_null=True)
    shared_with_group_name = serializers.CharField(source='shared_with_group.name', read_only=True, allow_null=True)
    shared_by_name = serializers.CharField(source='shared_by.username', read_only=True)

    class Meta:
        model = FileShare
        fields = ('id', 'file', 'shared_with_user', 'shared_with_user_name', 'shared_with_user_email',
                  'shared_with_group', 'shared_with_group_name',
                  'can_edit', 'can_delete', 'shared_by', 'shared_by_name', 'shared_at')
        read_only_fields = ('id', 'shared_by', 'shared_at')


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)
    is_previewable = serializers.BooleanField(read_only=True)
    shares_count = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = ('id', 'name', 'file', 'mime_type', 'size_bytes', 'company',
                  'uploaded_by', 'uploaded_by_name', 'uploaded_by_email',
                  'description', 'is_previewable', 'shares_count', 'user_permissions',
                  'created_at', 'updated_at')
        read_only_fields = ('id', 'mime_type', 'size_bytes', 'company', 'uploaded_by',
                            'created_at', 'updated_at')

    def get_shares_count(self, obj):
        return obj.shares.count()

    def get_user_permissions(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return {'can_edit': False, 'can_delete': False, 'is_owner': False}
        user = request.user
        if user.role == 'superadmin' or obj.uploaded_by == user:
            return {'can_edit': True, 'can_delete': True, 'is_owner': obj.uploaded_by == user}
        if user.role == 'admin' and user.company == obj.company:
            return {'can_edit': True, 'can_delete': True, 'is_owner': False}
        shares = FileShare.objects.filter(
            file=obj
        ).filter(
            models.Q(shared_with_user=user) |
            models.Q(shared_with_group__members=user)
        ).distinct()
        can_edit = shares.filter(can_edit=True).exists()
        can_delete = shares.filter(can_delete=True).exists()
        return {'can_edit': can_edit, 'can_delete': can_delete, 'is_owner': False}


class FileDetailSerializer(FileSerializer):
    shares = FileShareSerializer(many=True, read_only=True)

    class Meta(FileSerializer.Meta):
        fields = FileSerializer.Meta.fields + ('shares',)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'type', 'title', 'message', 'data', 'is_read', 'created_at')
        read_only_fields = fields


class StorageNotificationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = StorageNotification
        fields = ('id', 'company', 'company_name', 'notification_type', 'message',
                  'is_read', 'created_at')
        read_only_fields = ('id', 'company', 'notification_type', 'message', 'created_at')
