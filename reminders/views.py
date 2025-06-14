from datetime import datetime
import logging

from django.utils import timezone
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib import messages
from .models import Event, CelebrationCardPage, EventMedia, Reflection
from .forms import EventForm
from .utils import send_upcoming_reminders, process_bulk_import, get_csv_template, get_analytics_data
from users.decorators import email_verified_required
from .supabase_helpers import get_user_supabase_client
import uuid
from .cron import daily_reminder_job, daily_deletion_notification_job, daily_media_cleanup_job
import csv
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
            messages.error(request, "Recurring is only available for birthdays and anniversaries")
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

                files = request.FILES.getlist('media_files')
                supabase = get_user_supabase_client(request)

                for file in files:
                    if file.size > settings.MAX_FILE_SIZE:
                        messages.error(request, f"File '{file.name}' exceeds 50MB limit.")
                        event.delete()
                        return redirect('event_create')
                    if file.content_type not in settings.ALLOWED_MEDIA_TYPES:
                        messages.error(request,
                                       f"Invalid file type for '{file.name}'. Allowed: .jpg, .png, .pdf, .mp3, .wav")
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
                    EventMedia.objects.create(
                        event=event,
                        media_file=public_url,
                        media_type=file.content_type.split('/')[0],
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
                        if media and media.id:
                            media.delete()
                        else:
                            logger.error(
                                f"Cannot delete EventMedia: invalid or unsaved object for event '{event.name}'")

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


@login_required
@email_verified_required
def card_view(request, event_id, page_number):
    event = get_object_or_404(Event, id=event_id, user=request.user)
    try:
        page = CelebrationCardPage.objects.get(event=event, page_number=page_number)
    except CelebrationCardPage.DoesNotExist:
        page = None
        if page_number == 1:
            page = CelebrationCardPage.objects.create(
                event=event,
                page_number=1,
                caption="Welcome to your celebration card!"
            )

    if page_number == 1:
        if request.method == 'POST':
            password = request.POST.get('password')
            expected_password = event.name.split()[0].lower() if event.event_type in ['birthday','other',
                                                                                      'anniversary'] else event.highlights.lower() or 'love'
            if password.lower() == expected_password:
                return redirect('reminders:card_view', event_id=event_id, page_number=page_number)
            else:
                messages.error(request, 'Incorrect password.')
        else:
            return render(request, 'reminders/card_view.html', {
                'event': event,
                'page_number': page_number,
                'requires_password': True
            })

    next_page = page_number + 1 if page_number < 5 else None
    context = {
        'event': event,
        'page': page,
        'page_number': page_number,
        'next_page': next_page,
    }
    return render(request, 'reminders/card_view.html', context)


def trigger_cron_jobs(request):
    secret = request.GET.get('secret')
    if secret != settings.REMINDER_CRON_SECRET:
        return HttpResponse("Invalid secret", status=403)
    logger.info(f"Triggering cron jobs for user {request.user.username}")
    daily_reminder_job()
    daily_deletion_notification_job()
    daily_media_cleanup_job()
    return HttpResponse("Cron jobs triggered")


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