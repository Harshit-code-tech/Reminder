import logging

import requests
from django.conf import settings
from django.template.loader import render_to_string
from tenacity import retry, stop_after_attempt, wait_fixed

logger = logging.getLogger('app_logger')


def _get_sender_email():
    """Extract a plain email address from DEFAULT_FROM_EMAIL (handles 'Name <email>' format)."""
    from_email = settings.DEFAULT_FROM_EMAIL
    if '<' in from_email and '>' in from_email:
        return from_email.split('<')[1].strip('>')
    return from_email


def _get_user_email(user):
    """Return the best email address for *user* (notification email or default)."""
    if hasattr(user, 'profile') and getattr(user.profile, 'notification_email', None):
        return user.profile.notification_email
    return user.email


class ReminderEmailService:
    """Send transactional emails via the MailerSend API.

    NOTE: These methods intentionally re-raise exceptions so that the
    ``@retry`` decorator from tenacity can detect failures and retry.
    The caller (utils.py) is responsible for creating ReminderLog entries.
    """

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_reminder_email(user, event, custom_template=None, subject=None, extra_context=None):
        """Send an upcoming-event reminder email.

        Returns True on success.  Raises on failure so tenacity retries.
        """
        if not user or not getattr(user, 'email', None):
            logger.error("send_reminder_email: user is missing or has no email.")
            return False
        if not event:
            logger.error("send_reminder_email: event is missing.")
            return False

        user_email = _get_user_email(user)
        username = getattr(user, 'username', 'User')
        event_name = getattr(event, 'name', 'Unknown Event')

        context = {
            'user': user,
            'username': username,
            'event': event,
            'subject_prefix': settings.EMAIL_SUBJECT_PREFIX,
            'remind_days_before': event.remind_days_before,
        }
        if extra_context:
            context.update(extra_context)

        template = custom_template or 'emails/email_reminder.html'
        html_content = render_to_string(template, context)

        days = event.remind_days_before
        subject = subject or (
            f"{settings.EMAIL_SUBJECT_PREFIX} Reminder: {event_name} is in "
            f"{days} day{'s' if days != 1 else ''}!"
        )

        mail_body = {
            "from": {"email": _get_sender_email(), "name": "Birthday Reminder App"},
            "to": [{"email": user_email, "name": username}],
            "subject": subject,
            "html": html_content,
        }

        headers = {
            "Authorization": f"Bearer {settings.MAILERSEND_API_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.post(settings.MAILERSEND_API_URL, json=mail_body, headers=headers)
        response.raise_for_status()

        logger.info(f"Reminder email sent to {user_email} for event '{event_name}' ({response.status_code})")
        return True

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(5))
    def send_deletion_notification(user, event):
        """Notify a user that media for an expired event will be cleaned up.

        Returns True on success.  Raises on failure so tenacity retries.
        """
        if not user or not getattr(user, 'email', None):
            logger.error("send_deletion_notification: user is missing or has no email.")
            return False
        if not event:
            logger.error("send_deletion_notification: event is missing.")
            return False

        user_email = _get_user_email(user)
        username = getattr(user, 'username', 'User')
        event_name = getattr(event, 'name', 'Unknown Event')
        event_type = event.get_event_type_display() if hasattr(event, 'get_event_type_display') else 'Event'

        context = {'user': user, 'username': username, 'event': event}

        html_content = render_to_string('emails/media_reminder.html', context)
        text_content = render_to_string('emails/email_reminder.txt', context)

        mail_body = {
            "from": {"email": _get_sender_email(), "name": "Event Reminder"},
            "to": [{"email": user_email, "name": username}],
            "subject": f"Media Deletion Notice for {event_name}'s {event_type}",
            "html": html_content,
            "text": text_content,
        }

        headers = {
            "Authorization": f"Bearer {settings.MAILERSEND_API_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.post(settings.MAILERSEND_API_URL, json=mail_body, headers=headers)
        response.raise_for_status()

        logger.info(f"Deletion notification sent to {user_email} for event '{event_name}'")
        return True