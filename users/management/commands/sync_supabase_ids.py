from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from supabase import create_client
from django.conf import settings
import logging
import os
import django
import sys
# Add the project root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

# Set up Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

logger = logging.getLogger('app_logger')
User = get_user_model()

class Command(BaseCommand):
    help = 'Sync Supabase IDs with Django User model'

    def handle(self, *args, **kwargs):
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        users = User.objects.filter(supabase_id__isnull=True)
        try:
            response = supabase.auth.admin.list_users()
            # Response is a list of user dicts
            for user in users:
                for supabase_user in response:
                    if supabase_user.email == user.email:
                        user.supabase_id = supabase_user.id
                        user.save()
                        logger.info(f"Synced supabase_id {supabase_user.id} for user {user.username}")
                        break
                else:
                    logger.warning(f"No Supabase user found for {user.email}")
        except Exception as e:
            logger.error(f"Failed to sync supabase_ids: {str(e)}")