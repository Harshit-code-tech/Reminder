# for manual testing
from django.core.management.base import BaseCommand
# from self_project.Birthday.reminders.utils import send_upcoming_reminders
from reminders.utils import send_upcoming_reminders
class Command(BaseCommand):
    help = 'Manually trigger sending of upcoming event reminders'

    def handle(self, *args, **kwargs):
        try:
            result = send_upcoming_reminders()
            self.stdout.write(self.style.SUCCESS(
                f"Sent {result['sent']} of {result['total']} reminders"
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))