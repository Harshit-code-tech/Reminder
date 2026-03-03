import logging

from django.utils import timezone
from datetime import timedelta
from .models import Event, ReminderLog, EventMedia
from .email_utils import ReminderEmailService
from django.conf import settings

logger = logging.getLogger('app_logger')


def send_reminder_emails():
    """Send reminder emails for upcoming events (called via django-q).

    This delegates to ReminderEmailService (MailerSend API) for consistency
    with the cron path in utils.py.  Uses ``<=`` for catch-up resilience.
    """
    today = timezone.localdate()
    events = Event.objects.filter(notified=False).select_related('user')

    for event in events:
        days_until = (event.date - today).days
        if 0 <= days_until <= event.remind_days_before:
            try:
                success = ReminderEmailService.send_reminder_email(event.user, event)
            except Exception as e:
                logger.error(f"All retries failed for {event.name}: {e}")
                success = False

            ReminderLog.objects.create(
                user=event.user,
                event=event,
                status='success' if success else 'failure',
                message='Email sent via MailerSend' if success else f'Send failed',
            )

            if success:
                event.notified = True
                event.save()
                logger.info(
                    f"Reminder email sent to {event.user.email} for "
                    f"{event.name}'s {event.get_event_type_display()} on {event.date}."
                )
            else:
                logger.error(f"Failed to send reminder for {event.name}")

    return "Reminders processed"


def _next_annual_date(original_date):
    """Return the next anniversary of *original_date* after the current year.

    Gracefully handles Feb 29 by falling back to Feb 28 in non-leap years.
    """
    next_year = original_date.year + 1
    try:
        return original_date.replace(year=next_year)
    except ValueError:
        # Feb 29 in a non-leap year → use Feb 28
        return original_date.replace(year=next_year, day=28)


def check_recurring_events():
    """Create next-year copies for recurring birthday/anniversary events (called via django-q)."""
    today = timezone.now().date()
    events = Event.objects.filter(
        event_type__in=['birthday', 'anniversary'],
        is_recurring=True,
        date__lt=today,
    )
    for event in events:
        try:
            next_date = _next_annual_date(event.date)

            if Event.objects.filter(
                user=event.user,
                name=event.name,
                event_type=event.event_type,
                date=next_date,
            ).exists():
                continue

            new_event = Event.objects.create(
                user=event.user,
                name=event.name,
                event_type=event.event_type,
                date=next_date,
                remind_days_before=event.remind_days_before,
                message=event.message,
                custom_label=event.custom_label,
                cultural_theme=event.cultural_theme,
                highlights=event.highlights,
                is_recurring=True,
                notified=False,
                deletion_notified=False,
                deletion_scheduled=None,
            )

            for media in event.media.all():
                EventMedia.objects.create(
                    event=new_event,
                    media_file=media.media_file,
                    media_type=media.media_type,
                )

            logger.info(f"Created recurring event: {new_event} for {event.user.username}")
        except Exception as e:
            logger.error(f"Error creating recurring event for {event}: {e}")

    return "Recurring events processed"
