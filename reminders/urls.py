from django.urls import path
from . import views

urlpatterns = [
    # Event CRUD
    path('', views.event_list, name='event_list'),
    path('create/', views.add_event, name='event_create'),
    path('update/<int:event_id>/', views.edit_event, name='event_update'),
    path('delete/<int:event_id>/', views.delete_event, name='event_delete'),
    path('events/toggle-recurring/<int:event_id>/', views.toggle_recurring, name='toggle_recurring'),
    path('duplicate/<int:event_id>/', views.duplicate_event, name='duplicate_event'),
    path('archive/<int:event_id>/', views.archive_event, name='archive_event'),
    path('unarchive/<int:event_id>/', views.unarchive_event, name='unarchive_event'),

    # Calendar export
    path('export/ics/', views.export_events_ics, name='export_events_ics'),
    path('export/ics/<int:event_id>/', views.export_single_event_ics, name='export_single_event_ics'),

    # Media management
    path('media/delete/<int:media_id>/', views.delete_event_media, name='delete_event_media'),

    # Bulk operations
    path('bulk-import/', views.bulk_import, name='bulk_import'),
    path('download-template/', views.download_template, name='download_template'),

    # Analytics
    path('analytics/', views.analytics, name='analytics'),
    path('analytics/download/', views.download_analytics_report, name='download_analytics_report'),

    # Past events
    path('past-events/', views.past_events, name='past_events'),
    path('past-events/edit/<int:event_id>/', views.edit_past_event, name='edit_past_event'),
    path('past-events/add-reflection/<int:event_id>/', views.add_reflection, name='add_reflection'),
    path('past-events/download/', views.download_past_events, name='download_past_events'),

    # Greeting cards (owner views)
    path('greeting-card/<int:event_id>/', views.greeting_card_view, name='greeting_card_view'),
    path('card/<int:event_id>/validate-password/', views.validate_card_password, name='validate_card_password'),
    path('card/<int:event_id>/generate-share/', views.generate_share_link, name='generate_share_link'),
    path('reveal-password/<int:event_id>/', views.reveal_card_password, name='reveal_card_password'),

    # API endpoints
    path('api/event/<int:event_id>/highlights/', views.get_event_highlights, name='get_event_highlights'),
    path('api/event/<int:event_id>/raksha-bandhan-data/', views.get_raksha_bandhan_data, name='get_raksha_bandhan_data'),

    # Cron / automated tasks
    path('send-daily-reminders/', views.trigger_send_reminders, name='send_daily_reminders'),
    path('trigger-auto-share/', views.trigger_auto_share_card, name='trigger_auto_share_card'),

    # Admin
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
]
