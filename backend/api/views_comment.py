from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Comment
from .serializers_comment import CommentSerializer  # ← Changé ici
from .events import event_actor
from .permissions import IsAuthorOrReadOnly

class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet pour les commentaires"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    
    def get_queryset(self):
        queryset = Comment.objects.all()
        
        # Filtrer par tâche
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        # Filtrer par auteur
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
        
        return queryset.select_related('author', 'task').prefetch_related('replies')
    
    @transaction.atomic
    def perform_create(self, serializer):
        with event_actor(self.request.user):
            serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """Ajouter une réponse à un commentaire"""
        parent_comment = self.get_object()
        
        serializer = CommentSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            with transaction.atomic(), event_actor(request.user):
                serializer.save(
                    task=parent_comment.task,
                    parent=parent_comment,
                    author=request.user
                )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def for_task(self, request):
        """Récupère tous les commentaires pour une tâche spécifique"""
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {'error': 'task_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comments = Comment.objects.filter(task_id=task_id).select_related('author')
        serializer = self.get_serializer(comments, many=True)
        return Response(serializer.data)
