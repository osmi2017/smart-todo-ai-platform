import logging

from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F
from django.utils import timezone
from datetime import timedelta
import logging
import requests
from django.conf import settings

from .models import User, Project, Milestone, Task, ActivityLog, Comment, Company, CompanyGroup
from .serializers import (
    UserSerializer, UserRegisterSerializer, UserLoginSerializer,
    ProjectSerializer, MilestoneSerializer, TaskSerializer, 
    TaskDetailSerializer, ActivityLogSerializer, CommentSerializer,
    DashboardStatsSerializer, UserSimpleSerializer,
    CompanySerializer, CompanyGroupSerializer, CompanyGroupDetailSerializer,
    CompanyGroupMinimalSerializer,
)
from .permissions import (
    IsAdminOrReadOnly, IsOwnerOrReadOnly, IsSuperAdmin,
    IsCompanyAdmin, HasGroupAccess,
)
from .mixins import ActivityLogMixin
from .tasks import generate_project_report
from .events import emit_user_connected

logger = logging.getLogger(__name__)


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

    @action(detail=False, methods=['get'])
    def users(self, request):
        """List users, scoped by company for admins"""
        if not request.user.is_authenticated:
            return Response({'error': 'Non authentifié'}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user
        if user.role == 'superadmin':
            qs = User.objects.all()
        elif user.role == 'admin' and user.company:
            qs = User.objects.filter(company=user.company)
        else:
            return Response({'error': 'Accès refusé'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserSerializer(qs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            user = User.objects.filter(id=data['user']['id']).first()
            if user:
                ip_address = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() \
                    or request.META.get('REMOTE_ADDR')
                emit_user_connected(user, ip_address=ip_address)
            return Response(data, status=status.HTTP_200_OK)
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
        if user.role == 'superadmin':
            return Project.objects.all()
        if user.role == 'admin' and user.company:
            return Project.objects.filter(company=user.company)
        # Regular user: only projects whose groups they belong to
        user_groups = user.company_groups.all()
        return Project.objects.filter(
            Q(groups__in=user_groups) | Q(owner=user) | Q(members=user) | Q(managers=user)
        ).filter(company=user.company).distinct() if user.company else Project.objects.none()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, company=self.request.user.company)
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
        # Scope to same company
        base_qs = User.objects.exclude(id__in=excluded_users)
        if request.user.company:
            base_qs = base_qs.filter(company=request.user.company)

        if search:
            users = base_qs.filter(
                Q(username__icontains=search) | 
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )[:10]
        else:
            users = base_qs[:20]
        
        serializer = UserSimpleSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_group(self, request, pk=None):
        """Add a group to the project."""
        project = self.get_object()
        group_id = request.data.get('group_id')
        if not group_id:
            return Response({'error': 'group_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            group = CompanyGroup.objects.get(id=group_id)
            if project.company and group.company != project.company:
                return Response({'error': 'Le groupe doit appartenir à la même entreprise'}, status=status.HTTP_400_BAD_REQUEST)
        except CompanyGroup.DoesNotExist:
            return Response({'error': 'Groupe non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        project.groups.add(group)
        return Response({'status': 'Groupe ajouté au projet'})

    @action(detail=True, methods=['post'])
    def remove_group(self, request, pk=None):
        """Remove a group from the project."""
        project = self.get_object()
        group_id = request.data.get('group_id')
        if not group_id:
            return Response({'error': 'group_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        project.groups.remove(group_id)
        return Response({'status': 'Groupe retiré du projet'})

    @action(detail=True, methods=['get'])
    def project_groups(self, request, pk=None):
        """List groups linked to the project."""
        project = self.get_object()
        serializer = CompanyGroupMinimalSerializer(project.groups.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_manager(self, request, pk=None):
        """Add a project manager."""
        project = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        project.managers.add(target_user)
        if not project.members.filter(id=target_user.id).exists():
            project.members.add(target_user)
        return Response(UserSimpleSerializer(target_user).data)

    @action(detail=True, methods=['post'])
    def remove_manager(self, request, pk=None):
        """Remove a project manager."""
        project = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        project.managers.remove(user_id)
        return Response({'status': 'Chef de projet retiré'})

    @action(detail=True, methods=['post'])
    def generate_report(self, request, pk=None):
        """Déclenche la génération (en arrière-plan, via Celery) d'un rapport
        complet du projet. Répond instantanément avec un task_id ; le rapport
        généré est ensuite disponible en téléchargement (File) et son achèvement
        est signalé en temps réel via notification WebSocket."""
        project = self.get_object()
        task = generate_project_report.delay(project.id, request.user.id)
        return Response(
            {'status': 'processing', 'task_id': task.id, 'project_id': project.id},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['get'])
    def project_managers(self, request, pk=None):
        """List project managers."""
        project = self.get_object()
        serializer = UserSimpleSerializer(project.managers.all(), many=True)
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
        if user.role == 'superadmin':
            return Milestone.objects.all()
        if user.role == 'admin' and user.company:
            return Milestone.objects.filter(project__company=user.company)
        user_groups = user.company_groups.all()
        return Milestone.objects.filter(
            Q(project__groups__in=user_groups) |
            Q(project__owner=user) |
            Q(project__members=user)
        ).filter(project__company=user.company).distinct() if user.company else Milestone.objects.none()
    
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
            logger.warning(
                "ML service unavailable for risk prediction on milestone %s, using fallback",
                milestone.id,
            )
        
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
        
    def create(self, request, *args, **kwargs):
        print("🔍 Données reçues:", request.data)
        return super().create(request, *args, **kwargs)
        



class TaskViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    print('ici')
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
        if user.role == 'superadmin':
            return Task.objects.all()
        if user.role == 'admin' and user.company:
            return Task.objects.filter(project__company=user.company)
        user_groups = user.company_groups.all()
        if user.company:
            return Task.objects.filter(
                Q(project__groups__in=user_groups) |
                Q(project__owner=user) |
                Q(project__members=user) |
                Q(assigned_to=user)
            ).filter(project__company=user.company).distinct()
        return Task.objects.none()
    
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
        if user.role == 'superadmin':
            projects = Project.objects.all()
        elif user.role == 'admin' and user.company:
            projects = Project.objects.filter(company=user.company)
        elif user.company:
            user_groups = user.company_groups.all()
            projects = Project.objects.filter(
                Q(groups__in=user_groups) | Q(owner=user) | Q(members=user)
            ).filter(company=user.company).distinct()
        else:
            projects = Project.objects.none()

        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status='completed').count()
        in_progress_tasks = tasks.filter(status='in_progress').count()
        review_tasks = tasks.filter(status='review').count()
        blocked_tasks = tasks.filter(status='blocked').count()
        todo_tasks = tasks.filter(status='todo').count()

        delayed_count = tasks.filter(
            deadline__lt=today,
            status__in=['todo', 'in_progress', 'blocked']
        ).count()

        productivity_score = round(
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        )

        day_names = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
        weekly_activity = []
        for i in range(7):
            day_date = week_start + timedelta(days=i)
            count = tasks.filter(updated_at__date=day_date).count()
            weekly_activity.append({'day': day_names[i], 'tasks': count})

        project_progress = []
        for proj in projects[:8]:
            proj_tasks = proj.tasks.count()
            proj_completed = proj.tasks.filter(status='completed').count()
            progress = round((proj_completed / proj_tasks * 100) if proj_tasks > 0 else 0)
            project_progress.append({
                'name': proj.name,
                'progress': progress,
                'color': proj.color or '#4299E1',
            })

        data = {
            'total_projects': projects.count(),
            'active_projects': projects.filter(
                status__in=['in_progress', 'not_started']
            ).count(),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'delayed_tasks': delayed_count,
            'productivity_score': productivity_score,

            'tasks_by_priority': {
                'low': tasks.filter(priority=1).count(),
                'medium': tasks.filter(priority=2).count(),
                'high': tasks.filter(priority=3).count(),
                'critical': tasks.filter(priority=4).count(),
            },

            'tasks_by_status': {
                'todo': todo_tasks,
                'in_progress': in_progress_tasks,
                'review': review_tasks,
                'blocked': blocked_tasks,
                'completed': completed_tasks,
            },

            'upcoming_deadlines': TaskSerializer(
                tasks.filter(
                    deadline__gte=today,
                    deadline__lte=today + timedelta(days=7),
                    status__in=['todo', 'in_progress']
                ).order_by('deadline')[:10],
                many=True
            ).data,

            'recent_activities': ActivityLogSerializer(
                ActivityLog.objects.filter(user=user)[:20],
                many=True
            ).data,

            'weekly_activity': weekly_activity,
            'project_progress': project_progress,
        }

        return Response(data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        user = request.user
        today = timezone.now().date()
        time_range = request.query_params.get('range', 'week')

        if time_range == 'month':
            start_date = today - timedelta(days=30)
        elif time_range == 'quarter':
            start_date = today - timedelta(days=90)
        elif time_range == 'year':
            start_date = today - timedelta(days=365)
        else:
            start_date = today - timedelta(days=7)

        tasks = self.get_queryset()
        period_tasks = tasks.filter(created_at__date__gte=start_date)
        if user.role == 'superadmin':
            projects = Project.objects.all()
        elif user.role == 'admin' and user.company:
            projects = Project.objects.filter(company=user.company)
        elif user.company:
            user_groups = user.company_groups.all()
            projects = Project.objects.filter(
                Q(groups__in=user_groups) | Q(owner=user) | Q(members=user)
            ).filter(company=user.company).distinct()
        else:
            projects = Project.objects.none()

        total = period_tasks.count()
        completed = period_tasks.filter(status='completed').count()
        completion_rate = round((completed / total * 100) if total > 0 else 0)

        avg_time = period_tasks.filter(
            actual_time__isnull=False
        ).aggregate(Avg('actual_time'))['actual_time__avg'] or 0

        delayed_count = period_tasks.filter(
            deadline__lt=today,
            status__in=['todo', 'in_progress', 'blocked']
        ).count()

        ml_tasks = period_tasks.filter(predicted_priority__isnull=False)
        ml_total = ml_tasks.count()
        if ml_total > 0:
            ml_correct = ml_tasks.filter(predicted_priority=F('priority')).count()
            ml_accuracy = round(ml_correct / ml_total * 100)
        else:
            ml_accuracy = 0

        num_days = (today - start_date).days + 1
        trend_data = []
        for i in range(min(num_days, 30)):
            day_date = start_date + timedelta(days=i)
            created = tasks.filter(created_at__date=day_date).count()
            done = tasks.filter(completed_at__date=day_date).count()
            trend_data.append({
                'name': day_date.strftime('%d/%m'),
                'taches': created,
                'completees': done,
            })

        priority_data = [
            {'name': 'Basse', 'value': period_tasks.filter(priority=1).count(), 'color': '#718096'},
            {'name': 'Moyenne', 'value': period_tasks.filter(priority=2).count(), 'color': '#4299E1'},
            {'name': 'Haute', 'value': period_tasks.filter(priority=3).count(), 'color': '#ED8936'},
            {'name': 'Critique', 'value': period_tasks.filter(priority=4).count(), 'color': '#F56565'},
        ]

        project_data = []
        for proj in projects[:10]:
            proj_total = proj.tasks.count()
            proj_completed = proj.tasks.filter(status='completed').count()
            progress = round((proj_completed / proj_total * 100) if proj_total > 0 else 0)
            project_data.append({
                'name': proj.name,
                'completees': proj_completed,
                'total': proj_total,
                'progression': progress,
            })

        members = User.objects.filter(
            Q(tasks__project__in=projects)
        ).distinct()
        user_performance = []
        for member in members[:20]:
            member_tasks = period_tasks.filter(assigned_to=member)
            m_total = member_tasks.count()
            m_completed = member_tasks.filter(status='completed').count()
            m_delayed = member_tasks.filter(
                deadline__lt=today,
                status__in=['todo', 'in_progress', 'blocked']
            ).count()
            if m_total > 0:
                user_performance.append({
                    'user': member.full_name or member.username,
                    'taches': m_total,
                    'completees': m_completed,
                    'retard': m_delayed,
                })

        data = {
            'completion_rate': completion_rate,
            'avg_task_time': round(avg_time, 1),
            'delayed_count': delayed_count,
            'ml_accuracy': ml_accuracy,
            'trend_data': trend_data,
            'priority_data': priority_data,
            'project_data': project_data,
            'user_performance': user_performance,
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


class CompanyViewSet(viewsets.ModelViewSet):
    """Only SuperAdmin can create/manage companies."""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug']
    ordering_fields = ['name', 'created_at']


class CompanyGroupViewSet(viewsets.ModelViewSet):
    """Company groups — admin/project manager manages groups within their company."""
    queryset = CompanyGroup.objects.all()
    serializer_class = CompanyGroupSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['company']
    search_fields = ['name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CompanyGroupDetailSerializer
        return CompanyGroupSerializer

    def check_group_write_permission(self, group):
        """Project managers can only modify/delete groups they created."""
        user = self.request.user
        if user.role in ('superadmin', 'admin'):
            return True
        if group.created_by == user:
            return True
        return False

    def get_queryset(self):
        user = self.request.user
        if user.role == 'superadmin':
            return CompanyGroup.objects.all()
        if user.company:
            return CompanyGroup.objects.filter(company=user.company)
        return CompanyGroup.objects.none()
        
    def create(self, request, *args, **kwargs):
        """Override create to log incoming data."""
        print("=" * 60)
        print("📥 REQUÊTE POST REÇUE")
        print(f"👤 Utilisateur: {request.user} (ID: {request.user.id})")
        print(f"📦 Données reçues: {request.data}")
        print(f"🔑 Clés du payload: {list(request.data.keys())}")
        print(f"📋 Type de données: {type(request.data)}")
        print("-" * 60)
        
        # Imprimer les valeurs individuelles
        for key, value in request.data.items():
            print(f"  {key}: {value} (type: {type(value).__name__})")
        
        print("=" * 60)
        
        # Continuer avec le traitement normal
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'superadmin':
            serializer.save(created_by=user)
        else:
            serializer.save(company=user.company, created_by=user)

    def perform_update(self, serializer):
        group = self.get_object()
        user = self.request.user
        if not self.check_group_write_permission(group):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous ne pouvez modifier que les groupes que vous avez créés.')
        if user.role != 'superadmin':
            serializer.save(company=user.company)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        if not self.check_group_write_permission(instance):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous ne pouvez supprimer que les groupes que vous avez créés.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id, company=group.company)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé dans cette entreprise'}, status=status.HTTP_404_NOT_FOUND)
        group.members.add(target_user)
        return Response({'status': 'Membre ajouté au groupe'})

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        group.members.remove(target_user)
        return Response({'status': 'Membre retiré du groupe'})

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        group = self.get_object()
        serializer = UserSimpleSerializer(group.members.all(), many=True)
        return Response(serializer.data)


class UserManagementViewSet(viewsets.ModelViewSet):
    """Admin manages users within their company; SuperAdmin manages all."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsCompanyAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'company']
    search_fields = ['username', 'email', 'first_name', 'last_name']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'superadmin':
            return User.objects.all()
        if user.company:
            return User.objects.filter(company=user.company)
        return User.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        password = self.request.data.get('password', 'changeme123')
        if user.role != 'superadmin':
            instance = serializer.save(company=user.company)
        else:
            instance = serializer.save()
        instance.set_password(password)
        instance.save()

    def perform_update(self, serializer):
        user = self.request.user
        password = self.request.data.get('password')
        if user.role != 'superadmin':
            instance = serializer.save(company=user.company)
        else:
            instance = serializer.save()
        if password:
            instance.set_password(password)
            instance.save()

    @action(detail=True, methods=['post'])
    def change_role(self, request, pk=None):
        target_user = self.get_object()
        new_role = request.data.get('role')
        if new_role not in ('admin', 'user'):
            return Response({'error': 'Role invalide. Choix: admin, user'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == 'admin' and new_role == 'superadmin':
            return Response({'error': 'Seul un SuperAdmin peut promouvoir en SuperAdmin'}, status=status.HTTP_403_FORBIDDEN)
        target_user.role = new_role
        target_user.save(update_fields=['role'])
        return Response(UserSerializer(target_user).data)


