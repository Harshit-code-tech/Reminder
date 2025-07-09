from datetime import datetime, timedelta
import logging

from django.db.models import Prefetch
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_protect
from django.core.mail import send_mail
from django.utils import timezone
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required,user_passes_test
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect, Http404
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib import messages
from django_ratelimit.decorators import ratelimit
import json
from .models import Event, CelebrationCardPage, EventMedia, Reflection, CardShare
from .forms import EventForm
from .utils import send_upcoming_reminders, process_bulk_import, get_csv_template, get_analytics_data,get_admin_dashboard_stats
from users.decorators import email_verified_required
from .supabase_helpers import get_user_supabase_client
import uuid
from .cron import daily_reminder_job, daily_deletion_notification_job, daily_media_cleanup_job
import csv
from django.urls import reverse

logger = logging.getLogger('app_logger')


@login_required
@email_verified_required
def event_list(request):
    try:
        today=timezone.now().date()
        sort_by = request.GET.get('sort', 'date')
        if sort_by not in ['name', 'date']:
            sort_by = 'date'
        events = Event.objects.filter(
            user=request.user,
            date__gte=today,
            is_archived=False
        ).order_by(sort_by)
        logger.info(f"Fetched {events.count()} events for user {request.user.username}")
    except Exception as e:
        logger.error(f"Error fetching events for user {request.user.username}: {str(e)}")
        messages.error(request, "Unable to load events. Please try again later.")
        events = []
    return render(request, 'reminders/event_list.html', {'events': events})



@user_passes_test(lambda u: u.is_superuser)
def admin_dashboard(request):
    stats = get_admin_dashboard_stats()
    return render(request, 'reminders/admin_dashboard.html', context=stats)

@login_required
@email_verified_required
def toggle_recurring(request, event_id):
    if request.method == 'POST':
        event = get_object_or_404(Event, id=event_id, user=request.user)
        if event.event_type in ['birthday', 'anniversary']:
            event.is_recurring = not event.is_recurring
            event.save()
            messages.success(request, f"Recurring {'enabled' if event.is_recurring else 'disabled'} for {event.name}")
        else:
            messages.error(request, "Recurring is only available for birthdays and anniversa"
                                    "ries")
    return redirect('event_list')


@login_required
@email_verified_required
def add_event(request):
    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                event = form.save(commit=False)
                event.user = request.user
                event.save()

                supabase = get_user_supabase_client(request)
                files = request.FILES.getlist('image_files') + request.FILES.getlist('audio_files')

                for file in files:
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, f"File '{file.name}' exceeds 50MB limit.")
                        event.delete()
                        return redirect('event_create')
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, f"Invalid file type for '{file.name}'. Allowed: .jpg, .png, .mp3, .wav, .flac")
                        event.delete()
                        return redirect('event_create')

                    unique_suffix = uuid.uuid4().hex[:8]
                    filename = f"{unique_suffix}_{file.name}"
                    file_path = f"{request.user.supabase_id}/{event.id}/{filename}"
                    logger.debug(f"Uploading media to path: {file_path}")

                    response = supabase.storage.from_('event-media').upload(
                        file_path, file.read(), file_options={"content-type": file.content_type}
                    )
                    if hasattr(response, 'error') and response.error:
                        logger.error(f"Upload failed for '{file.name}': {response.error}")
                        messages.error(request, f"Failed to upload '{file.name}': {response.error}")
                        event.delete()
                        return render(request, "reminders/event_form.html", {"form": form})
                    elif hasattr(response, 'status_code') and response.status_code not in (200, 201):
                        logger.error(f"Upload failed for '{file.name}' with status: {response.status_code}")
                        messages.error(request, f"Failed to upload '{file.name}'")
                        event.delete()
                        return render(request, "reminders/event_form.html", {"form": form})

                    public_url = supabase.storage.from_('event-media').get_public_url(file_path)
                    clean_url = public_url.rstrip('?')
                    EventMedia.objects.create(
                        event=event,
                        media_file=clean_url,
                        media_type='image' if file.content_type.startswith('image/') else 'audio',
                        mime_type=file.content_type
                    )

                messages.success(request, "Event created successfully!")
                logger.info(f"Event '{event.name}' created with {len(files)} media files")
                return redirect('event_list')
            except Exception as e:
                logger.error(f"Error saving event: {str(e)}")
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

                if request.POST.get('remove_media'):
                    for media in event.media.all():
                        file_path = media.media_file
                        try:
                            dir_path = "/".join(file_path.split('/')[:-1])
                            existing_files = supabase.storage.from_('event-media').list(dir_path)
                            if any(f['name'] == file_path.split('/')[-1] for f in existing_files):
                                supabase.storage.from_('event-media').remove([file_path])
                            if media and media.id:
                                media.delete()
                            else:
                                logger.error(
                                    f"Cannot delete EventMedia: invalid or unsaved object for event '{event.name}'")
                            logger.info(f"Deleted media '{file_path}' for event '{event.name}'")
                        except Exception as e:
                            logger.warning(f"Failed to delete media {file_path}: {str(e)}")
                            messages.error(request, f"Failed to delete media: {str(e)}")
                            return render(request, "reminders/event_form.html", {"form": form, "event": event})

                files = request.FILES.getlist('image_files') + request.FILES.getlist('audio_files')
                for file in files:
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, f"File '{file.name}' exceeds 50MB limit.")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, f"Invalid file type for '{file.name}'. Allowed: .jpg, .png, .mp3, .wav, .flac")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})

                    unique_suffix = uuid.uuid4().hex[:8]
                    filename = f"{unique_suffix}_{file.name}"
                    file_path = f"{request.user.supabase_id}/{event.id}/{filename}"
                    response = supabase.storage.from_('event-media').upload(
                        file_path, file.read(), file_options={"content-type": file.content_type}
                    )
                    if hasattr(response, 'error') and response.error:
                        messages.error(request, f"Failed to upload '{file.name}': {response.error}")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})
                    elif hasattr(response, 'status_code') and response.status_code not in (200, 201):
                        messages.error(request, f"Upload failed for '{file.name}'")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})

                    public_url = supabase.storage.from_('event-media').get_public_url(file_path)
                    EventMedia.objects.create(
                        event=event,
                        media_file=public_url,
                        media_type='image' if file.content_type.startswith('image/') else 'audio',
                        mime_type=file.content_type
                    )

                form.save()
                messages.success(request, f"Event '{event.name}' updated successfully!")
                return redirect('event_list')
            except Exception as e:
                logger.error(f"Error updating event '{event.name}': {str(e)}")
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
def delete_event_media(request, media_id):
    media = get_object_or_404(EventMedia, id=media_id, event__user=request.user)
    if request.method == 'POST' and media.media_file:
        try:
            supabase = get_user_supabase_client(request)
            file_path = media.media_file
            dir_path = "/".join(file_path.split('/')[:-1])
            existing_files = supabase.storage.from_('event-media').list(dir_path)
            if not any(f['name'] == file_path.split('/')[-1] for f in existing_files):
                logger.warning(f"Media already gone for event {media.event.name}, clearing DB fields")
            else:
                supabase.storage.from_('event-media').remove([file_path])

            logger.debug(f"Attempting to delete file at path: {file_path}")
            try:
                response = supabase.storage.from_('event-media').remove([file_path])
                logger.debug(f"Supabase delete response: {response}")
                if response is None or (isinstance(response, list) and not response):
                    logger.error(f"Media deletion failed for event {media.event.id}: Invalid path or permissions")
                    messages.error(request, f"Failed to delete media for event {media.event.name}.")
                    return redirect('event_list')
                logger.info(f"Media deleted for event {media.event.id} by user {request.user.username}")
            except Exception as e:
                logger.error(f"Exception during media deletion for event {media.event.id}: {str(e)}")
                messages.error(request, f"Media deletion failed for event {media.event.name}: {str(e)}")
                return redirect('event_list')
            media.media_url = None
            media.media_type = None
            media.media_file = None
            media.save()
            messages.success(request, "Event media deleted successfully!")
            return redirect('event_list')
        except Exception as e:
            messages.error(request, f"Error deleting media: {str(e)}")
            logger.error(f"Media deletion failed for event {media.event.id}: {str(e)}")
            return redirect('event_list')
    return redirect('event_update', event_id=media.event.id)



@csrf_exempt
def trigger_send_reminders(request):
    if request.method != 'POST':
        logger.warning("Non-POST request to trigger_send_reminders")
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        secret_token = request.POST.get('token')
        if not secret_token or secret_token != settings.REMINDER_CRON_SECRET:
            logger.warning("Unauthorized attempt to trigger reminders")
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        send_upcoming_reminders()
        logger.info("Reminders sent successfully via trigger_send_reminders")
        return JsonResponse({'message': 'Reminders sent successfully'})
    except Exception as e:
        logger.error(f"Error in trigger_send_reminders: {str(e)}")
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)




# def trigger_cron_jobs(request):
#     secret = request.GET.get('secret')
#     if secret != settings.REMINDER_CRON_SECRET:
#         return HttpResponse("Invalid secret", status=403)
#     logger.info(f"Triggering cron jobs for user {request.user.username}")
#     daily_reminder_job()
#     daily_deletion_notification_job()
#     daily_media_cleanup_job()
#     auto_share_card()
#     return HttpResponse("Cron jobs triggered")


@login_required
@email_verified_required
def bulk_import(request):
    if request.method == 'POST':
        csv_file = request.FILES.get('csv_file')
        if not csv_file or not csv_file.name.endswith('.csv'):
            messages.error(request, 'Please upload a valid CSV file.')
            return render(request, 'reminders/bulk_import.html')

        if csv_file.size > settings.MAX_FILE_SIZE:
            messages.error(request, f'File size exceeds {settings.MAX_FILE_SIZE // 1024 // 1024}MB.')
            return render(request, 'reminders/bulk_import.html')

        result = process_bulk_import(request.user, csv_file)
        if result['success_count'] > 0:
            messages.success(request, f"Imported {result['success_count']} events successfully.")
        if result['failure_count'] > 0:
            messages.error(request, f"Failed to import {result['failure_count']} rows: {', '.join(result['errors'])}")
        return redirect('event_list')

    return render(request, 'reminders/bulk_import.html')


@login_required
@email_verified_required
def download_template(request):
    return get_csv_template()




def delete_event_media(request, event_id):
    media_id = request.POST.get('media_id')
    media = get_object_or_404(EventMedia, id=media_id, event_id=event_id)
    event = media.event
    user = event.user

    # Check if event is in the past
    if event.date < timezone.now().date():
        send_mail(
            subject=f"Media Removed from Past Event: {event.name}",
            message=f"Media ({media.media_type}) was removed from your past event '{event.name}' dated {event.date}.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

    media.delete()




@login_required
@email_verified_required
def analytics(request):
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    try:
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        messages.error(request, "Invalid date format. Use YYYY-MM-DD.")
        start_date = end_date = None

    analytics_data = get_analytics_data(request.user, start_date, end_date)
    context = {
        'analytics_data': analytics_data,
        'start_date': start_date,
        'end_date': end_date,
    }
    return render(request, 'reminders/analytics.html', context)

@login_required
@email_verified_required
def download_analytics_report(request):
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    try:
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return HttpResponse("Invalid date format", status=400)

    analytics_data = get_analytics_data(request.user, start_date, end_date)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="analytics_report.csv"'
    writer = csv.writer(response)

    writer.writerow(['Section', 'Metric', 'Value'])
    writer.writerow(['Events', 'Total Events', analytics_data['event_stats']['total']])
    for event_type in analytics_data['event_stats']['by_type']:
        writer.writerow(['Events', f"{event_type['event_type'].capitalize()} Count", event_type['count']])
    writer.writerow(['Events', 'Upcoming Events', analytics_data['event_stats']['upcoming']])
    writer.writerow(['Events', 'Past Events', analytics_data['event_stats']['past']])
    writer.writerow(['Reminders', 'Total Reminders', analytics_data['reminder_stats']['total']])
    writer.writerow(['Reminders', 'Successful Reminders', analytics_data['reminder_stats']['success']])
    writer.writerow(['Reminders', 'Failed Reminders', analytics_data['reminder_stats']['failure']])
    writer.writerow(['Media', 'Total Media', analytics_data['media_stats']['total']])
    for media_type in analytics_data['media_stats']['by_type']:
        writer.writerow(['Media', f"{media_type['media_type'].capitalize()} Count", media_type['count']])
    writer.writerow(['Imports', 'Total Imports', analytics_data['import_stats']['total']])
    writer.writerow(['Imports', 'Successful Imports', analytics_data['import_stats']['success_count']])
    writer.writerow(['Imports', 'Failed Imports', analytics_data['import_stats']['failure_count']])

    return response


@login_required
@email_verified_required
def past_events(request):
    try:
        today = timezone.now().date()
        event_type = request.GET.get('event_type', '')
        start_date = request.GET.get('start_date', '')
        end_date = request.GET.get('end_date', '')
        search_query = request.GET.get('search', '')

        events = Event.objects.filter(user=request.user, date__lt=today, is_archived=False)

        if event_type:
            events = events.filter(event_type=event_type)
        if start_date:
            events = events.filter(date__gte=start_date)
        if end_date:
            events = events.filter(date__lte=end_date)
        if search_query:
            events = events.filter(custom_label__icontains=search_query)

        events = events.order_by('-date')
        logger.info(f"Fetched {events.count()} past events for user {request.user.username}")
    except Exception as e:
        logger.error(f"Error fetching past events for user {request.user.username}: {str(e)}")
        messages.error(request, "Unable to load past events. Please try again later.")
        events = []

    return render(request, 'reminders/past_events.html', {
        'events': events,
        'event_types': Event.EVENT_TYPES,
        'event_type': event_type,
        'start_date': start_date,
        'end_date': end_date,
        'search_query': search_query,
    })

@login_required
@email_verified_required
def edit_past_event(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user, date__lt=timezone.now().date(), is_archived=False)
    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES, instance=event)
        if form.is_valid():
            try:
                supabase = get_user_supabase_client(request)

                if request.POST.get('remove_media'):
                    for media in event.media.all():
                        file_path = media.media_file
                        try:
                            dir_path = "/".join(file_path.split('/')[:-1])
                            existing_files = supabase.storage.from_('event-media').list(dir_path)
                            if any(f['name'] == file_path.split('/')[-1] for f in existing_files):
                                supabase.storage.from_('event-media').remove([file_path])
                            if media and media.id:
                                media.delete()
                            else:
                                logger.error(
                                    f"Cannot delete EventMedia: invalid or unsaved object for event '{event.name}'")
                            logger.info(f"Deleted media '{file_path}' for event '{event.name}'")
                        except Exception as e:
                            logger.warning(f"Failed to delete media {file_path}: {str(e)}")
                            messages.error(request, f"Failed to delete media: {str(e)}")
                            return render(request, "reminders/event_form.html", {"form": form, "event": event})

                files = request.FILES.getlist('media_files')
                for file in files:
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, f"File '{file.name}' exceeds 50MB limit.")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request, f"Invalid file type for '{file.name}'.")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})

                    unique_suffix = uuid.uuid4().hex[:8]
                    filename = f"{unique_suffix}_{file.name}"
                    file_path = f"{request.user.supabase_id}/{event.id}/{filename}"
                    response = supabase.storage.from_('event-media').upload(
                        file_path, file.read(), file_options={"content-type": file.content_type}
                    )
                    if hasattr(response, 'error') and response.error:
                        messages.error(request, f"Failed to upload '{file.name}': {response.error}")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})
                    elif hasattr(response, 'status_code') and response.status_code not in (200, 201):
                        messages.error(request, f"Upload failed for '{file.name}'")
                        return render(request, "reminders/event_form.html", {"form": form, "event": event})

                    public_url = supabase.storage.from_('event-media').get_public_url(file_path)
                    EventMedia.objects.create(
                        event=event,
                        media_file=public_url,
                        media_type=file.content_type.split('/')[0],
                    )

                form.save()
                messages.success(request, f"Past event '{event.name}' updated successfully!")
                logger.info(f"Past event '{event.name}' updated for user {request.user.username}")
                return redirect('past_events')
            except Exception as e:
                logger.error(f"Error updating past event '{event.name}': {str(e)}")
                messages.error(request, f"Failed to update past event: {str(e)}")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = EventForm(instance=event)
    return render(request, 'reminders/event_form.html', {'form': form, 'event': event})

@login_required
@email_verified_required
def add_reflection(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user, date__lt=timezone.now().date(), is_archived=False)
    reflection = event.reflections.first()

    if request.method == 'GET':
        return JsonResponse({
            'event': {
                'id': event.id,
                'name': event.name,
                'event_type_display': event.get_event_type_display(),
                'date': event.date.strftime('%Y-%m-%d'),
                'message': event.message or '',
                'media': [{'media_file': m.media_file, 'media_type': m.media_type} for m in event.media.all()],
            },
            'reflection': {'note': reflection.note} if reflection else None,
        })

    if request.method == 'POST':
        note = request.POST.get('note')
        if note:
            try:
                Reflection.objects.update_or_create(
                    user=request.user,
                    event=event,
                    defaults={'note': note}
                )
                logger.info(f"Reflection added for event '{event.name}' by user {request.user.username}")
                return JsonResponse({'success': True})
            except Exception as e:
                logger.error(f"Error saving reflection for event '{event.name}': {str(e)}")
                return JsonResponse({'success': False, 'error': str(e)}, status=500)
        return JsonResponse({'success': False, 'error': 'Reflection note cannot be empty.'}, status=400)



@login_required
@email_verified_required
def download_past_events(request):
    try:
        today = timezone.now().date()
        events = Event.objects.filter(user=request.user, date__lt=today, is_archived=False).order_by('-date')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="past_events.csv"'
        writer = csv.writer(response)
        writer.writerow(['Name', 'Event Type', 'Date', 'Message', 'Custom Label', 'Reflection', 'Media Count'])

        for event in events:
            reflection = event.reflections.first()
            writer.writerow([
                event.name,
                event.get_event_type_display(),
                event.date,
                event.message or '',
                event.custom_label or '',
                reflection.note if reflection else '',
                event.media.count(),
            ])

        logger.info(f"Exported past events CSV for user {request.user.username}")
        return response
    except Exception as e:
        logger.error(f"Error exporting past events CSV for user {request.user.username}: {str(e)}")
        messages.error(request, "Unable to export past events. Please try again later.")
        return redirect('past_events')



@login_required
@email_verified_required
def greeting_card_view(request, event_id):
    session_key = f'card_unlocked_{event_id}'

    event = get_object_or_404(Event.objects.prefetch_related(
        Prefetch('media', queryset=EventMedia.objects.all()),
        'reflections'
    ), id=event_id, user=request.user)
    # Get audio media for page 4
    audio_media = event.media.filter(media_type='audio').first()
    audio_url = audio_media.media_file if audio_media else None
    audio_mime_type = audio_media.mime_type if audio_media else None

    # Get image media for page 3
    images = [{'media_file': m.media_file, 'media_type': m.media_type} for m in event.media.filter(media_type='image')]

    requires_card_password = bool(event.card_password and not request.session.get(session_key))
    error = request.session.pop('card_error', None) if requires_card_password else None
    if not requires_card_password:
        request.session[session_key] = True

    context = {
        'event': event,
        'is_owner': True,
        'requires_card_password': requires_card_password,
        'requires_share_password': False,
        'error': error,
        'highlights': event.highlights or '',
        'audio_url': audio_url,  # For page 4 audio player
        'audio_mime_type': audio_mime_type,
        'images': images,  # For page 3 slideshow
        'event_type': event.event_type,
        'recipient_name': event.custom_label or event.name,
        'message': event.message or '',
    }
    logger.info(f"Audio URL for event {event_id}: {audio_url}, MIME type: {audio_mime_type}")
    return render(request, 'reminders/greeting_card.html', context)


@csrf_exempt
def get_event_highlights(request, event_id):
    try:
        event = Event.objects.get(pk=event_id)
        return JsonResponse({'highlights': event.highlights or ""})
    except Event.DoesNotExist:
        raise Http404("Event not found")

@ratelimit(key='ip', rate='10/m', block=True)
@csrf_protect
def validate_card_password(request, event_id):
    event = get_object_or_404(Event, id=event_id)

    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

    try:
        data = json.loads(request.body)
        password = data.get('card_password', '').strip()
    except Exception as e:
        logger.error(f"Failed to parse JSON for event {event_id}: {e}")
        return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)

    is_valid = False

    if event.event_type == 'birthday':
        is_valid = password == event.name.strip()
    elif event.event_type == 'anniversary':
        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%B %d, %Y', '%b %d, %Y']:
            try:
                input_date = datetime.strptime(password, fmt).date()
                is_valid = event.check_card_password(input_date.strftime('%Y-%m-%d'))
                if is_valid:
                    break
            except ValueError:
                continue
    else:
        is_valid = event.check_card_password(password)

    if is_valid:
        request.session[f"card_unlocked_{event.id}"] = True
        logger.info(f"Event {event_id}: Card password validated successfully (AJAX)")
        return JsonResponse({'success': True})
    else:
        logger.warning(f"Event {event_id}: Invalid card password attempt (AJAX)")
        return JsonResponse({'success': False, 'error': 'Incorrect card password'})



def auto_share_card():
    today = timezone.now().date()
    events = Event.objects.filter(
        date=today,
        recipient_email__isnull=False,
        auto_share_enabled=True,
        shares__isnull=True,
        is_archived=False
    )
    for event in events:
        try:
            # Skip if no recipient email
            if not event.recipient_email:
                logger.info(f"Skipping auto-share for event {event.id}: No recipient email")
                continue

            # Generate a random password for the share link
            password = CardShare.generate_random_password()
            share = CardShare.objects.create(
                event=event,
                token=str(uuid.uuid4()),
                expires_at=timezone.now() + timedelta(days=3),
                is_auto_generated=True
            )
            share.set_password(password)
            share.save()

            # Generate the share URL
            validation_base_url = getattr(settings, 'SHARE_VALIDATION_BASE_URL', settings.SITE_URL)
            share_url = f"{validation_base_url.rstrip('/')}/validate-share/{share.token}/"

            # Send email to the recipient
            subject = f"Greeting Card for {event.name}'s {event.get_event_type_display()}"
            template_name = 'emails/auto_share_card.html'
            context = {
                'recipient_name': event.name,
                'sender_name': event.user.username,
                'event_type': event.get_event_type_display(),
                'share_url': share_url,
                'password': password,
                'expires_days': 3
            }
            try:
                send_mail(
                    subject=subject,
                    message='',  # Plain text message is empty as we use HTML
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[event.recipient_email],
                    html_message=render_to_string(template_name, context),
                    fail_silently=False
                )
                logger.info(f"Auto-shared card for event {event.id} to {event.recipient_email}")
            except Exception as e:
                logger.error(f"Failed to send auto-share email for event {event.id}: {str(e)}")
                share.delete()  # Delete the share if email fails
        except Exception as e:
            logger.error(f"Error in auto-sharing card for event {event.id}: {str(e)}")



@csrf_exempt
def trigger_auto_share_card(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    secret_token = request.POST.get('token')
    if not secret_token or secret_token != settings.REMINDER_CRON_SECRET:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    try:
        auto_share_card()
        return JsonResponse({'message': 'Auto-share card triggered successfully'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@email_verified_required
@csrf_protect
def generate_share_link(request, event_id):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    if request.method == 'POST':
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
                password = data.get('password', '').strip()
            except Exception as e:
                return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)
        else:
            password = request.POST.get('share_password', '').strip()
        try:
            share, created = CardShare.objects.get_or_create(
                event=event,
                defaults={
                    'token': str(uuid.uuid4()),
                    'expires_at': timezone.now() + timedelta(days=3)
                }
            )
            if password:
                share.set_password(password)
                share.save()
            validation_base_url = getattr(settings, 'SHARE_VALIDATION_BASE_URL', settings.SITE_URL)
            share_url = f"{validation_base_url.rstrip('/')}/validate-share/{share.token}/"
            logger.info(f"Generated share link for event {event.name} by user {request.user.username}: {share_url}")
            return JsonResponse({
                'success': True,
                'share_url': share_url,
                'warning': 'This link will expire in 3 days.'
            })
        except Exception as e:
            logger.error(f"Error generating share link for event {event.name}: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)



@csrf_protect
def validate_share(request, token):
    try:
        share = get_object_or_404(CardShare, token=token, expires_at__gt=timezone.now())
        if share.password:
            if request.method == 'POST':
                password = request.POST.get('password', '').strip()
                if share.check_password(password):
                    request.session[f"share_access_granted_{token}"] = True
                    share.view_count += 1
                    share.save()
                    return redirect('public_card_view', token=token)
                else:
                    return render(request, 'reminders/share_password_prompt.html', {
                        'error': 'Incorrect share password',
                        'token': token,
                        'action_url': reverse('validate_share', args=[token])
                    })
            return render(request, 'reminders/share_password_prompt.html', {
                'token': token,
                'action_url': reverse('validate_share', args=[token])
            })
        return redirect('public_card_view', token=token)
    except CardShare.DoesNotExist:
        return render(request, 'reminders/error.html', {
            'error': 'Invalid or expired share link'
        }, status=404)




@ratelimit(key='ip', rate='10/m', block=True)
@csrf_protect
def public_card_view(request, token):
    share = get_object_or_404(CardShare, token=token)

    if share.expires_at and share.expires_at < timezone.now():
        logger.warning(f"Expired share token {token} accessed")
        return render(request, 'reminders/share_expired.html', status=410)

    session_key = f"share_access_granted_{token}"
    card_session_key = f"card_unlocked_{share.event.id}"

    event = get_object_or_404(Event.objects.prefetch_related(
        Prefetch('media', queryset=EventMedia.objects.all()),
        'reflections'
    ), id=share.event.id)

    if share.password and not request.session.get(session_key):
        if request.method == 'POST':
            password = request.POST.get('password', '').strip()
            if share.check_password(password):
                request.session[session_key] = True
                share.view_count += 1
                share.save()
            else:
                return render(request, 'reminders/share_password_prompt.html', {
                    'error': 'Incorrect share password',
                    'token': token,
                    'action_url': reverse('public_card_view', args=[token])
                })
        else:
            return render(request, 'reminders/share_password_prompt.html', {
                'error': request.session.pop('share_error', None),
                'token': token,
                'action_url': reverse('public_card_view', args=[token])
            })

    # All checks passed
    request.session[session_key] = True
    request.session[card_session_key] = True
    # Get audio media for page 4
    audio_media = event.media.filter(media_type='audio').first()
    audio_url = audio_media.media_file if audio_media else None
    audio_mime_type = audio_media.mime_type if audio_media else None

    # Get image media for page 3
    images = [{'media_file': m.media_file, 'media_type': m.media_type} for m in event.media.filter(media_type='image')]

    context = {
        'event': event,
        'is_owner': False,
        'requires_card_password': bool(event.card_password),
        'requires_share_password': False,
        'token': token,
        'audio_url': audio_url,  # For page 4 audio player
        'audio_mime_type': audio_mime_type,
        'images': images,  # For page 3 slideshow
        'event_type': event.event_type,
        'recipient_name': event.custom_label or event.name,
        'message': event.message or '',
    }
    logger.info(f"Audio URL for event {share.event.id}: {audio_url}, MIME type: {audio_mime_type}")
    return render(request, 'reminders/greeting_card.html', context)


