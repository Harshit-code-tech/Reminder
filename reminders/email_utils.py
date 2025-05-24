from mailersend import emails
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.timezone import now
from tenacity import retry, stop_after_attempt, wait_fixed
from .models import ReminderLog
import logging

logger = logging.getLogger('app_logger')

class ReminderEmailService:
    @staticmethod
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
    def send_reminder_email(user, event):
        api_key= settings.MAILERSEND_API_KEY
        mailer= emails.NewEmail(api_key)
        from_email= settings.DEFAULT_FROM_EMAIL
        if '<' in from_email and '>' in from_email:
            from_email= from_email.split('<')[1].strip('>')

        html_content= render_to_string('reminders/email_reminder.html', {
            'user': user.username,
            'event_name':event.name,
            'event_type':event.get_event_type_display(),
            'event_date':event.date,
            'event_time': event.time.strftime('%I:%M %p') if event.time else 'N/A',

            'message': event.message or 'No special message provided.'
        })
        mail_body= {
            "from":{"email": from_email, "name": "Birthday Reminder App"}, # "name": "Birthday Reminder App"
            "to":[{"email": user.email, "name": user.username}],
            "subject": f"Upcoming Reminder:{event.name}'s {event.get_event_type_display()}on {event.date}",
            "text":f"Hi {user.username},\n\nYou have an upcoming reminder for {event.name}'s {event.get_event_type_display()} on {event.date}!\n\nMessage: {event.message or 'No special message.'}\n\nBest,\nBirthday Reminder App.",
            "html": html_content
        }
        try:
            response = mailer.send(mail_body)
            logger.info(f"Reminder email sent to {user.email} for event {event.name}. Response: {response}")
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='success',
                sent_at=now(),
                message=f"Reminder email sent successfully to {user.email} for event {event.name}. "
                        f"Response: {response.status_code} - {response.reason_phrase}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send reminder email to {user.email} for event {event.name}: {str(e)}")
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='failed',
                sent_at=now(),
                message=f"Failed to send reminder email to {user.email} for event {event.name}. Error: {str(e)}"
            )
            return False

