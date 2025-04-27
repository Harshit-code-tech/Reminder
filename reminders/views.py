from django.shortcuts import render, redirect
from .models import Event
from .forms import EventForm
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .utils import send_upcoming_reminders

@login_required
def add_event(request):
    if request.method == 'POST':
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.user = request.user
            event.save()
            return redirect('event_list')
        else:
            return render(request, 'reminders/event_form.html', {'form': form, 'error': 'Invalid form data'})
    else:
        form = EventForm()
    return render(request, 'reminders/event_form.html', {'form': form})

@login_required
def event_list(request):
    events = Event.objects.filter(user=request.user).order_by('date')
    return render(request, 'reminders/event_list.html', {'events': events})

@csrf_exempt
def trigger_send_reminders(request):
    try:
        secret_token = request.GET.get('token')
        if not secret_token or secret_token != getattr(settings, 'REMINDER_CRON_SECRET', None):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        send_upcoming_reminders()
        return JsonResponse({'message': 'Reminders sent successfully'})
    except Exception as e:
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)