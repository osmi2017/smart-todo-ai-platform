"""
Integration stubs for Google Calendar and Slack.
These provide the interface; actual API calls require credentials to be configured.
"""
import os
from django.conf import settings


class GoogleCalendarService:
    """Stub for Google Calendar integration"""

    def __init__(self):
        self.credentials = getattr(settings, 'GOOGLE_CALENDAR_CREDENTIALS', None)
        self.configured = bool(self.credentials)

    def create_event(self, meeting):
        """Create a Google Calendar event for a meeting"""
        if not self.configured:
            return {'error': 'Google Calendar not configured', 'event_id': ''}

        # TODO: Implement with google-api-python-client
        # from googleapiclient.discovery import build
        # service = build('calendar', 'v3', credentials=self.credentials)
        # event = {
        #     'summary': meeting.title,
        #     'description': meeting.description,
        #     'start': {'dateTime': meeting.scheduled_at.isoformat()},
        #     'end': {'dateTime': ...},
        #     'attendees': [{'email': p.user.email} for p in meeting.participants.all()],
        # }
        # result = service.events().insert(calendarId='primary', body=event).execute()
        return {'error': 'Not implemented yet', 'event_id': ''}

    def update_event(self, meeting):
        """Update an existing Google Calendar event"""
        if not self.configured or not meeting.google_calendar_event_id:
            return {'error': 'Google Calendar not configured or no event linked'}
        return {'error': 'Not implemented yet'}

    def delete_event(self, meeting):
        """Delete a Google Calendar event"""
        if not self.configured or not meeting.google_calendar_event_id:
            return {'error': 'Google Calendar not configured or no event linked'}
        return {'error': 'Not implemented yet'}


class SlackService:
    """Stub for Slack integration"""

    def __init__(self):
        self.bot_token = getattr(settings, 'SLACK_BOT_TOKEN', '') or os.getenv('SLACK_BOT_TOKEN', '')
        self.configured = bool(self.bot_token)

    def post_summary(self, meeting, channel_id=None):
        """Post meeting summary to a Slack channel"""
        if not self.configured:
            return {'error': 'Slack not configured'}

        target_channel = channel_id or meeting.slack_channel_id
        if not target_channel:
            return {'error': 'No Slack channel specified'}

        # TODO: Implement with slack_sdk
        # from slack_sdk import WebClient
        # client = WebClient(token=self.bot_token)
        # summary = meeting.summary
        # blocks = [
        #     {"type": "header", "text": {"type": "plain_text", "text": f"Meeting: {meeting.title}"}},
        #     {"type": "section", "text": {"type": "mrkdwn", "text": summary.summary_text}},
        #     {"type": "section", "text": {"type": "mrkdwn", "text": "Key Points:\n" + "\n".join(f"- {p}" for p in summary.key_points)}},
        # ]
        # result = client.chat_postMessage(channel=target_channel, blocks=blocks)
        return {'error': 'Not implemented yet'}

    def post_action_items(self, meeting, channel_id=None):
        """Post action items to a Slack channel"""
        if not self.configured:
            return {'error': 'Slack not configured'}

        target_channel = channel_id or meeting.slack_channel_id
        if not target_channel:
            return {'error': 'No Slack channel specified'}

        # TODO: Implement with slack_sdk
        return {'error': 'Not implemented yet'}

    def send_reminder(self, user_email, action_item):
        """Send a DM reminder about an action item"""
        if not self.configured:
            return {'error': 'Slack not configured'}
        return {'error': 'Not implemented yet'}
