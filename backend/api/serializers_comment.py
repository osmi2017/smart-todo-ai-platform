from rest_framework import serializers
from .models import Comment, User

class CommentSerializer(serializers.ModelSerializer):
    """Serializer pour les commentaires"""
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    replies_count = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
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
    
    def get_replies(self, obj):
        """Récupère les réponses à ce commentaire"""
        replies = obj.replies.all()
        return CommentSerializer(replies, many=True).data
    
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
                username = word[1:].rstrip('.,!?;:')
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
