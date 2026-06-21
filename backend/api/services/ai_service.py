import json
import os
from django.conf import settings

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


def get_openai_client():
    api_key = getattr(settings, 'OPENAI_API_KEY', '') or os.getenv('OPENAI_API_KEY', '')
    if not api_key or not HAS_OPENAI:
        return None
    return openai.OpenAI(api_key=api_key)


def transcribe_audio(audio_file_path):
    """Transcribe audio file using OpenAI Whisper API"""
    client = get_openai_client()
    if not client:
        return {'error': 'OpenAI not configured', 'transcript': ''}

    try:
        with open(audio_file_path, 'rb') as f:
            response = client.audio.transcriptions.create(
                model='whisper-1',
                file=f,
                response_format='text',
            )
        return {'transcript': response, 'error': ''}
    except Exception as e:
        return {'error': str(e), 'transcript': ''}


def summarize_meeting(transcript, raw_notes=''):
    """Generate a structured meeting summary using GPT"""
    client = get_openai_client()
    if not client:
        return _fallback_summary(transcript, raw_notes)

    content = transcript or raw_notes
    if not content:
        return _fallback_summary('', '')

    prompt = (
        "You are a meeting assistant. Analyze the following meeting content and "
        "return a JSON object with these fields:\n"
        "- summary_text: a concise summary (2-4 paragraphs)\n"
        "- key_points: list of key discussion points (strings)\n"
        "- decisions: list of decisions made (strings)\n"
        "- follow_ups: list of follow-up items (strings)\n\n"
        f"Meeting content:\n{content}"
    )

    try:
        response = client.chat.completions.create(
            model='gpt-4',
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.3,
            response_format={'type': 'json_object'},
        )
        result = json.loads(response.choices[0].message.content)
        return {
            'summary_text': result.get('summary_text', ''),
            'key_points': result.get('key_points', []),
            'decisions': result.get('decisions', []),
            'follow_ups': result.get('follow_ups', []),
            'model_used': 'gpt-4',
            'error': '',
        }
    except Exception as e:
        return _fallback_summary(transcript, raw_notes, error=str(e))


def extract_action_items(transcript, raw_notes='', participants=None):
    """Extract action items/tasks from meeting content using GPT"""
    client = get_openai_client()
    if not client:
        return _fallback_action_items(error='OpenAI not configured')

    content = transcript or raw_notes
    if not content:
        return _fallback_action_items(error='No content provided')

    participant_names = ', '.join(participants) if participants else 'unknown'

    prompt = (
        "You are a meeting assistant. Extract action items from the following "
        "meeting content. Return a JSON object with a single field 'action_items' "
        "containing a list of objects, each with:\n"
        "- title: short task title\n"
        "- description: detailed description\n"
        "- priority: 1 (Low), 2 (Medium), 3 (High), or 4 (Critical)\n"
        "- assigned_to: name of the person responsible (or null)\n"
        "- deadline: suggested deadline in YYYY-MM-DD format (or null)\n\n"
        f"Meeting participants: {participant_names}\n\n"
        f"Meeting content:\n{content}"
    )

    try:
        response = client.chat.completions.create(
            model='gpt-4',
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.3,
            response_format={'type': 'json_object'},
        )
        result = json.loads(response.choices[0].message.content)
        return {
            'action_items': result.get('action_items', []),
            'error': '',
        }
    except Exception as e:
        return _fallback_action_items(error=str(e))


def _fallback_summary(transcript, raw_notes, error='OpenAI not configured'):
    """Provide a basic fallback when OpenAI is unavailable"""
    content = transcript or raw_notes
    lines = [l.strip() for l in content.split('\n') if l.strip()] if content else []
    return {
        'summary_text': content[:500] if content else 'No content available for summary.',
        'key_points': lines[:5],
        'decisions': [],
        'follow_ups': [],
        'model_used': 'fallback',
        'error': error,
    }


def _fallback_action_items(error='OpenAI not configured'):
    """Provide empty action items when OpenAI is unavailable"""
    return {
        'action_items': [],
        'error': error,
    }
