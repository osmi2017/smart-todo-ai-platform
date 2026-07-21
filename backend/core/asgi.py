import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

django_asgi_app = get_asgi_application()

from api import consumers  # noqa: E402
from api.authentication import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        JWTAuthMiddleware(
            URLRouter([
                path("ws/notifications/<int:user_id>/", consumers.NotificationConsumer.as_asgi()),
            ])
        )
    ),
})
