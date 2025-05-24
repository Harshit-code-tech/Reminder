import logging
from .utils import send_upcoming_reminders

logger = logging.getLogger('app_logger')

def daily_reminder_job():
    try:
        logger.info("Starting daily reminder job...")
        result = send_upcoming_reminders()
        logger.info(f"Daily reminder job completed: Sent {result['sent']} of {result['total']} reminders")
    except Exception as e:
        logger.error(f"Error in daily reminder job: {str(e)}")