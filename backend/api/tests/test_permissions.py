import pytest
from unittest.mock import MagicMock
from api.permissions import (
    IsAdminOrReadOnly, IsOwnerOrReadOnly,
    IsAssignedOrReadOnly, IsAuthorOrReadOnly,
)


def _make_request(method='GET', user=None):
    request = MagicMock()
    request.method = method
    request.user = user
    return request


class TestIsAdminOrReadOnly:
    def setup_method(self):
        self.perm = IsAdminOrReadOnly()

    def test_safe_methods_allowed(self, user):
        for method in ('GET', 'HEAD', 'OPTIONS'):
            request = _make_request(method=method, user=user)
            assert self.perm.has_permission(request, None) is True

    def test_admin_can_write(self, admin_user):
        request = _make_request(method='POST', user=admin_user)
        assert self.perm.has_permission(request, None) is True

    def test_member_cannot_write(self, user):
        request = _make_request(method='POST', user=user)
        assert self.perm.has_permission(request, None) is False

    def test_unauthenticated_cannot_write(self, db):
        anon = MagicMock()
        anon.is_authenticated = False
        request = _make_request(method='POST', user=anon)
        assert self.perm.has_permission(request, None) is False


class TestIsOwnerOrReadOnly:
    def setup_method(self):
        self.perm = IsOwnerOrReadOnly()

    def test_safe_methods_allowed(self, user):
        request = _make_request(method='GET', user=user)
        assert self.perm.has_object_permission(request, None, MagicMock()) is True

    def test_owner_can_write(self, user):
        request = _make_request(method='PUT', user=user)
        obj = MagicMock()
        obj.owner = user
        assert self.perm.has_object_permission(request, None, obj) is True

    def test_non_owner_cannot_write(self, user, other_user):
        request = _make_request(method='PUT', user=other_user)
        obj = MagicMock()
        obj.owner = user
        assert self.perm.has_object_permission(request, None, obj) is False

    def test_created_by_fallback(self, user):
        request = _make_request(method='DELETE', user=user)
        obj = MagicMock(spec=[])
        obj.created_by = user
        # hasattr checks: owner -> False, created_by -> True
        del obj.owner
        assert self.perm.has_object_permission(request, None, obj) is True

    def test_author_fallback(self, user):
        request = _make_request(method='PATCH', user=user)
        obj = MagicMock(spec=[])
        obj.author = user
        assert self.perm.has_object_permission(request, None, obj) is True


class TestIsAssignedOrReadOnly:
    def setup_method(self):
        self.perm = IsAssignedOrReadOnly()

    def test_safe_methods_allowed(self, user):
        request = _make_request(method='GET', user=user)
        assert self.perm.has_object_permission(request, None, MagicMock()) is True

    def test_assigned_user_can_write(self, user):
        request = _make_request(method='PUT', user=user)
        obj = MagicMock()
        obj.assigned_to = user
        assert self.perm.has_object_permission(request, None, obj) is True

    def test_unassigned_user_cannot_write(self, user, other_user):
        request = _make_request(method='PUT', user=other_user)
        obj = MagicMock()
        obj.assigned_to = user
        assert self.perm.has_object_permission(request, None, obj) is False

    def test_no_assigned_to_attr(self, user):
        request = _make_request(method='PUT', user=user)
        obj = MagicMock(spec=[])
        assert self.perm.has_object_permission(request, None, obj) is False


class TestIsAuthorOrReadOnly:
    def setup_method(self):
        self.perm = IsAuthorOrReadOnly()

    def test_safe_methods_allowed(self, user):
        request = _make_request(method='GET', user=user)
        assert self.perm.has_object_permission(request, None, MagicMock()) is True

    def test_author_can_write(self, user):
        request = _make_request(method='PUT', user=user)
        obj = MagicMock()
        obj.author = user
        assert self.perm.has_object_permission(request, None, obj) is True

    def test_non_author_cannot_write(self, user, other_user):
        request = _make_request(method='DELETE', user=other_user)
        obj = MagicMock()
        obj.author = user
        assert self.perm.has_object_permission(request, None, obj) is False
