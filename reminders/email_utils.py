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
    def send_reminder_email(user, event):
        # === Sanity checks ===
        if not user or not getattr(user, 'email', None):
            logger.error("User object is missing or has no email.")
            return False
        if not event:
            logger.error("Event object is missing.")
            return False

        try:
            # === Prepare values ===
            api_key = settings.MAILERSEND_API_KEY
            api_url = settings.MAILERSEND_API_URL
            from_email = settings.DEFAULT_FROM_EMAIL

            # Strip "Name <email>" format
            if '<' in from_email and '>' in from_email:
                from_email = from_email.split('<')[1].strip('>')

            username = getattr(user, 'username', 'User')
            user_email = getattr(user, 'email', 'no-reply@example.com')
            event_name = getattr(event, 'name', 'Unknown Event')
            event_type = event.get_event_type_display() if hasattr(event, 'get_event_type_display') else 'Event'
            event_date = getattr(event, 'date', 'Unknown Date')

            try:
                event_time = event.time.strftime('%I:%M %p') if event.time else 'N/A'
            except AttributeError:
                event_time = 'Invalid Time'

            message = event.message or 'No special message provided.'

            # === Email Content ===
            html_content = render_to_string('reminders/email_reminder.html', {
                'user': username,
                'event_name': event_name,
                'event_type': event_type,
                'event_date': event_date,
                'event_time': event_time,
                'message': message
            })

            mail_body = {
                "from": {"email": from_email, "name": "Birthday Reminder App"},
                "to": [{"email": user_email, "name": username}],
                "subject": f"Upcoming Reminder: {event_name}'s {event_type} on {event_date}",
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

            # === Send Email ===
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
