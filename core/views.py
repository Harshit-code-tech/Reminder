import logging
import requests
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.csrf import csrf_protect
from django_ratelimit.decorators import ratelimit
from django.contrib import messages
from reminders.models import Event
from reminders.utils import send_upcoming_reminders
from django.conf import settings
from django.contrib.auth import get_user_model
from pathlib import Path
import json
import os
from django.utils import timezone

logger = logging.getLogger('app_logger')
User = get_user_model()

def home(request):
    if request.user.is_authenticated:
        return redirect('event_list')
    return render(request, 'home.html')

@ratelimit(key='ip', rate='100/h', block=True)
def health_check(request):
    checks = {}
    status_code = 200

    # Database check
    try:
        Event.objects.count()
        checks['database'] = 'ok'
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        checks['database'] = f'failed: {str(e)}'
        status_code = 500

    # MailerSend check
    try:
        response = requests.get(
            'https://api.mailersend.com/v1/domains',
            headers={'Authorization': f'Bearer {settings.MAILERSEND_API_KEY}'},
            timeout=5
        )
        response.raise_for_status()
        checks['mailersend'] = 'ok'
    except Exception as e:
        logger.error(f"MailerSend health check failed: {str(e)}")
        checks['mailersend'] = f'failed: {str(e)}'
        status_code = 500

    # Supabase (same as database)
    checks['supabase'] = checks['database']

    return JsonResponse({
        'status': 'healthy' if status_code == 200 else 'unhealthy',
        'checks': checks
    }, status=status_code)

def is_superuser(user):
    return user.is_superuser

@login_required
@user_passes_test(is_superuser)
@csrf_protect
def admin_tools(request):
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'trigger_reminders':
            try:
                result = send_upcoming_reminders()
                messages.success(request, f"Sent {result['sent_count']} of {result['total_events']} reminders")
                logger.info("Manual reminder trigger successful")
            except Exception as e:
                messages.error(request, f"Reminder trigger failed: {str(e)}")
                logger.error(f"Manual reminder trigger failed: {str(e)}")
        elif action == 'export_backup':
            try:
                output_dir = Path('backups')
                output_dir.mkdir(exist_ok=True)
                output_file = output_dir / f'backup_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json'
                users = User.objects.all().values('id', 'username', 'email', 'is_active', 'is_verified')
                events = Event.objects.all().values('id', 'user_id', 'name', 'event_type', 'date', 'remind_days_before', 'message', 'created_at', 'notified')
                data = {'users': list(users), 'events': list(events)}
                with open(output_file, 'w') as f:
                    json.dump(data, f, indent=2, default=str)
                messages.success(request, f"Backup exported to {output_file}")
                logger.info(f"Manual backup exported to {output_file}")
            except Exception as e:
                messages.error(request, f"Backup failed: {str(e)}")
                logger.error(f"Manual backup failed: {str(e)}")

    log_file = 'logs/app.log'
    logs = []
    try:
        with open(log_file, 'r') as f:
            logs = f.readlines()[-50:]
    except FileNotFoundError:
        logs = ["Log file not found"]

    return render(request, 'admin_tools.html', {'logs': logs})


