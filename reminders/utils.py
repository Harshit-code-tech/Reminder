from reminders.models import Event
from django.utils import timezone
from django.core.mail import send_mail


def send_upcoming_reminders():
    today = timezone.localdate()
    upcoming_events = Event.objects.filter(date__gte=today, date__lte=today + timezone.timedelta(days=1))

    for event in upcoming_events:
        send_mail(
            subject=f"Reminder: {event.name}'s {event.event_type}",
            message=event.message or f"Don't forget {event.name}'s {event.event_type}!",
            from_email=None,  # Uses DEFAULT_FROM_EMAIL
            recipient_list=[event.user.email],  # Assuming your Event has a ForeignKey to User
            fail_silently=False,
        )