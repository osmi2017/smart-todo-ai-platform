from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_comment import CommentViewSet
from .views_meeting import MeetingViewSet, MeetingActionItemViewSet
from .views_file import FileViewSet, StorageNotificationViewSet
from .views_tasks import task_status

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'companies', views.CompanyViewSet)
router.register(r'groups', views.CompanyGroupViewSet)
router.register(r'users', views.UserManagementViewSet, basename='user-management')
router.register(r'projects', views.ProjectViewSet)
router.register(r'milestones', views.MilestoneViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'meetings', MeetingViewSet)
router.register(r'meeting-action-items', MeetingActionItemViewSet)
router.register(r'files', FileViewSet)
router.register(r'storage-notifications', StorageNotificationViewSet)

urlpatterns = [
    # Suivi des tâches Celery en arrière-plan (polling de secours ; le
    # temps réel passe par WebSocket, cf. api/consumers.py)
    path('jobs/<str:task_id>/', task_status, name='task-status'),
    path('', include(router.urls)),
]
