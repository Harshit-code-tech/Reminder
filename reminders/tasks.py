from django.utils import timezone
from datetime import timedelta
from .models import Event, ReminderLog
from django.core.mail import send_mail
from django.conf import settings

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
