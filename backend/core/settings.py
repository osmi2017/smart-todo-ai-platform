import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# SECURITY WARNING: keep the secret key used in production secret!
_default_secret = 'django-insecure-default-key-FOR-DEV-ONLY'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', _default_secret)
if not DEBUG and SECRET_KEY == _default_secret:
    raise ValueError(
        'DJANGO_SECRET_KEY must be set to a unique, unpredictable value in production. '
        'Generate one with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
    )

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

LOG_LEVEL = 'DEBUG' if DEBUG else 'WARNING'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': os.getenv('LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'drf_yasg',
    
    
    # Local apps
    'api',
    #'channels',
    
]

# Configuration Channels
ASGI_APPLICATION = 'core.asgi.application'

# Use Redis channel layer in production, in-memory for local dev
if DEBUG:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')],
            },
        },
    }

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'api.middleware.TenantMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'todo_ai'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom user model
AUTH_USER_MODEL = 'api.User'


# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'api.authentication.JWTAuthentication',  # Ta classe personnalisée
        'rest_framework.authentication.SessionAuthentication',  # Pour l'admin
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # Par défaut, tout est protégé
    ],
    }

# JWT settings
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
JWT_EXPIRATION_DELTA = timedelta(days=7)

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Only allow all origins in development — never in production
CORS_ALLOW_ALL_ORIGINS = DEBUG

CORS_ALLOW_CREDENTIALS = True

# Headers autorisés
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]


# ML Service URL
ML_SERVICE_URL = os.getenv('ML_SERVICE_URL', 'http://localhost:5001')

# OpenAI settings
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Google Calendar (stub - configure with OAuth credentials)
GOOGLE_CALENDAR_CREDENTIALS = None

# Slack (stub - configure with bot token)
SLACK_BOT_TOKEN = os.getenv('SLACK_BOT_TOKEN', '')

# Celery settings — délégation des tâches lourdes/asynchrones en arrière-plan
# (rappels de meetings en masse, génération de rapports, traitement audio/vidéo)
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# Garde une trace de l'état "STARTED" (utile pour les barres de progression UI)
CELERY_TASK_TRACK_STARTED = True

# Une tâche bloquée ne doit jamais geler un worker indéfiniment
CELERY_TASK_TIME_LIMIT = 15 * 60        # kill dur après 15 min
CELERY_TASK_SOFT_TIME_LIMIT = 12 * 60   # exception soft après 12 min (cleanup possible)

# Les résultats expirent pour ne pas saturer Redis
CELERY_RESULT_EXPIRES = 60 * 60 * 24  # 24h

# Un worker ne prend une nouvelle tâche qu'après avoir fini la précédente :
# évite qu'un traitement audio/vidéo long ne monopolise un worker sur plusieurs tâches à la fois.
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Files d'attente dédiées : les gros traitements (audio/vidéo, rapports) ne bloquent pas
# les tâches légères et rapides (rappels, notifications).
CELERY_TASK_ROUTES = {
    'api.tasks.process_meeting_ai': {'queue': 'heavy'},
    'api.tasks.transcribe_meeting_audio': {'queue': 'heavy'},
    'api.tasks.generate_project_report': {'queue': 'heavy'},
    'api.tasks.send_bulk_meeting_reminders': {'queue': 'default'},
    'api.tasks.send_meeting_reminder': {'queue': 'default'},
    'api.tasks.send_milestone_deadline_reminders': {'queue': 'default'},
    'api.tasks.cleanup_stale_notifications': {'queue': 'default'},
    'api.tasks.publish_domain_event': {'queue': 'events'},
    'api.tasks.publish_pending_domain_events': {'queue': 'events'},
}
CELERY_TASK_DEFAULT_QUEUE = 'default'

# En environnement de test, les tâches s'exécutent en synchrone (pas de worker/Redis requis)
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'
CELERY_TASK_EAGER_PROPAGATES = True

# Kafka centralized domain-event bus. Database-backed outbox rows are published
# by Celery only after the originating transaction commits.
KAFKA_ENABLED = os.getenv('KAFKA_ENABLED', 'True') == 'True'
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_EVENTS_TOPIC = os.getenv('KAFKA_EVENTS_TOPIC', 'smart-todo.events')
KAFKA_DEAD_LETTER_TOPIC = os.getenv('KAFKA_DEAD_LETTER_TOPIC', 'smart-todo.events.dlq')
KAFKA_EVENT_SOURCE = os.getenv('KAFKA_EVENT_SOURCE', 'smart-todo.backend')
KAFKA_CLIENT_ID = os.getenv('KAFKA_CLIENT_ID', 'smart-todo-backend')
KAFKA_CONSUMER_GROUP_PREFIX = os.getenv('KAFKA_CONSUMER_GROUP_PREFIX', 'smart-todo')
KAFKA_COMPRESSION_TYPE = os.getenv('KAFKA_COMPRESSION_TYPE', 'zstd')
KAFKA_LINGER_MS = int(os.getenv('KAFKA_LINGER_MS', '10'))
KAFKA_DELIVERY_TIMEOUT_MS = int(os.getenv('KAFKA_DELIVERY_TIMEOUT_MS', '120000'))
KAFKA_FLUSH_TIMEOUT_SECONDS = float(os.getenv('KAFKA_FLUSH_TIMEOUT_SECONDS', '10'))
KAFKA_CONSUMER_RETRY_SECONDS = float(os.getenv('KAFKA_CONSUMER_RETRY_SECONDS', '5'))
KAFKA_CONSUMER_MAX_RETRIES = int(os.getenv('KAFKA_CONSUMER_MAX_RETRIES', '20'))
KAFKA_MAX_POLL_INTERVAL_MS = int(os.getenv('KAFKA_MAX_POLL_INTERVAL_MS', '3600000'))
KAFKA_SECURITY_PROTOCOL = os.getenv('KAFKA_SECURITY_PROTOCOL', 'PLAINTEXT')
KAFKA_SASL_MECHANISM = os.getenv('KAFKA_SASL_MECHANISM', 'PLAIN')
KAFKA_SASL_USERNAME = os.getenv('KAFKA_SASL_USERNAME', '')
KAFKA_SASL_PASSWORD = os.getenv('KAFKA_SASL_PASSWORD', '')
