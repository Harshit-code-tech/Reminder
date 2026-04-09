"""
Django settings for the Reminder project.

Configured for deployment on Render with Supabase storage,
MailerSend email, Redis caching, and django-q task scheduling.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import config, Csv

# ---------------------------------------------------------------------------
# Base paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Core Django settings
# ---------------------------------------------------------------------------
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', cast=bool, default=False)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv(delimiter=','), default='127.0.0.1,localhost')
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', cast=Csv(delimiter=','), default='')

# ---------------------------------------------------------------------------
# Installed applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django built-in
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'django_q',
    'django_crontab',
    'captcha',
    # Project apps
    'users.apps.UsersConfig',
    'reminders',
]

# ---------------------------------------------------------------------------
# Middleware — WhiteNoise must be immediately after SecurityMiddleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

# ---------------------------------------------------------------------------
# Database (PostgreSQL via dj-database-url)
# ---------------------------------------------------------------------------
DATABASES = {
    'default': dj_database_url.parse(
        config('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=config('DATABASE_SSL', cast=bool, default=True),
    )
}

# ---------------------------------------------------------------------------
# Auth & password validation
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTHENTICATION_BACKENDS = [
    'users.backends.EmailOrUserModelBackend',
    'django.contrib.auth.backends.ModelBackend',
]

LOGIN_REDIRECT_URL = 'event_list'
LOGOUT_REDIRECT_URL = 'login'
LOGIN_URL = 'login'

# ---------------------------------------------------------------------------
# REST Framework & JWT
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media files
# ---------------------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# WhiteNoise: in local dev, serve directly from STATICFILES_DIRS and disable caching,
# otherwise browsers can keep running stale JS/CSS from STATIC_ROOT.
if DEBUG:
    WHITENOISE_USE_FINDERS = True
    WHITENOISE_AUTOREFRESH = True

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Django-Q (async task queue backed by ORM)
# ---------------------------------------------------------------------------
Q_CLUSTER = {
    'name': 'birthday_reminder',
    'workers': 4,
    'recycle': 500,
    'timeout': 60,
    'retry': 90,
    'queue_limit': 50,
    'bulk': 10,
    'orm': 'default',
}

# ---------------------------------------------------------------------------
# Email configuration (MailerSend)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
MAILERSEND_API_KEY = config('MAILERSEND_API_KEY')
MAILERSEND_API_URL = config('MAILERSEND_API_URL', default='https://api.mailersend.com/v1/email')
EMAIL_FROM = config('EMAIL_FROM')
DEFAULT_FROM_EMAIL = f"Birthday Reminder App <{EMAIL_FROM}>"
EMAIL_HOST = 'smtp.mailersend.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_FROM')
EMAIL_HOST_PASSWORD = config('MAILERSEND_API_KEY')
EMAIL_SUBJECT_PREFIX = '[Birthday Reminder App]'

# ---------------------------------------------------------------------------
# Supabase (storage & auth)
# ---------------------------------------------------------------------------
SUPABASE_URL = config('SUPABASE_URL')
SUPABASE_KEY = config('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = config('SUPABASE_SERVICE_KEY')
SUPABASE_JWT_SECRET = config('SUPABASE_JWT_SECRET')

# ---------------------------------------------------------------------------
# Media upload constraints
# ---------------------------------------------------------------------------
ALLOWED_MEDIA_TYPES = [
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'audio/wav',
    'audio/flac',
    'audio/ogg',
    'audio/aac',
]
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# ---------------------------------------------------------------------------
# Verification & security
# ---------------------------------------------------------------------------
VERIFICATION_CODE_LENGTH = 6
VERIFICATION_CODE_EXPIRY_MINUTES = 10
VERIFICATION_CODE_MAX_ATTEMPTS = 5

SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', cast=bool, default=not DEBUG)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', cast=bool, default=not DEBUG)
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'

SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', cast=bool, default=False)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# ---------------------------------------------------------------------------
# Rate limiting (django-ratelimit + Redis)
# ---------------------------------------------------------------------------
RATELIMIT_CACHE = 'default'
RATELIMIT_BACKEND = 'ratelimit.backends.cache.RateLimitCacheBackend'
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_FAIL_OPEN = True
HANDLER429 = 'users.views.too_many_requests'

# ---------------------------------------------------------------------------
# Cache (Upstash Redis)
# ---------------------------------------------------------------------------
UPSTASH_REDIS_URL = config('UPSTASH_REDIS_URL', default='').strip()
USE_LOCAL_CACHE = config('USE_LOCAL_CACHE', cast=bool, default=False)

if DEBUG or USE_LOCAL_CACHE or not UPSTASH_REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'reminder-local-cache',
            'TIMEOUT': 300,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': UPSTASH_REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                # Ignore Redis network errors instead of crashing request flow.
                'IGNORE_EXCEPTIONS': True,
            },
        }
    }

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': str(LOGS_DIR / 'error.log'),
            'formatter': 'verbose',
        },
        'app_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': str(LOGS_DIR / 'app.log'),
            'formatter': 'verbose',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'app_logger': {
            'handlers': ['app_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ---------------------------------------------------------------------------
# Sharing & URLs
# ---------------------------------------------------------------------------
SITE_URL = os.environ.get('SITE_URL', 'http://localhost:8000').rstrip('/')
SHARE_VALIDATION_BASE_URL = os.environ.get('SHARE_VALIDATION_BASE_URL', SITE_URL).rstrip('/')
SHARE_TOKEN_EXPIRY_DAYS = 3
REMINDER_CRON_SECRET = config('REMINDER_CRON_SECRET', default='')
HEALTH_CHECK_MAILERSEND_TIMEOUT = config('HEALTH_CHECK_MAILERSEND_TIMEOUT', cast=int, default=5)
HEALTH_CHECK_STRICT_MAILERSEND = config('HEALTH_CHECK_STRICT_MAILERSEND', cast=bool, default=False)

# ---------------------------------------------------------------------------
# Cron jobs (django-crontab)
# ---------------------------------------------------------------------------
CRONJOBS = [
    ('0 8 * * *', 'reminders.cron.daily_reminder_job'),
    ('0 9 * * *', 'reminders.cron.daily_deletion_notification_job'),
    ('0 10 * * *', 'reminders.cron.daily_media_cleanup_job'),
    ('30 0 * * *', 'reminders.cron.daily_recurring_events_job'),
]