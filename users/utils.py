from datetime import timedelta
import random
import string
import logging

from django.conf import settings
from django.template.loader import render_to_string
from django.utils.timezone import now
from django.core.cache import cache
from django.utils.crypto import get_random_string
from rest_framework_simplejwt.tokens import RefreshToken
from tenacity import retry, stop_after_attempt, wait_fixed
from mailersend import emails

from .models import VerificationCode

logger = logging.getLogger('app_logger')


class EmailService:
    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_verification_email(user, code):
        api_key = settings.MAILERSEND_API_KEY
        mailer = emails.NewEmail(api_key)

        from_email = settings.DEFAULT_FROM_EMAIL
        if '<' in from_email and '>' in from_email:
            from_email = from_email.split('<')[1].strip('>')

        html_content = render_to_string('emails/verification.html', {
            'code': code,
            'username': user.username
        })

        mail_body = {
            "from": {"email": from_email},
            "to": [{"email": user.email}],
            "subject": "Verify Your Email Address",
            "text": f"Your verification code is: {code}",
            "html": html_content
        }

        try:
            response = mailer.send(mail_body)
            logger.info(f"Verification email sent to {user.email} with code: {code}. Response: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
            return False

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_reset_password_email(user, reset_url):
        api_key = settings.MAILERSEND_API_KEY
        mailer = emails.NewEmail(api_key)

        from_email = settings.DEFAULT_FROM_EMAIL
        if '<' in from_email and '>' in from_email:
            from_email = from_email.split('<')[1].strip('>')

        html_content = render_to_string('emails/password_reset_email.html', {
            'reset_url': reset_url,
            'username': user.username
        })

        text_content = f"""
Hi {user.username},

You requested a password reset. Click the link below to reset your password:
{reset_url}

If you didn't request this, please ignore this email.

Thanks,
Birthday Reminder App
"""

        mail_body = {
            "from": {"email": from_email},
            "to": [{"email": user.email}],
            "subject": "Reset Your Password",
            "text": text_content,
            "html": html_content
        }

        try:
            response = mailer.send(mail_body)
            logger.info(f"Password reset email sent to {user.email}. Response: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
            return False


def generate_verification_code(user):
    code = ''.join(random.choices(string.digits, k=6))
    expiration_time = now() + timedelta(minutes=10)

    VerificationCode.objects.update_or_create(
        user=user,
        defaults={'code': code, 'expires_at': expiration_time}
    )

    logger.debug(f"Generated verification code {code} for user {user.email}, expires at {expiration_time}")
    return code


MAX_FAILED_ATTEMPTS = 5
LOCKOUT_TIME = 300
CAPTCHA_THRESHOLD = 3


def generate_token(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


def normalize_identifier(identifier):
    return identifier.strip().lower()


def failed_login_key(identifier):
    return f"failed_login:{normalize_identifier(identifier)}"


def lockout_key(identifier):
    return f"lockout:{normalize_identifier(identifier)}"


def increment_failed_login_attempts(identifier):
    key = failed_login_key(identifier)
    attempts = cache.get(key, 0) + 1
    cache.set(key, attempts, LOCKOUT_TIME)
    if attempts >= MAX_FAILED_ATTEMPTS:
        lock_account(identifier)
    return attempts


def reset_failed_login_attempts(identifier):
    cache.delete(failed_login_key(identifier))
    cache.delete(lockout_key(identifier))


def is_account_locked(identifier):
    return cache.get(lockout_key(identifier)) is not None


def lock_account(identifier):
    cache.set(lockout_key(identifier), True, LOCKOUT_TIME)


def should_show_captcha(identifier):
    return cache.get(failed_login_key(identifier), 0) >= CAPTCHA_THRESHOLD


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')
