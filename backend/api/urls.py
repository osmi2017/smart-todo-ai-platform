from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views_comment import CommentViewSet  # ← Import ajouté

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'projects', views.ProjectViewSet)
router.register(r'milestones', views.MilestoneViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'comments', CommentViewSet)  # ← Route ajoutée

urlpatterns = [
    path('', include(router.urls)),
]
