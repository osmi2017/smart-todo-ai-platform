from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_comment import CommentViewSet
from .views_meeting import MeetingViewSet, MeetingActionItemViewSet

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'projects', views.ProjectViewSet)
router.register(r'milestones', views.MilestoneViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'meetings', MeetingViewSet)
router.register(r'meeting-action-items', MeetingActionItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
