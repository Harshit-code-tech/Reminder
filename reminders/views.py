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

                file = request.FILES.get('media')
                if file:

                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, "File size exceeds 50MB")
                        event.delete()
                        return redirect('event_create')
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, "Invalid file type. Allowed: .jpg, .png, .pdf, .mp3, .wav")
                        event.delete()
                        return redirect('event_create')
                    supabase = get_user_supabase_client(request)
                    file_name = file.name
                    file_path = f"{request.user.supabase_id}/{event.id}/{file_name}"
                    event.media_path = file_path

                    logger.debug(f"Uploading media to path: {file_path}")
                    response = supabase.storage.from_('event-media').upload(
                        file_path, file.read(), file_options={"content-type": file.content_type}
                    )
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
                        event.media_path = file_path
                        event.save()
                        logger.info(f"Updated media for event {event.name}")
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
                if request.POST.get('remove_media') and event.media_path:
                    file_path = event.media_path
                    # Pre-check file existence
                    dir_path = "/".join(file_path.split('/')[:-1])
                    file_list = supabase.storage.from_('event-media').list(path=dir_path)
                    file_exists = any(f['name'] == file_path.split('/')[-1] for f in file_list)
                    if file_exists:
                        logger.debug(f"Attempting to delete file at path: {file_path}")
                        response = supabase.storage.from_('event-media').remove([file_path])
                        logger.debug(f"Supabase delete response: {response}")
                        if response is None or (isinstance(response, list) and not response):
                            logger.error(f"Media deletion failed for event {event.name}: Invalid path or permissions")
                            messages.error(request, f"Failed to delete media for event {event.name}.")
                            return render(request, "reminders/event_form.html", {"form": form})
                        event.media_url = None
                        event.media_type = None
                        event.media_path = None
                        logger.info(f"Removed media for event {event.name}")
                    else:
                        logger.warning(f"File not found in storage for event {event.name}: {file_path}")
                        event.media_url = None
                        event.media_type = None
                        event.media_path = None
                file = request.FILES.get('media')
                if file:
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, "File size exceeds 50MB")
                        return render(request, "reminders/event_form.html", {"form": form})
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, "Invalid file type. Allowed: .jpg, .png, .pdf, .mp3, .wav")
                        return render(request, "reminders/event_form.html", {"form": form})

                    file_name = file.name
                    file_path = f"{request.user.supabase_id}/{event.id}/{file_name}"
                    # If old media exists, try to remove it before replacing
                    if event.media_path:
                        old_file_path = event.media_path
                        dir_path = "/".join(old_file_path.split('/')[:-1])
                        try:
                            file_list = supabase.storage.from_('event-media').list(path=dir_path)
                            file_exists = any(f['name'] == old_file_path.split('/')[-1] for f in file_list)
                            if file_exists:
                                supabase.storage.from_('event-media').remove([old_file_path])
                            else:
                                logger.warning(f"Old media not found before replacement: {old_file_path}")
                        except Exception as e:
                            logger.warning(f"Error checking or deleting old media for {event.name}: {str(e)}")

                    logger.debug(f"Uploading media to path: {file_path}")
                    response = supabase.storage.from_('event-media').upload(
                        file_path, file.read(), file_options={"content-type": file.content_type}
                    )
                    if hasattr(response, 'error') and response.error:
                        logger.error(f"Media upload failed for user {request.user.username}: {response.error}")
                        messages.error(request, f"Failed to upload media: {response.error}")
                        return render(request, "reminders/event_form.html", {"form": form})
                    elif hasattr(response, 'status_code') and response.status_code not in (200, 201):
                        logger.error(f"Media upload failed for user {request.user.username}: {response}")
                        messages.error(request, "Failed to upload media.")
                        return render(request, "reminders/event_form.html", {"form": form})
                    else:
                        public_url = supabase.storage.from_('event-media').get_public_url(file_path)
                        event.media_url = public_url
                        event.media_type = file.content_type
                        event.media_path = file_path
                        logger.info(f"Updated media for event {event.name}")
                form.save()
                messages.success(request, f"Event '{event.name}' updated successfully!")
                logger.info(f"Event updated: {event.name} for user {request.user.username}")
                return redirect('event_list')
            except Exception as e:
                logger.error(f"Error updating event {event.name} for user {request.user.username}: {str(e)}")
                messages.error(request, f"Failed to update event: {str(e)}")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = EventForm(instance=event)
    return render(request, "reminders/event_form.html", {"form": form, "event": event})

@login_required
@email_verified_required
def delete_event(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST':
        try:
            supabase = get_user_supabase_client(request)
            if event.media_path:
                try:
                    file_path = event.media_path
                    dir_path = "/".join(file_path.split('/')[:-1])
                    existing_files = supabase.storage.from_('event-media').list(dir_path)
                    if not any(f['name'] == file_path.split('/')[-1] for f in existing_files):
                        logger.warning(f"Media already deleted for event {event.name}: {file_path}")
                    else:
                        response = supabase.storage.from_('event-media').remove([file_path])
                        logger.debug(f"Supabase delete response: {response}")
                        if not response or (isinstance(response, list) and len(response) == 0):
                            logger.error(f"Media deletion failed for event {event.name}: Invalid path or permissions")
                            messages.error(request, f"Failed to delete media for event {event.name}. Please try again.")
                            raise Exception("Delete returned empty response—possible permission error")
                        logger.info(f"Deleted media from storage: {file_path}")
                        logger.info(f"Removed media for event {event.name}")
                except Exception as e:
                    logger.error(f"Exception checking/deleting media for event {event.name}: {str(e)}")
                    messages.error(request, f"Failed to delete media for event {event.name}: {str(e)}")
                    return render(request, "reminders/confirm_delete.html", {"event": event})
            event.delete()
            messages.success(request, f"Event '{event.name}' deleted successfully!")
            logger.info(f"Event deleted: {event.name} for user {request.user.username}")
            return redirect('event_list')
        except Exception as e:
            logger.error(f"Error deleting event {event.name} for user {request.user.username}: {str(e)}")
            messages.error(request, f"Failed to delete event: {str(e)}")
    return render(request, "reminders/confirm_delete.html", {"event": event})

@login_required
@email_verified_required
def delete_event_media(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST' and event.media_path:
        try:
            supabase = get_user_supabase_client(request)
            file_path = event.media_path
            dir_path = "/".join(file_path.split('/')[:-1])
            # Optional sanity check
            existing_files = supabase.storage.from_('event-media').list(dir_path)
            if not any(f['name'] == file_path.split('/')[-1] for f in existing_files):
                logger.warning(f"Media already gone for event {event.name}, clearing DB fields")
            else:
                supabase.storage.from_('event-media').remove([file_path])

            logger.debug(f"Attempting to delete file at path: {file_path}")
            try:
                response = supabase.storage.from_('event-media').remove([file_path])
                logger.debug(f"Supabase delete response: {response}")
                if response is None or (isinstance(response, list) and not response):
                    logger.error(f"Media deletion failed for event {event.id}: Invalid path or permissions")
                    messages.error(request, f"Failed to delete media for event {event.name}.")
                    return redirect('event_list')
                logger.info(f"Media deleted for event {event.id} by user {request.user.username}")
            except Exception as e:
                logger.error(f"Exception during media deletion for event {event.id}: {str(e)}")
                messages.error(request, f"Media deletion failed for event {event.name}: {str(e)}")
                return redirect('event_list')
            event.media_url = None
            event.media_type = None
            event.media_path = None
            event.save()
            messages.success(request, "Media deleted successfully!")
        except Exception as e:
            messages.error(request, f"Media deletion failed: {str(e)}")
            logger.error(f"Media deletion failed for event {event.id}: {str(e)}")
        return redirect('event_list')
    return redirect('event_update', event_id=event_id)

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