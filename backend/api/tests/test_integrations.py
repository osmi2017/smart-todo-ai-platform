import pytest
from unittest.mock import MagicMock, patch
from api.services.integrations import GoogleCalendarService, SlackService


class TestGoogleCalendarService:
    def test_not_configured(self):
        service = GoogleCalendarService()
        assert service.configured is False

    def test_create_event_not_configured(self):
        service = GoogleCalendarService()
        meeting = MagicMock()
        result = service.create_event(meeting)
        assert 'error' in result

    def test_update_event_not_configured(self):
        service = GoogleCalendarService()
        meeting = MagicMock()
        meeting.google_calendar_event_id = ''
        result = service.update_event(meeting)
        assert 'error' in result

    def test_delete_event_not_configured(self):
        service = GoogleCalendarService()
        meeting = MagicMock()
        meeting.google_calendar_event_id = ''
        result = service.delete_event(meeting)
        assert 'error' in result


class TestSlackService:
    def test_not_configured(self):
        service = SlackService()
        assert service.configured is False

    def test_post_summary_not_configured(self):
        service = SlackService()
        meeting = MagicMock()
        result = service.post_summary(meeting)
        assert result['error'] == 'Slack not configured'

    def test_post_action_items_not_configured(self):
        service = SlackService()
        meeting = MagicMock()
        result = service.post_action_items(meeting)
        assert result['error'] == 'Slack not configured'

    def test_send_reminder_not_configured(self):
        service = SlackService()
        result = service.send_reminder('test@example.com', MagicMock())
        assert result['error'] == 'Slack not configured'

    @patch.dict('os.environ', {'SLACK_BOT_TOKEN': 'xoxb-test'})
    def test_configured_with_env(self):
        service = SlackService()
        assert service.configured is True

    @patch.dict('os.environ', {'SLACK_BOT_TOKEN': 'xoxb-test'})
    def test_post_summary_no_channel(self):
        service = SlackService()
        meeting = MagicMock()
        meeting.slack_channel_id = ''
        result = service.post_summary(meeting, channel_id=None)
        assert result['error'] == 'No Slack channel specified'
