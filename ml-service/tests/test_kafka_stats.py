import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

sys.modules['tensorflow'] = MagicMock()
sys.modules['tensorflow.keras'] = MagicMock()
sys.modules['tensorflow.keras.models'] = MagicMock()

from stats_store import _default_stats, load_stats, save_stats, update_stats_with_task_completed  # noqa: E402
from app import app  # noqa: E402


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def tmp_stats_path(tmp_path):
    return str(tmp_path / 'kafka_stats_state.json')


def make_event(**payload_overrides):
    payload = {
        'task_id': 1,
        'project_id': 42,
        'assigned_to_id': 7,
        'actual_time': 120,
    }
    payload.update(payload_overrides)
    return {
        'event_id': 'abc-123',
        'event_type': 'task_completed',
        'occurred_at': '2026-07-12T10:00:00Z',
        'source_service': 'backend',
        'payload': payload,
    }


class TestUpdateStats:
    def test_increments_total_count(self):
        stats = _default_stats()
        updated = update_stats_with_task_completed(stats, make_event())
        assert updated['total_tasks_completed'] == 1

    def test_does_not_mutate_input_stats(self):
        stats = _default_stats()
        update_stats_with_task_completed(stats, make_event())
        assert stats['total_tasks_completed'] == 0  # inchangé

    def test_tracks_counts_by_project_and_user(self):
        stats = _default_stats()
        stats = update_stats_with_task_completed(stats, make_event(project_id=42, assigned_to_id=7))
        stats = update_stats_with_task_completed(stats, make_event(project_id=42, assigned_to_id=9))

        assert stats['by_project']['42'] == 2
        assert stats['by_user']['7'] == 1
        assert stats['by_user']['9'] == 1

    def test_computes_running_average_actual_time(self):
        stats = _default_stats()
        stats = update_stats_with_task_completed(stats, make_event(actual_time=100))
        stats = update_stats_with_task_completed(stats, make_event(actual_time=200))

        assert stats['avg_actual_time_minutes'] == 150.0

    def test_handles_missing_optional_fields_gracefully(self):
        stats = _default_stats()
        event = make_event()
        del event['payload']['project_id']
        del event['payload']['actual_time']

        updated = update_stats_with_task_completed(stats, event)
        assert updated['total_tasks_completed'] == 1
        assert updated['by_project'] == {}
        assert updated['avg_actual_time_minutes'] is None


class TestStatsPersistence:
    def test_save_and_load_roundtrip(self, tmp_stats_path):
        stats = update_stats_with_task_completed(_default_stats(), make_event())
        save_stats(stats, path=tmp_stats_path)

        loaded = load_stats(path=tmp_stats_path)
        assert loaded['total_tasks_completed'] == 1

    def test_load_returns_defaults_when_file_missing(self, tmp_stats_path):
        loaded = load_stats(path=tmp_stats_path)
        assert loaded['total_tasks_completed'] == 0

    def test_load_returns_defaults_on_corrupt_file(self, tmp_stats_path):
        with open(tmp_stats_path, 'w') as f:
            f.write('{not valid json')
        loaded = load_stats(path=tmp_stats_path)
        assert loaded['total_tasks_completed'] == 0


class TestKafkaStatsEndpoint:
    def test_endpoint_returns_stats_without_internal_fields(self, client, monkeypatch, tmp_stats_path):
        stats = update_stats_with_task_completed(_default_stats(), make_event())
        save_stats(stats, path=tmp_stats_path)

        import stats_store
        monkeypatch.setattr(stats_store, 'STATS_FILE', tmp_stats_path)

        response = client.get('/stats/kafka')
        assert response.status_code == 200
        data = response.get_json()
        assert data['total_tasks_completed'] == 1
        assert '_actual_time_sum' not in data
        assert '_actual_time_count' not in data
