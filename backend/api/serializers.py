from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Project, Milestone, Task, ActivityLog, Comment
import jwt
from django.conf import settings
from datetime import datetime, timedelta


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 
                 'avatar', 'bio', 'avg_completion_time', 'delay_rate', 'date_joined')
        read_only_fields = ('id', 'avg_completion_time', 'delay_rate', 'date_joined')


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
                    'message': 'Connexion réussie'
                }
            raise serializers.ValidationError("Identifiants incorrects")
        raise serializers.ValidationError("Username et password requis")


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    members_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    milestones_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'progress', 'risk_score', 'owner')  # ← Ajoute 'owner' ici
    
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
        
class CommentSerializer(serializers.ModelSerializer):
    """Serializer pour les commentaires"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    replies_count = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
class Meta:
    model = Comment
    fields = [
            'id', 'content', 'task', 'author', 'author_name', 'author_avatar',
            'author_email', 'parent', 'replies', 'replies_count', 'edited',
            'attachments', 'mentions', 'created_at', 'updated_at', 'time_ago'
    ]
    read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'edited']
    
    def get_replies_count(self, obj):
        return obj.replies.count()
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        from django.utils import timezone
        return timesince(obj.created_at, timezone.now())
    
    def create(self, validated_data):
        # Ajouter automatiquement l'auteur
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        
        # Détecter les mentions (@username)
        content = validated_data.get('content', '')
        mentions = []
        words = content.split()
        for word in words:
            if word.startswith('@') and len(word) > 1:
                username = word[1:]
                try:
                    user = User.objects.get(username=username)
                    mentions.append(user.id)
                except User.DoesNotExist:
                    pass
        validated_data['mentions'] = mentions
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        validated_data['edited'] = True
        return super().update(instance, validated_data)        
