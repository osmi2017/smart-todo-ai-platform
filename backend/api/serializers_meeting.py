from rest_framework import serializers
from .models import (
    Meeting, MeetingParticipant, MeetingSummary, MeetingActionItem, User,
)


class MeetingParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = MeetingParticipant
        fields = ['id', 'meeting', 'user', 'username', 'email', 'role', 'attended']
        read_only_fields = ['id']


class MeetingSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingSummary
        fields = [
            'id', 'meeting', 'summary_text', 'key_points', 'decisions',
            'follow_ups', 'generated_at', 'model_used',
        ]
        read_only_fields = ['id', 'generated_at']


class MeetingActionItemSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source='assigned_to.username', read_only=True, allow_null=True,
    )
    linked_task_id = serializers.IntegerField(
        source='linked_task.id', read_only=True, allow_null=True,
    )

    class Meta:
        model = MeetingActionItem
        fields = [
            'id', 'meeting', 'title', 'description', 'priority', 'status',
            'deadline', 'assigned_to', 'assigned_to_name',
            'linked_task', 'linked_task_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'linked_task']


class MeetingSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source='organizer.username', read_only=True)
    participants_count = serializers.SerializerMethodField()
    action_items_count = serializers.SerializerMethodField()
    has_summary = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'description', 'status', 'input_type',
            'scheduled_at', 'started_at', 'ended_at', 'duration_minutes',
            'audio_file', 'raw_notes', 'transcript',
            'organizer', 'organizer_name', 'project',
            'ai_processed', 'ai_processing_error',
            'google_calendar_event_id', 'slack_channel_id',
            'participants_count', 'action_items_count', 'has_summary',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'organizer',
            'ai_processed', 'ai_processing_error', 'transcript',
        ]

    def get_participants_count(self, obj):
        return obj.participants.count()

    def get_action_items_count(self, obj):
        return obj.action_items.count()

    def get_has_summary(self, obj):
        return hasattr(obj, 'summary') and obj.summary is not None


class MeetingDetailSerializer(MeetingSerializer):
    participants = MeetingParticipantSerializer(many=True, read_only=True)
    action_items = MeetingActionItemSerializer(many=True, read_only=True)
    summary = MeetingSummarySerializer(read_only=True)

    class Meta(MeetingSerializer.Meta):
        fields = MeetingSerializer.Meta.fields + ['participants', 'action_items', 'summary']
