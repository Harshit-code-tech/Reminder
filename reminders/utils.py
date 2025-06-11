from django.utils import timezone
from datetime import timedelta, datetime
from .models import Event, ReminderLog, ImportLog
from .email_utils import ReminderEmailService
import logging
import csv
from io import StringIO
from django.core.exceptions import ValidationError
from django.http import HttpResponse

logger = logging.getLogger('app_logger')

def send_upcoming_reminders():
    today = timezone.localdate()
    sent_count = 0
    events = Event.objects.filter(
        notified=False,
        user__profile__notification_email__isnull=False
    ).select_related('user').prefetch_related('media')

    for event in events:
        days_until_event = (event.date - today).days
        if days_until_event == event.remind_days_before:
            user = event.user
            logger.info(f"Sending {event.remind_days_before}-day reminder email for {event.name} to {user.email}")
            success = ReminderEmailService.send_reminder_email(user, event)
            ReminderLog.objects.create(
                user=user,
                event=event,
                status='success' if success else 'failure',
                message=f"{event.remind_days_before}-day reminder sent" if success else f"{event.remind_days_before}-day reminder failed"
            )
            if success:
                event.notified = True
                event.save()
                sent_count += 1
                logger.info(f"Reminder email sent successfully for {event.name} to {user.email}")
            else:
                logger.error(f"Failed to send reminder email for {event.name} to {user.email}")
    logger.info(f"Total reminders sent: {sent_count}")
    return {"sent_count": sent_count, "total_events": events.count()}

def send_deletion_notifications():
    today = timezone.localdate()
    sent_count = 0
    expired_events = Event.objects.filter(
        date__lt=today,
        deletion_notified=False,
        media__isnull=False
    ).select_related('user').prefetch_related('media').distinct()

    for event in expired_events:
        user = event.user
        logger.info(f"Sending deletion notification for {event.name} to {user.email}")
        success = ReminderEmailService.send_deletion_notification(user, event)
        ReminderLog.objects.create(
            user=user,
            event=event,
            status='success' if success else 'failure',
            message='Deletion notification sent' if success else 'Deletion notification failed'
        )
        if success:
            event.deletion_notified = True
            event.deletion_scheduled = timezone.now() + timedelta(days=2)
            event.save()
            sent_count += 1
            logger.info(f"Deletion notification sent successfully for {event.name} to {user.email}")
        else:
            logger.error(f"Failed to send deletion notification for {event.name} to {user.email}")
    logger.info(f"Total deletion notifications sent: {sent_count}")
    return {"sent_count": sent_count, "total_events": expired_events.count()}

def cleanup_expired_media():
    today = timezone.now()
    deleted_count = 0
    events_to_delete = Event.objects.filter(
        deletion_scheduled__lte=today,
        deletion_notified=True
    ).prefetch_related('media')

    for event in events_to_delete:
        logger.info(f"Deleting media for event {event.name}")
        event.media.all().delete()
        event.deletion_scheduled = None
        event.save()
        deleted_count += 1
        logger.info(f"Media deleted successfully for {event.name}")
    logger.info(f"Total events with media deleted: {deleted_count}")
    return {"deleted_count": deleted_count, "total_events": events_to_delete.count()}

def process_bulk_import(user, csv_file):
    try:
        logger.info(f"Starting bulk import for user {user.username}")
        csv_content = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(StringIO(csv_content))
        expected_columns = {'name', 'event_type', 'date', 'remind_days_before', 'message', 'custom_label'}
        if set(csv_reader.fieldnames) != expected_columns:
            raise ValidationError(f"Invalid CSV format. Expected headers: {', '.join(expected_columns)}")

        success_count = 0
        failure_count = 0
        errors = []

        for row in csv_reader:
            try:
                # Validate required fields
                name = row['name'].strip()
                if not name or len(name) > 500:
                    raise ValueError(f"Invalid name: {name}")
                event_type = row['event_type'].strip().lower()
                if event_type not in dict(Event.EVENT_TYPES):
                    raise ValueError(f"Invalid event_type: {event_type}")
                date_str = row['date'].strip()
                try:
                    event_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    raise ValueError(f"Invalid date format: {date_str}. Use YYYY-MM-DD")

                # Optional fields
                remind_days_before = row.get('remind_days_before', '1').strip()
                try:
                    remind_days_before = int(remind_days_before)
                    if remind_days_before < 0:
                        raise ValueError
                except ValueError:
                    raise ValueError(f"Invalid remind_days_before: {remind_days_before}")
                message = row.get('message', '').strip() or None
                custom_label = row.get('custom_label', '').strip() or None
                if custom_label and len(custom_label) > 100:
                    raise ValueError(f"custom_label too long: {custom_label}")

                # Create Event
                event = Event.objects.create(
                    user=user,
                    name=name,
                    event_type=event_type,
                    date=event_date,
                    remind_days_before=remind_days_before,
                    message=message,
                    custom_label=custom_label,
                    notified=False,
                    deletion_notified=False
                )
                success_count += 1
                logger.info(f"Imported event '{name}' for user {user.username}")

            except Exception as e:
                failure_count += 1
                errors.append(f"Row {csv_reader.line_num}: {str(e)}")
                logger.error(f"Failed to import row {csv_reader.line_num}: {str(e)}")

        # Log import
        import_log = ImportLog.objects.create(
            user=user,
            file_name=csv_file.name,
            success_count=success_count,
            failure_count=failure_count,
            errors='\n'.join(errors) if errors else None
        )
        logger.info(f"Bulk import completed: {success_count} successes, {failure_count} failures")

        return {
            'success_count': success_count,
            'failure_count': failure_count,
            'errors': errors,
            'import_log_id': import_log.id
        }

    except Exception as e:
        logger.error(f"Bulk import failed for user {user.username}: {str(e)}")
        return {
            'success_count': 0,
            'failure_count': 0,
            'errors': [f"Invalid CSV: {str(e)}"],
            'import_log_id': None
        }

def get_csv_template():
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="event_import_template.csv"'
    writer = csv.writer(response)
    writer.writerow(['name', 'event_type', 'date', 'remind_days_before', 'message', 'custom_label'])
    writer.writerow(['John Doe', 'birthday', '2025-06-12', '1', 'Happy Birthday!', 'Friend'])
    writer.writerow(['Jane Smith', 'anniversary', '2025-06-13', '2', 'Congrats!', 'Spouse'])
    return response