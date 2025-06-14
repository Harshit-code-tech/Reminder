from django.utils import timezone
from datetime import timedelta
from .models import Event, ReminderLog, EventMedia
from django.core.mail import send_mail
from django.conf import settings
from celery import shared_task
@shared_task
def send_reminder_emails():
    today = timezone.now().date()
    events = Event.objects.filter(date__gte=today, notified=False)

    for event in events:
        reminder_date = event.date - timedelta(days=event.remind_days_before)
        if reminder_date == today:
            try:
                # Sending email through SMTP (MailerSend)
                send_mail(
                    subject=f"Reminder: {event.name}",
                    message=event.message or "You have an upcoming event!",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[event.user.email],
                    fail_silently=False,
                )

                # Save successful log
                ReminderLog.objects.create(
                    user=event.user,
                    event=event,
                    status='Success',
                    message='Email sent successfully.'
                )

                print(f"Reminder email sent to {event.user.email} for {event.name}'s {event.get_event_type_display()} on {event.date}.")

                # Optionally mark event as notified
                event.notified = True
                event.save()

            except Exception as e:
                # Save failed log
                ReminderLog.objects.create(
                    user=event.user,
                    event=event,
                    status='Failed',
                    message=str(e)
                )
    return "Reminder Processed"

@shared_task
def check_recurring_events():
    today = timezone.now().date()
    events = Event.objects.filter(
        event_type__in=['birthday', 'anniversary'],
        is_recurring=True,
        date__lt=today
    )
    for event in events:
        try:
            # Check if next-year event already exists
            next_date = event.date.replace(year=event.date.year + 1)
            if Event.objects.filter(
                user=event.user,
                name=event.name,
                event_type=event.event_type,
                date=next_date
            ).exists():
                continue

            # Create new event
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
                deletion_scheduled=None
            )

            # Link existing media
            for media in event.media.all():
                EventMedia.objects.create(
                    event=new_event,
                    media_file=media.media_file,
                    media_type=media.media_type
                )

            print(f"Created recurring event: {new_event} for {event.user.username}")
        except Exception as e:
            print(f"Error creating recurring event for {event}: {str(e)}")

    return "Recurring events processed"
