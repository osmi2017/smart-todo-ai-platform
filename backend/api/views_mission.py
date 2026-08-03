import json
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from .models import Mission, MissionMember
from .serializers_mission import MissionSerializer, MissionDetailSerializer


def _get_redis():
    try:
        import redis as redis_lib
        redis_url = getattr(settings, 'CELERY_BROKER_URL', None) or getattr(settings, 'REDIS_URL', None)
        if not redis_url:
            redis_url = 'redis://redis:6379/0'
        return redis_lib.from_url(redis_url, decode_responses=True)
    except Exception:
        return None


MISSION_DETAIL_TTL = 300  # 5 minutes
MISSION_LIST_TTL = 120    # 2 minutes


class MissionViewSet(viewsets.ModelViewSet):
    queryset = Mission.objects.all()
    serializer_class = MissionSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MissionDetailSerializer
        return MissionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'superadmin':
            return Mission.objects.all()
        if user.role == 'admin' and user.company:
            return Mission.objects.filter(company=user.company)
        if user.company:
            return Mission.objects.filter(
                Q(members__user=user) | Q(created_by=user),
                company=user.company
            ).distinct()
        return Mission.objects.none()

    def list(self, request, *args, **kwargs):
        redis_client = _get_redis()
        user_id = request.user.id
        cache_key = f'mission_list:{user_id}'

        if redis_client:
            cached = redis_client.get(cache_key)
            if cached:
                return Response(json.loads(cached))

        response = super().list(request, *args, **kwargs)

        if redis_client and response.status_code == 200:
            redis_client.setex(cache_key, MISSION_LIST_TTL, json.dumps(response.data))

        return response

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        redis_client = _get_redis()
        cache_key = f'mission_detail:{request.user.id}:{pk}'

        if redis_client:
            cached = redis_client.get(cache_key)
            if cached:
                return Response(json.loads(cached))

        response = super().retrieve(request, *args, **kwargs)

        if redis_client and response.status_code == 200:
            redis_client.setex(cache_key, MISSION_DETAIL_TTL, json.dumps(response.data))

        return response

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, company=self.request.user.company)
        self._invalidate_list_cache()

    def perform_update(self, serializer):
        self._invalidate_list_cache()
        self._invalidate_detail_cache(serializer.instance.id)
        serializer.save()

    def perform_destroy(self, instance):
        self._invalidate_list_cache()
        self._invalidate_detail_cache(instance.id)
        instance.delete()

    def _invalidate_list_cache(self):
        redis_client = _get_redis()
        if redis_client:
            for key in redis_client.scan_iter('mission_list:*'):
                redis_client.delete(key)

    def _invalidate_detail_cache(self, mission_id):
        redis_client = _get_redis()
        if redis_client:
            for key in redis_client.scan_iter(f'mission_detail:*:{mission_id}'):
                redis_client.delete(key)

    @action(detail=True, methods=['post'])
    def end_mission(self, request, pk=None):
        mission = self.get_object()
        if mission.leader != request.user:
            return Response(
                {'error': 'Seul le chef de mission peut mettre fin à la mission'},
                status=status.HTTP_403_FORBIDDEN
            )
        mission.status = 'completed'
        mission.save()
        self._invalidate_list_cache()
        self._invalidate_detail_cache(mission.id)
        return Response({'status': 'completed'})

    @action(detail=True, methods=['post'])
    def cancel_mission(self, request, pk=None):
        mission = self.get_object()
        if mission.leader != request.user:
            return Response(
                {'error': 'Seul le chef de mission peut annuler la mission'},
                status=status.HTTP_403_FORBIDDEN
            )
        mission.status = 'cancelled'
        mission.save()
        self._invalidate_list_cache()
        self._invalidate_detail_cache(mission.id)
        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['post'])
    def start_mission(self, request, pk=None):
        mission = self.get_object()
        if mission.leader != request.user:
            return Response(
                {'error': 'Seul le chef de mission peut démarrer la mission'},
                status=status.HTTP_403_FORBIDDEN
            )
        if mission.status != 'planned':
            return Response(
                {'error': 'Seule une mission planifiée peut être démarrée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        mission.status = 'in_progress'
        mission.save()
        self._invalidate_list_cache()
        self._invalidate_detail_cache(mission.id)
        return Response({'status': 'in_progress'})

    @action(detail=True, methods=['put', 'patch'])
    def update_costs(self, request, pk=None):
        mission = self.get_object()
        for field in ['cost_per_diem', 'cost_accommodation', 'cost_transport', 'cost_other']:
            if field in request.data:
                setattr(mission, field, request.data[field])
        mission.save()
        self._invalidate_list_cache()
        self._invalidate_detail_cache(mission.id)
        serializer = MissionSerializer(mission, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['put', 'patch'])
    def update_reports(self, request, pk=None):
        mission = self.get_object()
        if mission.leader != request.user and request.user.role not in ('superadmin', 'admin'):
            return Response(
                {'error': 'Seul le chef de mission peut modifier les rapports'},
                status=status.HTTP_403_FORBIDDEN
            )
        if 'expense_report' in request.data:
            mission.expense_report = request.data['expense_report']
        if 'mission_report' in request.data:
            mission.mission_report = request.data['mission_report']
        mission.save()
        self._invalidate_list_cache()
        self._invalidate_detail_cache(mission.id)
        serializer = MissionSerializer(mission, context={'request': request})
        return Response(serializer.data)
