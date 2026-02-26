# backend/api/authentication.py
import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
from .models import User

class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        print(f"Auth header: {auth_header}")  # LOG
        
        if not auth_header:
            print("Pas de header Authorization")  # LOG
            return None
        
        try:
            parts = auth_header.split()
            print(f"Parts: {parts}")  # LOG
            
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                print("Format incorrect")  # LOG
                return None
                
            token = parts[1]
            print(f"Token: {token[:20]}...")  # LOG
            
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
            print(f"Payload: {payload}")  # LOG
            
            user = User.objects.get(id=payload['user_id'])
            print(f"User trouvé: {user.username}")  # LOG
            
            return (user, None)
            
        except Exception as e:
            print(f"Erreur auth: {str(e)}")  # LOG
            raise
