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
from .supabase_helpers import get_user_supabase_client

logger = logging.getLogger('app_logger')

@login_required
@email_verified_required
def event_list(request):
    try:
        sort_by = request.GET.get('sort', 'date')
        if sort_by not in ['name', 'date']:
            sort_by = 'date'
        events = Event.objects.filter(user=request.user).order_by(sort_by)
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
        form = EventForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                event = form.save(commit=False)
                event.user = request.user
                event.save()  # Save to get event.id

                if request.FILES.get('media'):
                    supabase = get_user_supabase_client(request)
                    file = request.FILES['media']
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, "File size exceeds 50MB")
                        event.delete()  # Clean up
                        return redirect('event_create')
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, "Invalid file type. Allowed: .jpg, .png, .pdf, .mp3, .wav")
                        event.delete()  # Clean up
                        return redirect('event_create')

                    file_path = f"{request.user.supabase_id}/{event.id}/{file.name}"
                    response = supabase.storage.from_('event-media').upload(file_path, file.read())
                    # Check for success using status_code or data
                    # Check for error in response
                    if hasattr(response, 'error') and response.error:
                        logger.error(f"Media upload failed for user {request.user.username}: {response.error}")
                        messages.error(request, f"Failed to upload media: {response.error}")
                        event.delete()
                        return render(request, "reminders/event_form.html", {"form": form})
                    elif hasattr(response, 'status_code') and response.status_code not in (200, 201):
                        logger.error(f"Media upload failed for user {request.user.username}: {response}")
                        messages.error(request, "Failed to upload media.")
                        event.delete()
                        return render(request, "reminders/event_form.html", {"form": form})
                    else:
                        public_url = supabase.storage.from_('event-media').get_public_url(file_path)
                        event.media_url = public_url
                        event.media_type = file.content_type
                event.save()
                messages.success(request, "Event created successfully!")
                logger.info(f"Event {event.name} created for user {request.user.username}")
                return redirect('event_list')
            except Exception as e:
                logger.error(f"Error saving event for user {request.user.username}: {str(e)}")
                messages.error(request, f"Failed to create event: {str(e)}")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = EventForm()
    return render(request, "reminders/event_form.html", {"form": form})


@login_required
@email_verified_required
def edit_event(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES, instance=event)
        if form.is_valid():
            try:
                supabase = get_user_supabase_client(request)
                if 'remove_media' in request.POST and event.media_url:
                    file_path = f"{request.user.supabase_id}/{event.id}/{event.media_url.split('/')[-1]}"
                    supabase.storage.from_('event-media').remove([file_path])
                    event.media_url = None
                    event.media_type = None
                    logger.info(f"Removed media for event {event.name}")
                file = request.FILES.get('media')
                if file:
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, "File size exceeds 50MB")
                        return redirect('event_update', event_id=event_id)
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, "Invalid file type. Allowed: .jpg, .png, .pdf, .mp3, .wav")
                        return redirect('event_update', event_id=event_id)
                    file_path = f"{request.user.supabase_id}/{event.id}/{file.name}"
                    supabase.storage.from_('event-media').upload(
                        file_path, file.read(), file_options={"content-type": file.content_type}
                    )
                    signed_url = supabase.storage.from_('event-media').create_signed_url(file_path, 3600)['signedURL']
                    event.media_url = signed_url
                    event.media_type = 'image' if file.content_type.startswith('image') else 'audio'
                    logger.info(f"Updated media for event {event.name}")
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
    return render(request, 'reminders/event_form.html', {'form': form, 'event': event})

@login_required
@email_verified_required
def delete_event(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST':
        try:
            event_name = event.name
            if event.media_url:
                supabase = get_user_supabase_client(request)
                file_path = f"{request.user.supabase_id}/{event.id}/{event.media_url.split('/')[-1]}"
                supabase.storage.from_('event-media').remove([file_path])
                logger.info(f"Deleted media for event {event_name}")
            event.delete()
            logger.info(f"Event deleted: {event_name} for user {request.user.username}")
            messages.success(request, f"Event '{event_name}' deleted successfully!")
            return redirect('event_list')
        except Exception as e:
            logger.error(f"Error deleting event {event_name} for user {request.user.username}: {str(e)}")
            messages.error(request, "Failed to delete event. Please try again.")
    return render(request, 'reminders/confirm_delete.html', {'event': event})

@login_required
@email_verified_required
def delete_event_media(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST' and event.media_url:
        try:
            supabase = get_user_supabase_client(request)
            file_path = f"{request.user.supabase_id}/{event.id}/{event.media_url.split('/')[-1]}"
            supabase.storage.from_('event-media').remove([file_path])
            event.media_url = None
            event.media_type = None
            event.save()
            messages.success(request, "Media deleted successfully")
            logger.info(f"Media deleted for event {event.id} by user {request.user.username}")
        except Exception as e:
            messages.error(request, f"Media deletion failed: {str(e)}")
            logger.error(f"Media deletion failed for event {event.id}: {str(e)}")
    return redirect('event_list')

@csrf_exempt
def trigger_send_reminders(request):
    if request.method != 'POST':
        logger.warning("Non-POST request to trigger_send_reminders")
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        secret_token = request.POST.get('token')
        if not secret_token or secret_token != settings.REMINDER_CRON_SECRET:
            logger.warning("Unauthorized attempt to trigger reminders")
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        send_upcoming_reminders()
        logger.info("Reminders sent successfully via trigger_send_reminders")
        return JsonResponse({'message': 'Reminders sent successfully'})
    except Exception as e:
        logger.error(f"Error in trigger_send_reminders: {str(e)}")
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)