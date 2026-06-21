from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from datetime import timedelta
import logging
import requests
from django.conf import settings

from .models import User, Project, Milestone, Task, ActivityLog, Comment
from .serializers import (
    UserSerializer, UserRegisterSerializer, UserLoginSerializer,
    ProjectSerializer, MilestoneSerializer, TaskSerializer, 
    TaskDetailSerializer, ActivityLogSerializer, CommentSerializer,
    DashboardStatsSerializer, UserSimpleSerializer
)

logger = logging.getLogger(__name__)
from .permissions import IsAdminOrReadOnly, IsOwnerOrReadOnly
from .mixins import ActivityLogMixin


class AuthViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'user': UserSerializer(user).data,
                'message': 'Inscription réussie'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        return Response({'error': 'Non authentifié'}, status=status.HTTP_401_UNAUTHORIZED)


class ProjectViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'deadline', 'progress']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Project.objects.all()
        return Project.objects.filter(Q(owner=user) | Q(members=user)).distinct()
    
    def perform_create(self, serializer):
        # Ici on assigne l'utilisateur connecté comme owner
        serializer.save(owner=self.request.user)
        self.log_activity('create', 'project', serializer.instance)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        project = self.get_object()
        
        tasks = project.tasks.all()
        completed_tasks = tasks.filter(status='completed')
        delayed_tasks = tasks.filter(status='blocked', deadline__lt=timezone.now().date())
        
        stats = {
            'total_tasks': tasks.count(),
            'completed_tasks': completed_tasks.count(),
            'progress': project.progress,
            'delayed_tasks': delayed_tasks.count(),
            'members_count': project.members.count(),
            'milestones_count': project.milestones.count(),
            'completion_rate': (completed_tasks.count() / tasks.count() * 100) if tasks.count() > 0 else 0,
            'avg_task_time': tasks.filter(actual_time__isnull=False).aggregate(Avg('actual_time'))['actual_time__avg'],
            'total_time_spent': tasks.aggregate(Sum('actual_time'))['actual_time__sum'] or 0,
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Récupère la liste des membres du projet"""
        project = self.get_object()
        members = project.members.all()
        serializer = UserSimpleSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Ajoute un membre au projet"""
        project = self.get_object()
        user_id = request.data.get('user_id')
        email = request.data.get('email')
        try:
            if user_id:
                user = User.objects.get(id=user_id)
            elif email:
                user = User.objects.get(email=email)
            else:
                return Response(
                    {'error': 'user_id ou email requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if project.members.filter(id=user.id).exists():
                return Response(
                    {'error': 'Cet utilisateur est déjà membre du projet'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            project.members.add(user)
            
            # Log l'activité
            ActivityLog.objects.create(
                user=request.user,
                action='add_member',
                entity_type='project',
                entity_id=project.id,
                metadata={'member': user.username}
            )
            
            serializer = UserSimpleSerializer(user)
            return Response(serializer.data)
            
        except User.DoesNotExist:
                return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """Retire un membre du projet"""
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            
            # Vérifier qu'on ne retire pas le propriétaire
            if user.id == project.owner.id:
                return Response(
                    {'error': 'Impossible de retirer le propriétaire du projet'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            project.members.remove(user)
            
            # Log l'activité
            ActivityLog.objects.create(
                user=request.user,
                action='remove_member',
                entity_type='project',
                entity_id=project.id,
                metadata={'member': user.username}
            )
            
            return Response({'status': 'Membre retiré'})
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def available_users(self, request, pk=None):
        """Récupère les utilisateurs disponibles à ajouter"""
        project = self.get_object()
        
        # Exclure le propriétaire et les membres actuels
        current_members = project.members.all().values_list('id', flat=True)
        excluded_users = list(current_members) + [project.owner.id]
        
        # Recherche optionnelle
        search = request.query_params.get('search', '')
        if search:
            users = User.objects.filter(
                Q(username__icontains=search) | 
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            ).exclude(id__in=excluded_users)[:10]
        else:
            users = User.objects.exclude(id__in=excluded_users)[:20]
        
        serializer = UserSimpleSerializer(users, many=True)
        return Response(serializer.data)


class MilestoneViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'project']
    search_fields = ['name', 'description']
    ordering_fields = ['due_date', 'progress']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Milestone.objects.all()
        return Milestone.objects.filter(
            project__in=Project.objects.filter(Q(owner=user) | Q(members=user))
        )
    
    def perform_create(self, serializer):
        milestone = serializer.save()
        self.log_activity('create', 'milestone', milestone)
    
    @action(detail=True, methods=['post'])
    def predict_risk(self, request, pk=None):
        milestone = self.get_object()
        
        # Appel au service ML pour prédire le risque
        try:
            response = requests.post(
                f"{settings.ML_SERVICE_URL}/predict/risk",
                json={
                    'milestone_id': milestone.id,
                    'due_date': milestone.due_date.isoformat(),
                    'current_progress': milestone.progress,
                    'tasks_count': milestone.tasks.count(),
                    'completed_tasks': milestone.tasks.filter(status='completed').count(),
                    'delayed_tasks': milestone.tasks.filter(
                        status='blocked', 
                        deadline__lt=timezone.now().date()
                    ).count()
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                milestone.risk_score = data.get('risk_score', 0)
                milestone.save()
                return Response({'risk_score': milestone.risk_score})
                
        except requests.RequestException:
            pass
        
        # Calcul fallback si ML indisponible
        tasks = milestone.tasks.all()
        if tasks.exists():
            remaining_tasks = tasks.exclude(status='completed').count()
            delayed_tasks = tasks.filter(
                status='blocked', 
                deadline__lt=timezone.now().date()
            ).count()
            
            risk = (remaining_tasks / tasks.count() * 0.5 + 
                   delayed_tasks / tasks.count() * 0.5) * 100
            milestone.risk_score = min(risk, 100)
            milestone.save()
        
        return Response({'risk_score': milestone.risk_score})
    
    def _log_activity(self, action, entity_type, instance):
        ActivityLog.objects.create(
            user=self.request.user,
            action=action,
            entity_type=entity_type,
            entity_id=instance.id,
            metadata={'name': str(instance)}
        )
        



class TaskViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'project', 'milestone', 'assigned_to']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['deadline', 'priority', 'created_at']
    
    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update']:
            return TaskDetailSerializer
        return TaskSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Task.objects.all()
        return Task.objects.filter(
            Q(project__owner=user) | 
            Q(project__members=user) | 
            Q(assigned_to=user)
        ).distinct()
    
    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        
        # Appel au service ML pour prédictions
        self._predict_task_attributes(task)
        self.log_activity('create', 'task', task)
    
    def perform_update(self, serializer):
        task = serializer.save()
        
        # Si la tâche est marquée comme terminée, enregistrer le temps réel
        if task.status == 'completed' and not task.actual_time:
            # Calculer le temps passé (simplifié)
            time_spent = (timezone.now() - task.created_at).total_seconds() / 3600
            task.actual_time = time_spent
            task.save()
        
        self.log_activity('update', 'task', task)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        user = request.user
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        
        tasks = self.get_queryset()
        
        data = {
            'total_tasks': tasks.count(),
            'completed_tasks': tasks.filter(status='completed').count(),
            'in_progress_tasks': tasks.filter(status='in_progress').count(),
            'todo_tasks': tasks.filter(status='todo').count(),
            'blocked_tasks': tasks.filter(status='blocked').count(),
            
            'tasks_by_priority': {
                'low': tasks.filter(priority=1).count(),
                'medium': tasks.filter(priority=2).count(),
                'high': tasks.filter(priority=3).count(),
                'critical': tasks.filter(priority=4).count(),
            },
            
            'upcoming_deadlines': TaskSerializer(
                tasks.filter(
                    deadline__gte=today,
                    deadline__lte=today + timedelta(days=7),
                    status__in=['todo', 'in_progress']
                ).order_by('deadline')[:10],
                many=True
            ).data,
            
            'delayed_tasks': TaskSerializer(
                tasks.filter(
                    deadline__lt=today,
                    status__in=['todo', 'in_progress', 'blocked']
                )[:10],
                many=True
            ).data,
            
            'recent_activities': ActivityLogSerializer(
                ActivityLog.objects.filter(user=user)[:20],
                many=True
            ).data,
            
            'productivity_stats': {
                'tasks_completed_this_week': tasks.filter(
                    status='completed',
                    updated_at__date__gte=week_start
                ).count(),
                'avg_completion_time': tasks.filter(
                    actual_time__isnull=False
                ).aggregate(Avg('actual_time'))['actual_time__avg'] or 0,
            }
        }
        
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def predict(self, request, pk=None):
        task = self.get_object()
        self._predict_task_attributes(task)
        return Response({
            'predicted_time': task.predicted_time,
            'delay_probability': task.delay_probability,
            'predicted_priority': task.predicted_priority
        })
    
    def _predict_task_attributes(self, task):
        """Appelle le service ML pour prédire les attributs de la tâche"""
        try:
            response = requests.post(
                f"{settings.ML_SERVICE_URL}/predict/task",
                json={
                    'task_id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'priority': task.priority,
                    'project_id': task.project_id,
                    'milestone_id': task.milestone_id,
                    'assigned_to_id': task.assigned_to_id,
                    'estimated_time': task.estimated_time,
                    'deadline': task.deadline.isoformat() if task.deadline else None,
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                task.predicted_time = data.get('predicted_time')
                task.delay_probability = data.get('delay_probability')
                task.predicted_priority = data.get('predicted_priority')
                task.save(update_fields=['predicted_time', 'delay_probability', 'predicted_priority'])
                
        except requests.RequestException as e:
            logger.warning("ML Service error: %s", e)
    

