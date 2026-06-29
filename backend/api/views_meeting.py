from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.utils import timezone

from .models import (
    Meeting, MeetingParticipant, MeetingSummary, MeetingActionItem,
    ActivityLog, Project,
)
from .serializers_meeting import (
    MeetingSerializer, MeetingDetailSerializer,
    MeetingParticipantSerializer, MeetingSummarySerializer,
    MeetingActionItemSerializer,
)
from .services.ai_service import transcribe_audio, summarize_meeting, extract_action_items
from .services.integrations import GoogleCalendarService, SlackService


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MeetingDetailSerializer
        return MeetingSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'superadmin':
            return Meeting.objects.all()
        if user.role == 'admin' and user.company:
            return Meeting.objects.filter(
                Q(organizer__company=user.company) | Q(project__company=user.company)
            ).distinct()
        return Meeting.objects.filter(
            Q(organizer=user) | Q(participants__user=user)
        ).distinct()

    def perform_create(self, serializer):
        meeting = serializer.save(organizer=self.request.user)
        MeetingParticipant.objects.create(
            meeting=meeting, user=self.request.user, role='organizer',
        )
        self._log_activity('create', 'meeting', meeting)

    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        meeting = self.get_object()
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'attendee')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if meeting.participants.filter(user_id=user_id).exists():
            return Response(
                {'error': 'User is already a participant'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant = MeetingParticipant.objects.create(
            meeting=meeting, user_id=user_id, role=role,
        )
        return Response(
            MeetingParticipantSerializer(participant).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'])
    def remove_participant(self, request, pk=None):
        meeting = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            participant = meeting.participants.get(user_id=user_id)
            if participant.role == 'organizer':
                return Response(
                    {'error': 'Cannot remove the organizer'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            participant.delete()
            return Response({'status': 'Participant removed'})
        except MeetingParticipant.DoesNotExist:
            return Response(
                {'error': 'Participant not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=['post'])
    def transcribe(self, request, pk=None):
        """Transcribe the meeting's audio file using OpenAI Whisper"""
        meeting = self.get_object()

        if not meeting.audio_file:
            return Response(
                {'error': 'No audio file uploaded'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = transcribe_audio(meeting.audio_file.path)

        if result['transcript']:
            meeting.transcript = result['transcript']
            meeting.save(update_fields=['transcript'])

        if result['error']:
            return Response(
                {'transcript': result['transcript'], 'error': result['error']},
                status=status.HTTP_200_OK if result['transcript'] else status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({'transcript': meeting.transcript})

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Run full AI processing: transcribe (if audio), summarize, extract action items"""
        meeting = self.get_object()

        # Step 1: Transcribe audio if present and no transcript yet
        if meeting.audio_file and not meeting.transcript:
            result = transcribe_audio(meeting.audio_file.path)
            if result['transcript']:
                meeting.transcript = result['transcript']
                meeting.save(update_fields=['transcript'])

        content = meeting.transcript or meeting.raw_notes
        if not content:
            return Response(
                {'error': 'No content to process. Upload audio or add notes first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 2: Generate summary
        participant_names = list(
            meeting.participants.values_list('user__username', flat=True)
        )
        summary_result = summarize_meeting(content, meeting.raw_notes)

        MeetingSummary.objects.update_or_create(
            meeting=meeting,
            defaults={
                'summary_text': summary_result['summary_text'],
                'key_points': summary_result['key_points'],
                'decisions': summary_result['decisions'],
                'follow_ups': summary_result['follow_ups'],
                'model_used': summary_result.get('model_used', 'fallback'),
            },
        )

        # Step 3: Extract action items
        action_result = extract_action_items(content, meeting.raw_notes, participant_names)

        created_items = []
        for item_data in action_result.get('action_items', []):
            assigned_user = None
            assigned_name = item_data.get('assigned_to')
            if assigned_name:
                from .models import User
                assigned_user = User.objects.filter(username__iexact=assigned_name).first()

            action_item = MeetingActionItem.objects.create(
                meeting=meeting,
                title=item_data.get('title', 'Untitled'),
                description=item_data.get('description', ''),
                priority=item_data.get('priority', 2),
                assigned_to=assigned_user,
                deadline=item_data.get('deadline'),
            )
            created_items.append(action_item)

        # Mark as processed
        error = summary_result.get('error', '') or action_result.get('error', '')
        meeting.ai_processed = True
        meeting.ai_processing_error = error
        meeting.save(update_fields=['ai_processed', 'ai_processing_error'])

        self._log_activity('update', 'meeting', meeting)

        return Response({
            'summary': MeetingSummarySerializer(meeting.summary).data,
            'action_items': MeetingActionItemSerializer(created_items, many=True).data,
            'processing_error': error,
        })

    @action(detail=True, methods=['post'], url_path='action-items/(?P<item_id>[0-9]+)/convert')
    def convert_action_item(self, request, pk=None, item_id=None):
        """Convert a meeting action item into a project task"""
        meeting = self.get_object()
        project_id = request.data.get('project_id')

        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            action_item = meeting.action_items.get(id=item_id)
        except MeetingActionItem.DoesNotExist:
            return Response(
                {'error': 'Action item not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action_item.linked_task:
            return Response(
                {'error': 'Action item already converted to a task'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        task = action_item.convert_to_task(project)

        return Response({
            'task_id': task.id,
            'task_title': task.title,
            'action_item': MeetingActionItemSerializer(action_item).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='share/slack')
    def share_to_slack(self, request, pk=None):
        """Share meeting summary to Slack"""
        meeting = self.get_object()
        channel_id = request.data.get('channel_id', meeting.slack_channel_id)

        slack = SlackService()
        result = slack.post_summary(meeting, channel_id)

        if result.get('error'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'Summary posted to Slack'})

    @action(detail=True, methods=['post'], url_path='sync/calendar')
    def sync_calendar(self, request, pk=None):
        """Sync meeting with Google Calendar"""
        meeting = self.get_object()

        gcal = GoogleCalendarService()
        if meeting.google_calendar_event_id:
            result = gcal.update_event(meeting)
        else:
            result = gcal.create_event(meeting)

        if result.get('error'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        if result.get('event_id'):
            meeting.google_calendar_event_id = result['event_id']
            meeting.save(update_fields=['google_calendar_event_id'])

        return Response({'status': 'Synced with Google Calendar', **result})

    def _log_activity(self, action_type, entity_type, instance):
        ActivityLog.objects.create(
            user=self.request.user,
            action=action_type,
            entity_type=entity_type,
            entity_id=instance.id,
            metadata={'title': instance.title},
        )


class MeetingActionItemViewSet(viewsets.ModelViewSet):
    queryset = MeetingActionItem.objects.all()
    serializer_class = MeetingActionItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = MeetingActionItem.objects.all()

        meeting_id = self.request.query_params.get('meeting')
        if meeting_id:
            qs = qs.filter(meeting_id=meeting_id)

        assigned = self.request.query_params.get('assigned_to_me')
        if assigned:
            qs = qs.filter(assigned_to=user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        if user.role != 'admin':
            qs = qs.filter(
                Q(meeting__organizer=user) | Q(meeting__participants__user=user) | Q(assigned_to=user)
            ).distinct()

        return qs
