import json
import hashlib
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

API_NINJAS_KEY = 'bxe7LXrULtmLxw44Z6fblhIE2rBK6XwWyQAH7Ow9'
API_NINJAS_URL = 'https://api.api-ninjas.com/v1/city'
REDIS_PREFIX = 'geocode:'
REDIS_CACHE_TTL = 86400  # 24 hours


class GeocodeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'error': 'Le paramètre q est requis (min 2 caractères)'}, status=400)

        redis_client = self._get_redis()
        cache_key = REDIS_PREFIX + hashlib.md5(query.lower().encode()).hexdigest()

        if redis_client:
            cached = redis_client.get(cache_key)
            if cached:
                return Response(json.loads(cached))

        try:
            resp = requests.get(
                API_NINJAS_URL,
                params={'name': query},
                headers={'X-Api-Key': API_NINJAS_KEY},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            return Response(
                {'error': 'Erreur lors de la géolocalisation', 'detail': str(e)},
                status=502,
            )

        results = []
        for city in data:
            results.append({
                'name': city.get('name', ''),
                'region': city.get('region', ''),
                'country': city.get('country', ''),
                'latitude': city.get('latitude'),
                'longitude': city.get('longitude'),
                'population': city.get('population'),
            })

        if redis_client:
            redis_client.setex(cache_key, REDIS_CACHE_TTL, json.dumps(results))

        return Response(results)

    def _get_redis(self):
        try:
            import redis as redis_lib
            redis_url = getattr(settings, 'CELERY_BROKER_URL', None) or getattr(settings, 'REDIS_URL', None)
            if not redis_url:
                redis_url = 'redis://redis:6379/0'
            return redis_lib.from_url(redis_url, decode_responses=True)
        except Exception:
            return None
