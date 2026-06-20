import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Mock tensorflow before importing app since it's heavy and not needed for tests
sys.modules['tensorflow'] = MagicMock()
sys.modules['tensorflow.keras'] = MagicMock()
sys.modules['tensorflow.keras.models'] = MagicMock()

from app import (
    app,
    extract_task_features,
    extract_risk_features,
    calculate_days_remaining,
    calculate_risk_fallback,
)


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'timestamp' in data


class TestExtractTaskFeatures:
    def test_basic_extraction(self):
        data = {
            'title': 'Fix login bug',
            'description': 'The login page throws an error',
            'priority': 3,
            'estimated_time': 5.0,
            'milestone_id': 1,
            'assigned_to_id': 42,
        }
        features = extract_task_features(data)

        assert 'time_features' in features
        assert 'delay_features' in features
        assert 'priority_features' in features

        tf = features['time_features']
        assert tf[0] == len('Fix login bug')
        assert tf[1] == len('The login page throws an error')
        assert tf[2] == 3
        assert tf[3] == 5.0
        assert tf[4] == 1  # has milestone
        assert tf[5] == 42

    def test_missing_fields_use_defaults(self):
        features = extract_task_features({})
        tf = features['time_features']
        assert tf[0] == 0  # empty title
        assert tf[1] == 0  # empty description
        assert tf[2] == 2  # default priority
        assert tf[3] == 0  # no estimated time
        assert tf[4] == 0  # no milestone
        assert tf[5] == 0  # no assigned_to

    def test_none_estimated_time(self):
        features = extract_task_features({'estimated_time': None})
        assert features['time_features'][3] == 0

    def test_delay_features_with_deadline(self):
        features = extract_task_features({'deadline': '2026-12-31'})
        assert features['delay_features'][2] == 1

    def test_delay_features_without_deadline(self):
        features = extract_task_features({})
        assert features['delay_features'][2] == 0


class TestExtractRiskFeatures:
    def test_basic_extraction(self):
        data = {
            'tasks_count': 10,
            'completed_tasks': 5,
            'delayed_tasks': 2,
            'current_progress': 50.0,
            'due_date': (datetime.now() + timedelta(days=10)).date().isoformat(),
        }
        features = extract_risk_features(data)
        assert len(features) == 5
        assert features[0] == 10
        assert features[1] == 5
        assert features[2] == 2
        assert features[3] == 50.0

    def test_missing_fields_default_to_zero(self):
        features = extract_risk_features({})
        assert features[0] == 0
        assert features[1] == 0
        assert features[2] == 0
        assert features[3] == 0


class TestCalculateDaysRemaining:
    def test_future_date(self):
        future = (datetime.now() + timedelta(days=15)).date().isoformat()
        days = calculate_days_remaining(future)
        assert 14 <= days <= 16

    def test_past_date(self):
        past = (datetime.now() - timedelta(days=5)).date().isoformat()
        days = calculate_days_remaining(past)
        assert days < 0

    def test_none_returns_default(self):
        assert calculate_days_remaining(None) == 30

    def test_invalid_string_returns_default(self):
        assert calculate_days_remaining('not-a-date') == 30

    def test_today(self):
        today = datetime.now().date().isoformat()
        assert calculate_days_remaining(today) == 0


class TestCalculateRiskFallback:
    def test_all_completed(self):
        risk = calculate_risk_fallback({
            'tasks_count': 10,
            'completed_tasks': 10,
            'delayed_tasks': 0,
        })
        assert risk == 0.0

    def test_none_completed(self):
        risk = calculate_risk_fallback({
            'tasks_count': 10,
            'completed_tasks': 0,
            'delayed_tasks': 0,
        })
        assert risk == 60.0  # remaining_ratio=1.0 * 0.6 * 100

    def test_with_delays(self):
        risk = calculate_risk_fallback({
            'tasks_count': 10,
            'completed_tasks': 0,
            'delayed_tasks': 10,
        })
        assert risk == 100.0

    def test_mixed(self):
        risk = calculate_risk_fallback({
            'tasks_count': 10,
            'completed_tasks': 5,
            'delayed_tasks': 2,
        })
        remaining_ratio = 5 / 10
        delayed_ratio = 2 / 10
        expected = (remaining_ratio * 0.6 + delayed_ratio * 0.4) * 100
        assert risk == pytest.approx(expected)

    def test_capped_at_100(self):
        risk = calculate_risk_fallback({
            'tasks_count': 1,
            'completed_tasks': 0,
            'delayed_tasks': 5,
        })
        assert risk <= 100

    def test_default_values(self):
        risk = calculate_risk_fallback({})
        assert isinstance(risk, float)


class TestPredictTaskEndpoint:
    def test_predict_task_no_models(self, client):
        response = client.post(
            '/predict/task',
            data=json.dumps({
                'title': 'Test task',
                'description': 'A description',
                'priority': 2,
            }),
            content_type='application/json',
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, dict)

    def test_predict_task_empty_body(self, client):
        response = client.post(
            '/predict/task',
            data=json.dumps({}),
            content_type='application/json',
        )
        assert response.status_code == 200


class TestPredictRiskEndpoint:
    def test_predict_risk_no_models(self, client):
        response = client.post(
            '/predict/risk',
            data=json.dumps({
                'tasks_count': 10,
                'completed_tasks': 5,
                'delayed_tasks': 2,
                'current_progress': 50,
                'due_date': '2026-12-31',
            }),
            content_type='application/json',
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'risk_score' in data

    def test_predict_risk_empty_data(self, client):
        response = client.post(
            '/predict/risk',
            data=json.dumps({}),
            content_type='application/json',
        )
        assert response.status_code == 200
