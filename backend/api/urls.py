from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_comment import CommentViewSet
from .views_meeting import MeetingViewSet, MeetingActionItemViewSet
from .views_file import FileViewSet, StorageNotificationViewSet
from .views_mission import MissionViewSet
from .views_currency import CurrencyListView
from .views_geocode import GeocodeView
from .views_tasks import task_status

search_view = views.GlobalSearchView.as_view()

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'companies', views.CompanyViewSet)
router.register(r'groups', views.CompanyGroupViewSet)
router.register(r'users', views.UserManagementViewSet, basename='user-management')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'projects', views.ProjectViewSet)
router.register(r'milestones', views.MilestoneViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'meetings', MeetingViewSet)
router.register(r'meeting-action-items', MeetingActionItemViewSet)
router.register(r'files', FileViewSet)
router.register(r'storage-notifications', StorageNotificationViewSet)
router.register(r'missions', MissionViewSet)

urlpatterns = [
    path('jobs/<str:task_id>/', task_status, name='task-status'),
    path('search/', search_view, name='global-search'),
    path('currencies/', CurrencyListView.as_view(), name='currency-list'),
    path('geocode/', GeocodeView.as_view(), name='geocode'),
    path('', include(router.urls)),
]
