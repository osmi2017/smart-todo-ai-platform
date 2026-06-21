import pytest
from unittest.mock import patch, MagicMock
from api.services.ai_service import (
    transcribe_audio,
    summarize_meeting,
    extract_action_items,
    _fallback_summary,
    _fallback_action_items,
    get_openai_client,
)


class TestGetOpenAIClient:
    @patch('api.services.ai_service.HAS_OPENAI', False)
    def test_returns_none_without_openai(self):
        assert get_openai_client() is None

    @patch('api.services.ai_service.settings')
    @patch('api.services.ai_service.HAS_OPENAI', True)
    def test_returns_none_without_api_key(self, mock_settings):
        mock_settings.OPENAI_API_KEY = ''
        assert get_openai_client() is None


class TestTranscribeAudio:
    @patch('api.services.ai_service.get_openai_client', return_value=None)
    def test_returns_error_without_client(self, mock_client):
        result = transcribe_audio('/fake/path.mp3')
        assert result['error'] == 'OpenAI not configured'
        assert result['transcript'] == ''


class TestSummarizeMeeting:
    @patch('api.services.ai_service.get_openai_client', return_value=None)
    def test_fallback_without_client(self, mock_client):
        result = summarize_meeting('Some transcript text')
        assert result['model_used'] == 'fallback'
        assert 'Some transcript text' in result['summary_text']

    @patch('api.services.ai_service.get_openai_client', return_value=None)
    def test_fallback_empty_content(self, mock_client):
        result = summarize_meeting('', '')
        assert result['summary_text'] == 'No content available for summary.'
        assert result['key_points'] == []


class TestExtractActionItems:
    @patch('api.services.ai_service.get_openai_client', return_value=None)
    def test_returns_empty_without_client(self, mock_client):
        result = extract_action_items('Some meeting content')
        assert result['action_items'] == []
        assert result['error'] == 'OpenAI not configured'

    @patch('api.services.ai_service.get_openai_client', return_value=None)
    def test_returns_empty_without_content(self, mock_client):
        result = extract_action_items('', '')
        assert result['action_items'] == []


class TestFallbackSummary:
    def test_with_content(self):
        result = _fallback_summary('Line 1\nLine 2\nLine 3', '')
        assert result['model_used'] == 'fallback'
        assert len(result['key_points']) == 3
        assert result['decisions'] == []
        assert result['follow_ups'] == []

    def test_empty_content(self):
        result = _fallback_summary('', '')
        assert result['summary_text'] == 'No content available for summary.'

    def test_long_content_truncated(self):
        content = 'x' * 1000
        result = _fallback_summary(content, '')
        assert len(result['summary_text']) == 500

    def test_custom_error(self):
        result = _fallback_summary('', '', error='Custom error')
        assert result['error'] == 'Custom error'

    def test_raw_notes_fallback(self):
        result = _fallback_summary('', 'raw notes here')
        assert 'raw notes here' in result['summary_text']


class TestFallbackActionItems:
    def test_default_error(self):
        result = _fallback_action_items()
        assert result['action_items'] == []
        assert result['error'] == 'OpenAI not configured'

    def test_custom_error(self):
        result = _fallback_action_items(error='test error')
        assert result['error'] == 'test error'
