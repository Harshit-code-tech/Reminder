import json
import logging
from pathlib import Path

import requests
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django_ratelimit.decorators import ratelimit

from reminders.models import Event
from reminders.utils import send_upcoming_reminders

logger = logging.getLogger('app_logger')
User = get_user_model()

def home(request):
    """Landing page — redirects authenticated users to their event list."""
    if request.user.is_authenticated:
        return redirect('event_list')
    # Provide real stats for the landing page
    total_users = User.objects.count()
    total_events = Event.objects.count()
    context = {
        'total_users': total_users,
        'total_events': total_events,
    }
    return render(request, 'home.html', context)

@ratelimit(key='ip', rate='100/h', block=True)
def health_check(request):
    """Return a JSON health status for monitoring and uptime checks."""
    checks = {}
    status_code = 200

    # Database check
    try:
        Event.objects.count()
        checks['database'] = 'ok'
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        checks['database'] = 'failed'
        status_code = 500

    # MailerSend API check (lightweight)
    try:
        response = requests.get(
            'https://api.mailersend.com/v1/domains',
            headers={'Authorization': f'Bearer {settings.MAILERSEND_API_KEY}'},
            timeout=5,
        )
        response.raise_for_status()
        checks['mailersend'] = 'ok'
    except Exception as e:
        logger.error(f"MailerSend health check failed: {e}")
        checks['mailersend'] = 'failed'
        status_code = 500

    checks['supabase'] = checks['database']

    return JsonResponse({
        'status': 'healthy' if status_code == 200 else 'unhealthy',
        'checks': checks,
    }, status=status_code)

@login_required
@user_passes_test(lambda u: u.is_superuser)
@csrf_protect
def admin_tools(request):
    """Admin page: trigger reminders, export backup, view recent logs."""
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'trigger_reminders':
            try:
                result = send_upcoming_reminders()
                messages.success(request, f"Sent {result['sent_count']} of {result['total_events']} reminders")
            except Exception as e:
                messages.error(request, f"Reminder trigger failed: {e}")
                logger.error(f"Manual reminder trigger failed: {e}")
        elif action == 'export_backup':
            try:
                output_dir = Path('backups')
                output_dir.mkdir(exist_ok=True)
                output_file = output_dir / f'backup_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json'
                users = User.objects.all().values('id', 'username', 'email', 'is_active', 'is_verified')
                events = Event.objects.all().values(
                    'id', 'user_id', 'name', 'event_type', 'date',
                    'remind_days_before', 'message', 'created_at', 'notified',
                )
                data = {'users': list(users), 'events': list(events)}
                with open(output_file, 'w') as f:
                    json.dump(data, f, indent=2, default=str)
                messages.success(request, f"Backup exported to {output_file}")
                logger.info(f"Manual backup exported to {output_file}")
            except Exception as e:
                messages.error(request, f"Backup failed: {e}")
                logger.error(f"Manual backup failed: {e}")

    log_file = Path(settings.BASE_DIR) / 'logs' / 'app.log'
    logs = []
    try:
        with open(log_file, 'r') as f:
            logs = f.readlines()[-50:]
    except FileNotFoundError:
        logs = ['Log file not found']

    return render(request, 'admin_tools.html', {'logs': logs})


