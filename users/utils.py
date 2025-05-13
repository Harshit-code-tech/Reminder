# users/utils.py
from mailersend import emails
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.timezone import now
from tenacity import retry, stop_after_attempt, wait_fixed
from datetime import timedelta
import random
import string
import logging
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

        html_content = render_to_string('emails/verification.html', {'code': code, 'username': user.username})
        mail_body = {
            "from": {"email": from_email},
            "to": [{"email": user.email}],
            "subject": "Verify Your Email Address",
            "text": f"Your verification code is: {code}",
            "html": html_content
        }

        response = mailer.send(mail_body)
        logger.info(f"Verification email sent to {user.email} with code: {code}. Response: {response}")
        return True

def generate_verification_code(user):
    """Generate and store a 6-digit verification code with expiration."""
    code = ''.join(random.choices(string.digits, k=6))
    expiration_time = now() + timedelta(minutes=10)

    VerificationCode.objects.update_or_create(
        user=user,
        defaults={'code': code, 'expires_at': expiration_time}
    )

    logger.debug(f"Generated verification code {code} for user {user.email}, expires at {expiration_time}")
    return code