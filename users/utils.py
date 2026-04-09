"""
Users app utilities: email services, verification codes, and login security.
"""

import logging
import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.timezone import now
from rest_framework_simplejwt.tokens import RefreshToken
from tenacity import retry, stop_after_attempt, wait_fixed

from .models import VerificationCode

logger = logging.getLogger('app_logger')

# ---------------------------------------------------------------------------
# Login-security constants — used by the functions below and by views.py
# ---------------------------------------------------------------------------
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_TIMEOUT = 60 * 15          # 15 minutes (seconds)
CAPTCHA_THRESHOLD = 2              # Show captcha after this many failures
LOCK_THRESHOLD = 3                 # Lock account after this many failures


# =========================================================================
# Email service (SMTP backend)
# =========================================================================
class EmailService:
    """Thin wrapper around Django SMTP backend for transactional emails."""

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_verification_email(user, code):
        """Send a 6-digit verification code to the user's email."""
        from_email = settings.DEFAULT_FROM_EMAIL

        html_content = render_to_string('emails/verification.html', {
            'code': code,
            'username': user.username,
        })

        try:
            msg = EmailMultiAlternatives(
                subject="Verify Your Email Address",
                body=f"Your verification code is: {code}",
                from_email=from_email,
                to=[user.email],
            )
            msg.attach_alternative(html_content, 'text/html')
            msg.send(fail_silently=False)
            logger.info(f"Verification email sent to {user.email}.")
            return True
        except Exception as e:
            logger.error(f"Failed to send verification email to {user.email}: {e}")
            return False

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_reset_password_email(user, reset_url):
        """Send a password-reset link to the user."""
        from_email = settings.DEFAULT_FROM_EMAIL

        html_content = render_to_string('emails/password_reset_email.html', {
            'reset_url': reset_url,
            'username': user.username,
        })

        text_content = (
            f"Hi {user.username},\n\n"
            f"You requested a password reset. Click the link below:\n{reset_url}\n\n"
            f"If you didn't request this, please ignore this email.\n\n"
            f"Thanks,\nBirthday Reminder App"
        )

        try:
            msg = EmailMultiAlternatives(
                subject="Reset Your Password",
                body=text_content,
                from_email=from_email,
                to=[user.email],
            )
            msg.attach_alternative(html_content, 'text/html')
            msg.send(fail_silently=False)
            logger.info(f"Password reset email sent to {user.email}.")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {e}")
            return False


# =========================================================================
# Verification code generation
# =========================================================================
def generate_verification_code(user):
    """Create (or replace) a time-limited verification code for *user*."""
    code = ''.join(random.choices(string.digits, k=settings.VERIFICATION_CODE_LENGTH))
    expiration_time = now() + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRY_MINUTES)

    VerificationCode.objects.update_or_create(
        user=user,
        defaults={'code': code, 'expires_at': expiration_time},
    )

    logger.debug(f"Generated verification code for {user.email}, expires at {expiration_time}")
    return code


# =========================================================================
# JWT helper
# =========================================================================
def generate_token(user):
    """Return a short-lived JWT access token for *user*."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


# =========================================================================
# Login-security helpers (backed by Redis cache)
# =========================================================================
def normalize_identifier(identifier):
    """Lowercase and strip whitespace from a login identifier."""
    return identifier.strip().lower()


def _login_attempts_key(identifier):
    return f"login_attempts:{normalize_identifier(identifier)}"


def increment_failed_login_attempts(identifier):
    """Increment and return the number of failed login attempts."""
    cache_key = _login_attempts_key(identifier)
    attempts = cache.get(cache_key, 0) + 1
    cache.set(cache_key, attempts, timeout=LOCKOUT_TIMEOUT)
    return attempts


def reset_failed_login_attempts(identifier):
    """Clear failed-login counter on successful login."""
    cache.delete(_login_attempts_key(identifier))


def is_account_locked(identifier):
    """Return True if the account has been temporarily locked."""
    return cache.get(_login_attempts_key(identifier), 0) >= LOCK_THRESHOLD


def lock_account(identifier):
    """Force-lock the account for LOCKOUT_TIMEOUT seconds."""
    cache.set(_login_attempts_key(identifier), 999, timeout=LOCKOUT_TIMEOUT)


def should_show_captcha(identifier):
    """Return True if the login form should include a CAPTCHA."""
    return cache.get(_login_attempts_key(identifier), 0) >= CAPTCHA_THRESHOLD