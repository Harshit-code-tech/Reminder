from django.utils import timezone
from datetime import timedelta
from .models import Event
from .email_utils import ReminderEmailService
import logging

logger = logging.getLogger('app_logger')

def send_upcoming_reminders():
    today=timezone.localdate()
    events=Event.objects.filter(
        date__lte=today + timedelta(days=1),
        date__gte=today,
        notified = False
    ).select_related('user')

    sent_count=0
    for event in events:
        if event.user.profile.notification_email:
            logger.info(f"Sending reminder email for {event.name} to {event.user.email}")
            success = ReminderEmailService.send_reminder_email(event.user, event)
            if success:
                event.notified = True
                event.save()
                sent_count += 1
                logger.info(f"Reminder email sent successfully for {event.name} to {event.user.email}")
            else:
                logger.error(f"Failed to send reminder email for {event.name} to {event.user.email}")
        else:
            logger.warning(f"Skipping reminder for {event.name} as user {event.user.email} has email notifications disabled.")
    logger.info(f"Total reminders sent: {sent_count}")
    return {"sent_count": sent_count, "total_events": events.count()}