# users/utils.py
from mailersend import emails
from django.conf import settings
from django.template.loader import render_to_string
from tenacity import retry, stop_after_attempt, wait_fixed
import logging

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