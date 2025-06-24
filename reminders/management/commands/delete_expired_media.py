import os
import sys
import logging

# Set up Django before importing models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
import django
django.setup()

from django.core.management.base import BaseCommand
from django.utils import timezone
from supabase import create_client, Client
from django.conf import settings
from reminders.models import Event, EventMedia
from reminders.email_utils import ReminderEmailService

logger = logging.getLogger('app_logger')

class Command(BaseCommand):
    help = 'Delete media one day after event and notify users'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        logger.info(f"delete_expired_media started at {timezone.now()} (today={today})")
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

        # Notify users on event day for events with media
        events_to_notify = Event.objects.filter(
            date=today,
            media__isnull=False
        ).distinct()
        logger.info(f"Found {events_to_notify.count()} events to notify for deletion")
        for event in events_to_notify:
            try:
                logger.info(f"Sending deletion notification for event {event.id} ({event.name}) to user {event.user.username}")
                ReminderEmailService.send_deletion_notification(event.user, event)
                logger.info(f"Deletion notification sent for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to send deletion notification for event {event.id}: {str(e)}")

        # Delete media one day after event
        events_to_delete = Event.objects.filter(
            date__lt=today - timezone.timedelta(days=1),
            media__isnull=False
        ).distinct()
        logger.info(f"Found {events_to_delete.count()} events to delete media")
        for event in events_to_delete:
            medias = event.media.all()
            for media in medias:
                try:
                    file_path = media.media_file
                    logger.info(f"Deleting media for event {event.id} ({event.name}) at path {file_path}")
                    supabase.storage.from_('event-media').remove([file_path])
                    media.delete()
                    logger.info(f"Media deleted for event {event.id}")
                except Exception as e:
                    logger.error(f"Media deletion failed for event {event.id}: {str(e)}")

        logger.info("delete_expired_media finished")