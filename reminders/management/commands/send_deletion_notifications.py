from django.core.management.base import BaseCommand

from reminders.utils import send_deletion_notifications


class Command(BaseCommand):
    help = 'Send deletion notifications for expired events that still have media.'

    def handle(self, *args, **kwargs):
        try:
            result = send_deletion_notifications()
            self.stdout.write(self.style.SUCCESS(
                f"Sent {result['sent_count']} of {result['total_events']} deletion notifications"
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
