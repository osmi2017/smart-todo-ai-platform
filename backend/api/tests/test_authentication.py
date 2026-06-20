import pytest
import jwt
from datetime import datetime, timedelta
from unittest.mock import MagicMock
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from api.authentication import JWTAuthentication
from api.models import User


class TestJWTAuthentication:
    def setup_method(self):
        self.auth = JWTAuthentication()

    def _make_request(self, auth_header=None):
        request = MagicMock()
        request.headers = {}
        if auth_header is not None:
            request.headers['Authorization'] = auth_header
        return request

    def _make_token(self, user, expired=False):
        exp = datetime.utcnow() + (
            timedelta(days=-1) if expired else timedelta(days=7)
        )
        payload = {
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'exp': exp,
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')

    def test_no_auth_header_returns_none(self, user):
        request = self._make_request()
        result = self.auth.authenticate(request)
        assert result is None

    def test_invalid_format_returns_none(self, user):
        request = self._make_request('Token xyz')
        result = self.auth.authenticate(request)
        assert result is None

    def test_single_part_returns_none(self, user):
        request = self._make_request('OnlyOneWord')
        result = self.auth.authenticate(request)
        assert result is None

    def test_valid_token_authenticates(self, user):
        token = self._make_token(user)
        request = self._make_request(f'Bearer {token}')
        result = self.auth.authenticate(request)
        assert result is not None
        auth_user, _ = result
        assert auth_user.id == user.id

    def test_expired_token_raises(self, user):
        token = self._make_token(user, expired=True)
        request = self._make_request(f'Bearer {token}')
        with pytest.raises(Exception):
            self.auth.authenticate(request)

    def test_invalid_token_raises(self, user):
        request = self._make_request('Bearer invalidtoken123')
        with pytest.raises(Exception):
            self.auth.authenticate(request)

    def test_nonexistent_user_raises(self, db):
        payload = {
            'user_id': 99999,
            'username': 'ghost',
            'role': 'member',
            'exp': datetime.utcnow() + timedelta(days=7),
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')
        request = self._make_request(f'Bearer {token}')
        with pytest.raises(Exception):
            self.auth.authenticate(request)
