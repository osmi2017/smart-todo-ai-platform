# backend/api/authentication.py
import logging

import jwt
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions

from .models import User

logger = logging.getLogger(__name__)


class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            parts = auth_header.split()

            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return None

            token = parts[1]

            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])

            user = User.objects.get(id=payload['user_id'])

            return (user, None)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found')


@database_sync_to_async
def get_websocket_user(token):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
        return User.objects.get(id=payload['user_id'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        subprotocols = scope['subprotocols']
        if len(subprotocols) >= 2 and subprotocols[0] == 'access_token':
            scope['user'] = await get_websocket_user(subprotocols[1])
            scope['jwt_subprotocol'] = 'access_token'
        return await self.app(scope, receive, send)
