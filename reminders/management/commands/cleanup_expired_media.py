from django.core.management.base import BaseCommand

from reminders.utils import cleanup_expired_media


class Command(BaseCommand):
    help = 'Delete media for events whose cleanup window has elapsed.'

    def handle(self, *args, **kwargs):
        try:
            result = cleanup_expired_media()
            self.stdout.write(self.style.SUCCESS(
                f"Deleted media for {result['deleted_count']} of {result['total_events']} events"
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
