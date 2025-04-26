from django.utils import timezone
from datetime import timedelta
from .models import Event
from django.core.mail import send_mail
from django.conf import settings

def send_reminder_emails():
    today=timezone.now().date()
    events=Event.objects.all()
    for event in events:
        reminder_date=event.date-timedelta(days=event.remind_days_before)
        if reminder_date==today:
            send_mail(
                subject=f"Reminder:{event.name} is coming up!",
                message=event.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[event.user.email],
                fail_silently=False,

            )
            print(f"Reminder email sent to {event.user.email} for {event.name}'s {event.get_event_type_display()} on {event.date}.")
            # You can also log this or perform any other action you need
            # For example, you might want to mark the event as notified
            event.notified=True
            event.save()
    return "Reminder Processed"

