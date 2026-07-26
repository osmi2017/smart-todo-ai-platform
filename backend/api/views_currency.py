import json
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

CURRENCY_API_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json"
REDIS_KEY = "currencies_list"
REDIS_CACHE_TTL = 86400  # 24 hours


class CurrencyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        redis_client = self._get_redis()
        if redis_client:
            cached = redis_client.get(REDIS_KEY)
            if cached:
                return Response(json.loads(cached))

        try:
            resp = requests.get(CURRENCY_API_URL, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            if redis_client:
                fallback = redis_client.get(REDIS_KEY)
                if fallback:
                    return Response(json.loads(fallback))
            return Response(
                {"error": "Impossible de récupérer les devises", "detail": str(e)},
                status=502,
            )

        if redis_client:
            redis_client.setex(REDIS_KEY, REDIS_CACHE_TTL, json.dumps(data))

        return Response(data)

    def _get_redis(self):
        try:
            import redis
            redis_url = getattr(settings, "CELERY_BROKER_URL", None) or getattr(settings, "REDIS_URL", None)
            if not redis_url:
                redis_url = "redis://redis:6379/0"
            return redis.from_url(redis_url, decode_responses=True)
        except Exception:
            return None
