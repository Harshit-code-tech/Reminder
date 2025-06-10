import logging
from .utils import send_upcoming_reminders, send_deletion_notifications, cleanup_expired_media

logger = logging.getLogger('app_logger')

def daily_reminder_job():
    try:
        logger.info("Starting daily reminder job...")
        result = send_upcoming_reminders()
        logger.info(f"Daily reminder job completed: Sent {result['sent_count']} of {result['total_events']} reminders")
    except Exception as e:
        logger.error(f"Error in daily reminder job: {str(e)}")

def daily_deletion_notification_job():
    try:
        logger.info("Starting daily deletion notification job...")
        result = send_deletion_notifications()
        logger.info(f"Daily deletion notification job completed: Sent {result['sent_count']} of {result['total_events']} notifications")
    except Exception as e:
        logger.error(f"Error in daily deletion notification job: {str(e)}")

def daily_media_cleanup_job():
    try:
        logger.info("Starting daily media cleanup job...")
        result = cleanup_expired_media()
        logger.info(f"Daily media cleanup job completed: Deleted media for {result['deleted_count']} of {result['total_events']} events")
    except Exception as e:
        logger.error(f"Error in daily media cleanup job: {str(e)}")