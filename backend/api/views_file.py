import logging
import mimetypes

from django.db.models import Q
from django.http import FileResponse
from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import File, FileShare, StorageNotification, Company, CompanyGroup, User
from .serializers import (
    FileSerializer, FileDetailSerializer, FileShareSerializer,
    StorageNotificationSerializer,
)
from .permissions import IsSuperAdmin

logger = logging.getLogger(__name__)


class FileViewSet(viewsets.ModelViewSet):
    """CRUD for files with quota enforcement and RBAC scoping."""
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'size_bytes']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FileDetailSerializer
        return FileSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'superadmin':
            return File.objects.all()
        if not user.company:
            return File.objects.none()
        if user.role == 'admin':
            return File.objects.filter(company=user.company)
        user_groups = user.company_groups.all()
        return File.objects.filter(
            Q(uploaded_by=user) |
            Q(shares__shared_with_user=user) |
            Q(shares__shared_with_group__in=user_groups)
        ).filter(company=user.company).distinct()

    def create(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        company = user.company
        if not company:
            return Response(
                {'error': 'Utilisateur non associé à une entreprise.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_size = uploaded_file.size
        if not company.can_upload(file_size):
            self._create_quota_notification(company, 'quota_reached')
            return Response(
                {
                    'error': 'Quota de stockage dépassé. Impossible d\'uploader ce fichier.',
                    'storage_used': company.storage_used,
                    'storage_limit': company.storage_limit_bytes,
                    'storage_tier': company.storage_tier,
                },
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        mime_type = uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0] or 'application/octet-stream'
        name = request.data.get('name') or uploaded_file.name

        file_obj = File.objects.create(
            name=name,
            file=uploaded_file,
            mime_type=mime_type,
            size_bytes=file_size,
            company=company,
            uploaded_by=user,
            description=request.data.get('description', ''),
        )

        company.storage_used += file_size
        company.save(update_fields=['storage_used'])

        self._check_quota_warnings(company)

        serializer = FileSerializer(file_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if not self._can_edit(instance, user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous n\'avez pas la permission de modifier ce fichier.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not self._can_delete(instance, user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous n\'avez pas la permission de supprimer ce fichier.')
        instance.delete()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file_obj = self.get_object()
        try:
            response = FileResponse(file_obj.file.open('rb'), content_type=file_obj.mime_type)
            response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
            return response
        except FileNotFoundError:
            return Response({'error': 'Fichier non trouvé sur le serveur.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        file_obj = self.get_object()
        if not file_obj.is_previewable:
            return Response(
                {'error': 'Ce type de fichier ne supporte pas la prévisualisation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            response = FileResponse(file_obj.file.open('rb'), content_type=file_obj.mime_type)
            response['Content-Disposition'] = f'inline; filename="{file_obj.name}"'
            return response
        except FileNotFoundError:
            return Response({'error': 'Fichier non trouvé sur le serveur.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        file_obj = self.get_object()
        user = request.user

        if file_obj.uploaded_by != user and user.role not in ('superadmin', 'admin'):
            return Response(
                {'error': 'Seul le propriétaire du fichier peut le partager.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        shared_with_user_id = request.data.get('shared_with_user')
        shared_with_group_id = request.data.get('shared_with_group')
        can_edit = request.data.get('can_edit', False)
        can_delete = request.data.get('can_delete', False)

        if not shared_with_user_id and not shared_with_group_id:
            return Response(
                {'error': 'Spécifiez shared_with_user ou shared_with_group.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        share_data = {
            'file': file_obj,
            'shared_by': user,
            'can_edit': can_edit,
            'can_delete': can_delete,
        }

        if shared_with_user_id:
            try:
                target_user = User.objects.get(id=shared_with_user_id, company=file_obj.company)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Utilisateur non trouvé dans cette entreprise.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            FileShare.objects.update_or_create(
                file=file_obj, shared_with_user=target_user,
                defaults={**share_data, 'shared_with_user': target_user},
            )

        if shared_with_group_id:
            try:
                target_group = CompanyGroup.objects.get(id=shared_with_group_id, company=file_obj.company)
            except CompanyGroup.DoesNotExist:
                return Response(
                    {'error': 'Groupe non trouvé dans cette entreprise.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            FileShare.objects.update_or_create(
                file=file_obj, shared_with_group=target_group,
                defaults={**share_data, 'shared_with_group': target_group},
            )

        serializer = FileDetailSerializer(file_obj, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unshare(self, request, pk=None):
        file_obj = self.get_object()
        user = request.user

        if file_obj.uploaded_by != user and user.role not in ('superadmin', 'admin'):
            return Response(
                {'error': 'Seul le propriétaire du fichier peut gérer les partages.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        share_id = request.data.get('share_id')
        if not share_id:
            return Response({'error': 'share_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            share = FileShare.objects.get(id=share_id, file=file_obj)
            share.delete()
            return Response({'status': 'Partage supprimé.'})
        except FileShare.DoesNotExist:
            return Response({'error': 'Partage non trouvé.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def storage_info(self, request):
        user = request.user
        company = user.company
        if not company:
            return Response({'error': 'Non associé à une entreprise.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'storage_tier': company.storage_tier,
            'storage_used': company.storage_used,
            'storage_limit_bytes': company.storage_limit_bytes,
            'storage_percent_used': company.storage_percent_used,
            'storage_remaining': company.storage_remaining,
        })

    def _can_edit(self, file_obj, user):
        if user.role == 'superadmin':
            return True
        if file_obj.uploaded_by == user:
            return True
        if user.role == 'admin' and user.company == file_obj.company:
            return True
        return FileShare.objects.filter(
            file=file_obj, can_edit=True
        ).filter(
            Q(shared_with_user=user) | Q(shared_with_group__members=user)
        ).exists()

    def _can_delete(self, file_obj, user):
        if user.role == 'superadmin':
            return True
        if file_obj.uploaded_by == user:
            return True
        if user.role == 'admin' and user.company == file_obj.company:
            return True
        return FileShare.objects.filter(
            file=file_obj, can_delete=True
        ).filter(
            Q(shared_with_user=user) | Q(shared_with_group__members=user)
        ).exists()

    def _check_quota_warnings(self, company):
        pct = company.storage_percent_used
        if pct >= 100:
            self._create_quota_notification(company, 'quota_reached')
        elif pct >= 90:
            self._create_quota_notification(company, 'warning_90')
        elif pct >= 80:
            self._create_quota_notification(company, 'warning_80')

    def _create_quota_notification(self, company, notification_type):
        recent = StorageNotification.objects.filter(
            company=company, notification_type=notification_type, is_read=False
        ).exists()
        if recent:
            return
        messages = {
            'warning_80': f'L\'espace de stockage de {company.name} a atteint 80% de sa capacité.',
            'warning_90': f'L\'espace de stockage de {company.name} a atteint 90% de sa capacité.',
            'quota_reached': f'Le quota de stockage de {company.name} est atteint. Les uploads sont bloqués.',
        }
        StorageNotification.objects.create(
            company=company,
            notification_type=notification_type,
            message=messages[notification_type],
        )


class StorageNotificationViewSet(viewsets.ModelViewSet):
    """Notifications de quota de stockage pour les admins."""
    queryset = StorageNotification.objects.all()
    serializer_class = StorageNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'superadmin':
            return StorageNotification.objects.all()
        if user.role == 'admin' and user.company:
            return StorageNotification.objects.filter(company=user.company)
        return StorageNotification.objects.none()

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(StorageNotificationSerializer(notification).data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
