import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib import messages
from .models import Event
from .forms import EventForm
from .utils import send_upcoming_reminders
from users.decorators import email_verified_required

logger = logging.getLogger('app_logger')

@login_required
@email_verified_required
def event_list(request):
    try:
        events = Event.objects.filter(user=request.user).order_by('date')
        logger.info(f"Fetched {events.count()} events for user {request.user.username}")
    except Exception as e:
        logger.error(f"Error fetching events for user {request.user.username}: {str(e)}")
        messages.error(request, "Unable to load events. Please try again later.")
        events = []
    return render(request, 'reminders/event_list.html', {'events': events})

@login_required
@email_verified_required
def add_event(request):
    if request.method == 'POST':
        form = EventForm(request.POST)
        if form.is_valid():
            try:
                event = form.save(commit=False)
                event.user = request.user
                event.save()
                logger.info(f"Event created: {event.name} for user {request.user.username}")
                messages.success(request, f"Event '{event.name}' added successfully!")
                return redirect('event_list')
            except Exception as e:
                logger.error(f"Error saving event for user {request.user.username}: {str(e)}")
                messages.error(request, "Failed to add event. Please try again.")
        else:
            logger.warning(f"Invalid form submission for add_event by user {request.user.username}")
            messages.error(request, "Invalid form data. Please correct the errors below.")
    else:
        form = EventForm()
    return render(request, 'reminders/event_form.html', {'form': form})

@login_required
@email_verified_required
def edit_event(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST':
        form = EventForm(request.POST, instance=event)
        if form.is_valid():
            try:
                form.save()
                logger.info(f"Event updated: {event.name} for user {request.user.username}")
                messages.success(request, f"Event '{event.name}' updated successfully!")
                return redirect('event_list')
            except Exception as e:
                logger.error(f"Error updating event {event.name} for user {request.user.username}: {str(e)}")
                messages.error(request, "Failed to update event. Please try again.")
        else:
            logger.warning(f"Invalid form submission for edit_event by user {request.user.username}")
            messages.error(request, "Invalid form data. Please correct the errors below.")
    else:
        form = EventForm(instance=event)
    return render(request, 'reminders/event_form.html', {'form': form, 'edit': True})

@login_required
@email_verified_required
def delete_event(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST':
        try:
            event_name = event.name
            event.delete()
            logger.info(f"Event deleted: {event_name} for user {request.user.username}")
            messages.success(request, f"Event '{event_name}' deleted successfully!")
            return redirect('event_list')
        except Exception as e:
            logger.error(f"Error deleting event {event.name} for user {request.user.username}: {str(e)}")
            messages.error(request, "Failed to delete event. Please try again.")
    return render(request, 'reminders/confirm_delete.html', {'event': event})

@csrf_exempt
def trigger_send_reminders(request):
    try:
        secret_token = request.GET.get('token')
        if not secret_token or secret_token != getattr(settings, 'REMINDER_CRON_SECRET', None):
            logger.warning("Unauthorized attempt to trigger reminders")
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        send_upcoming_reminders()
        logger.info("Reminders sent successfully via trigger_send_reminders")
        return JsonResponse({'message': 'Reminders sent successfully'})
    except Exception as e:
        logger.error(f"Error in trigger_send_reminders: {str(e)}")
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)