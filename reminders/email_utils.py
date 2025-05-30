import logging
import requests
from django.conf import settings
from django.template.loader import render_to_string
from tenacity import retry, stop_after_attempt, wait_fixed
from .models import ReminderLog

logger = logging.getLogger('app_logger')

class ReminderEmailService:
    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_reminder_email(user, event, custom_template=None, subject=None, extra_context=None):
        if not user or not getattr(user, 'email', None):
            logger.error("User object is missing or has no email.")
            return False
        if not event:
            logger.error("Event object is missing.")
            return False

        try:
            api_key = settings.MAILERSEND_API_KEY
            api_url = settings.MAILERSEND_API_URL
            from_email = settings.DEFAULT_FROM_EMAIL
            if '<' in from_email and '>' in from_email:
                from_email = from_email.split('<')[1].strip('>')

            username = getattr(user, 'username', 'User')
            user_email = user.profile.notification_email if user.profile.notification_email else user.email
            event_name = getattr(event, 'name', 'Unknown Event')
            event_type = event.get_event_type_display() if hasattr(event, 'get_event_type_display') else 'Event'
            event_date = getattr(event, 'date', 'Unknown Date')
            message = event.message or 'No special message provided.'

            context = {
                'user': username,
                'event_name': event_name,
                'event_type': event_type,
                'event_date': event_date,
                'message': message
            }
            if extra_context:
                context.update(extra_context)

            template = custom_template or 'reminders/reminder.html'
            html_content = render_to_string(template, context)

            mail_body = {
                "from": {"email": from_email, "name": "Birthday Reminder App"},
                "to": [{"email": user_email, "name": username}],
                "subject": subject or f"Upcoming Reminder: {event_name}'s {event_type} on {event_date}",
                "text": (
                    f"Hi {username},\n\n"
                    f"You have an upcoming reminder for {event_name}'s {event_type} on {event_date}.\n\n"
                    f"Message: {message}\n\n"
                    f"Best,\nBirthday Reminder App"
                ),
                "html": html_content
            }

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            response = requests.post(api_url, json=mail_body, headers=headers)
            response.raise_for_status()

            logger.info(f"Reminder email sent to {user_email} for event '{event_name}'. Status: {response.status_code}")
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='success',
                message=f"Reminder email sent. Response: {response.status_code} - {response.reason}"
            )
            return True

        except requests.RequestException as e:
            logger.error(f"Failed to send reminder email to {user_email} for event '{event_name}': {str(e)}")
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='failed',
                message=f"RequestException: {str(e)}"
            )
            return False

        except Exception as e:
            logger.exception(f"Unexpected error in send_reminder_email: {str(e)}")
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='failed',
                message=f"Unexpected error: {str(e)}"
            )
            return False

    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(5))
    def send_deletion_notification(user, event):
        if not user or not getattr(user, 'email', None):
            logger.error("User object is missing or has no email.")
            return False
        if not event:
            logger.error("Event object is missing.")
            return False

        try:
            api_key = settings.MAILERSEND_API_KEY
            api_url = settings.MAILERSEND_API_URL
            from_email = settings.DEFAULT_FROM_EMAIL
            if '<' in from_email:
                from_email = from_email.split('<')[1].strip('>')

            username = getattr(user, 'username', 'User')
            user_email = user.profile.notification_email if hasattr(user,
                                                                    'profile') and user.profile.notification_email else user.email
            event_name = getattr(event, 'name', 'Unknown Event')
            event_type = event.get_event_type_display() if hasattr(event, 'get_event_type_display') else 'Event'
            event_date = getattr(event, 'date', 'unknown')

            mail_body = {
                "from": {"email": from_email, "name": "Event Reminder"},
                "to": [{"email": user_email, "name": username}],
                "subject": f"Media Deletion Notice for {event_name}'s {event_type}",
                "text": (
                    f"Hi {username},\n\n"
                    f"The media for {event_name}'s {event_type} on {event_date} will be deleted tomorrow.\n"
                    f"Please download it from your event page if you wish to keep it.\n\n"
                    f"Best,\nEvent Reminder App"
                )
            }

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            response = requests.post(api_url, json=mail_body, headers=headers)
            response.raise_for_status()

            logger.info(f"Deletion notification sent to {user_email} for event '{event_name}'")
            return True

        except Exception as e:
            logger.error(f"Failed to send deletion notification to {user_email} for event '{event_name}': {str(e)}")
            return False