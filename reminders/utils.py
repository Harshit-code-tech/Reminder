from django.utils import timezone
from datetime import timedelta, datetime
from .models import Event, ReminderLog, ImportLog, EventMedia, Reflection
from .email_utils import ReminderEmailService
import logging
import csv
from io import StringIO
from django.core.exceptions import ValidationError
from django.http import HttpResponse
from django.db.models import Count, Sum
from django.utils.timezone import make_aware, is_naive
from django.contrib.auth import get_user_model
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
    writer.writerow(['trial', 'birthday', '2025-06-12', '1', 'Happy Birthday!', 'Friend'])
    writer.writerow(['another trial', 'anniversary', '2025-06-13', '2', 'Congrats!', 'whoever_belongs_to'])
    return response


def make_aware_if_naive(dt):
    if is_naive(dt):
        return make_aware(dt)
    return dt


def get_analytics_data(user, start_date=None, end_date=None):
    try:
        logger.info(f"Fetching analytics for user {user.username}")

        events_qs = Event.objects.filter(user=user)
        reminder_logs_qs = ReminderLog.objects.filter(user=user)
        import_logs_qs = ImportLog.objects.filter(user=user)
        media_qs = EventMedia.objects.filter(event__user=user)

        # Convert to timezone-aware datetime
        if start_date:
            start_datetime = make_aware_if_naive(datetime.combine(start_date, datetime.min.time()))
            events_qs = events_qs.filter(created_at__gte=start_datetime)
            reminder_logs_qs = reminder_logs_qs.filter(timestamp__gte=start_datetime)
            import_logs_qs = import_logs_qs.filter(imported_at__gte=start_datetime)
            media_qs = media_qs.filter(uploaded_at__gte=start_datetime)

        if end_date:
            end_datetime = make_aware_if_naive(datetime.combine(end_date, datetime.max.time()))
            events_qs = events_qs.filter(created_at__lte=end_datetime)
            reminder_logs_qs = reminder_logs_qs.filter(timestamp__lte=end_datetime)
            import_logs_qs = import_logs_qs.filter(imported_at__lte=end_datetime)
            media_qs = media_qs.filter(uploaded_at__lte=end_datetime)

        today = timezone.localdate()

        event_type_agg = events_qs.values('event_type').annotate(count=Count('id')).order_by()
        media_type_agg = media_qs.values('media_type').annotate(count=Count('id')).order_by()

        event_stats = {
            'total': events_qs.count(),
            'by_type': list(event_type_agg),
            'upcoming': events_qs.filter(date__gte=today).count(),
            'past': events_qs.filter(date__lt=today).count(),
            'type_labels': [item['event_type'].capitalize() for item in event_type_agg],
            'type_counts': [item['count'] for item in event_type_agg]
        }

        reminder_stats = {
            'total': reminder_logs_qs.count(),
            'success': reminder_logs_qs.filter(status='success').count(),
            'failure': reminder_logs_qs.filter(status='failure').count(),
        }

        media_stats = {
            'total': media_qs.count(),
            'by_type': list(media_type_agg),
            'type_labels': [item['media_type'].capitalize() for item in media_type_agg],
            'type_counts': [item['count'] for item in media_type_agg]
        }

        import_stats = {
            'total': import_logs_qs.count(),
            'recent': list(import_logs_qs.order_by('-imported_at')[:5]),
            'success_count': import_logs_qs.aggregate(total=Sum('success_count'))['total'] or 0,
            'failure_count': import_logs_qs.aggregate(total=Sum('failure_count'))['total'] or 0,
        }

        return {
            'event_stats': event_stats,
            'reminder_stats': reminder_stats,
            'media_stats': media_stats,
            'import_stats': import_stats,
            'start_date': start_date,
            'end_date': end_date,
        }

    except Exception as e:
        logger.error(f"Error fetching analytics for user {user.username}: {str(e)}")
        return {
            'event_stats': {'total': 0, 'by_type': [], 'upcoming': 0, 'past': 0, 'type_labels': [], 'type_counts': []},
            'reminder_stats': {'total': 0, 'success': 0, 'failure': 0},
            'media_stats': {'total': 0, 'by_type': [], 'type_labels': [], 'type_counts': []},
            'import_stats': {'total': 0, 'recent': [], 'success_count': 0, 'failure_count': 0},
            'start_date': start_date,
            'end_date': end_date,
        }



def download_analytics_report(user, start_date=None, end_date=None):
    try:
        logger.info(f"Downloading analytics report for user {user.username}")

        analytics_data = get_analytics_data(user, start_date, end_date)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="analytics_report.csv"'
        writer = csv.writer(response)

        # Write header
        writer.writerow(['Category', 'Metric', 'Value'])

        # Write event stats
        writer.writerow(['Events', 'Total', analytics_data['event_stats']['total']])
        for item in analytics_data['event_stats']['by_type']:
            writer.writerow(['Events', f"Type: {item['event_type'].capitalize()}", item['count']])
        writer.writerow(['Events', 'Upcoming', analytics_data['event_stats']['upcoming']])
        writer.writerow(['Events', 'Past', analytics_data['event_stats']['past']])

        # Write reminder stats
        writer.writerow(['Reminders', 'Total', analytics_data['reminder_stats']['total']])
        writer.writerow(['Reminders', 'Success', analytics_data['reminder_stats']['success']])
        writer.writerow(['Reminders', 'Failure', analytics_data['reminder_stats']['failure']])

        # Write media stats
        writer.writerow(['Media', 'Total', analytics_data['media_stats']['total']])
        for item in analytics_data['media_stats']['by_type']:
            writer.writerow(['Media', f"Type: {item['media_type'].capitalize()}", item['count']])

        # Write import stats
        writer.writerow(['Imports', 'Total', analytics_data['import_stats']['total']])
        writer.writerow(['Imports', 'Success Count', analytics_data['import_stats']['success_count']])
        writer.writerow(['Imports', 'Failure Count', analytics_data['import_stats']['failure_count']])

        return response

    except Exception as e:
        logger.error(f"Error downloading analytics report for user {user.username}: {str(e)}")
        return HttpResponse(status=500)



def get_admin_dashboard_stats():
    User = get_user_model()
    total_users = User.objects.count()
    total_events = Event.objects.count()
    total_reflections = Reflection.objects.count()
    recurring_events = Event.objects.filter(is_recurring=True).count()
    today = timezone.localdate()
    recent_logs = ReminderLog.objects.order_by('-timestamp')[:20]
    # Add more metrics as needed (e.g., Redis, API usage)
    return {
        'total_users': total_users,
        'total_events': total_events,
        'total_reflections': total_reflections,
        'recurring_events': recurring_events,
        'recent_logs': recent_logs,
        'today': today,
    }