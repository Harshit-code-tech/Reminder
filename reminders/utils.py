from django.utils import timezone
from datetime import timedelta
from .models import Event, ReminderLog
from .email_utils import ReminderEmailService
import logging

logger = logging.getLogger('app_logger')

def send_upcoming_reminders():
    today = timezone.localdate()
    sent_count = 0
    events = Event.objects.filter(
        notified=False,
        user__profile__notification_email__isnull=False
    ).select_related('user').prefetch_related('media')

    for event in events:
        days_until_event = (event.date - today).days
        if days_until_event == event.remind_days_before:
            user = event.user
            logger.info(f"Sending {event.remind_days_before}-day reminder email for {event.name} to {user.email}")
            success = ReminderEmailService.send_reminder_email(user, event)
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='success' if success else 'failure',
                message=f"{event.remind_days_before}-day reminder sent" if success else f"{event.remind_days_before}-day reminder failed"
            )
            if success:
                event.notified = True
                event.save()
                sent_count += 1
                logger.info(f"Reminder email sent successfully for {event.name} to {user.email}")
            else:
                logger.error(f"Failed to send reminder email for {event.name} to {user.email}")
    logger.info(f"Total reminders sent: {sent_count}")
    return {"sent_count": sent_count, "total_events": events.count()}

def send_deletion_notifications():
    today = timezone.localdate()
    sent_count = 0
    expired_events = Event.objects.filter(
        date__lt=today,
        deletion_notified=False,
        media__isnull=False
    ).select_related('user').prefetch_related('media').distinct()

    for event in expired_events:
        user = event.user
        logger.info(f"Sending deletion notification for {event.name} to {user.email}")
        success = ReminderEmailService.send_deletion_notification(user, event)
        ReminderLog.objects.create(
            user=user,
            event=event,
            status='success' if success else 'failure',
            message='Deletion notification sent' if success else 'Deletion notification failed'
        )
        if success:
            event.deletion_notified = True
            event.deletion_scheduled = timezone.now() + timedelta(days=2)
            event.save()
            sent_count += 1
            logger.info(f"Deletion notification sent successfully for {event.name} to {user.email}")
        else:
            logger.error(f"Failed to send deletion notification for {event.name} to {user.email}")
    logger.info(f"Total deletion notifications sent: {sent_count}")
    return {"sent_count": sent_count, "total_events": expired_events.count()}

def cleanup_expired_media():
    today = timezone.now()
    deleted_count = 0
    events_to_delete = Event.objects.filter(
        deletion_scheduled__lte=today,
        deletion_notified=True
    ).prefetch_related('media')

    for event in events_to_delete:
        logger.info(f"Deleting media for event {event.name}")
        event.media.all().delete()  # Delete EventMedia objects
        event.deletion_scheduled = None
        event.save()
        deleted_count += 1
        logger.info(f"Media deleted successfully for {event.name}")
    logger.info(f"Total events with media deleted: {deleted_count}")
    return {"deleted_count": deleted_count, "total_events": events_to_delete.count()}