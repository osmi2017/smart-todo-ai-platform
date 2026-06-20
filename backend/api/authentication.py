# backend/api/authentication.py
import logging

import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
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
