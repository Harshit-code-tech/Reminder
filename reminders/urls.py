from django.urls import path
from . import views
from .views import trigger_send_reminders

urlpatterns = [
    path('', views.event_list, name='event_list'),
    path('create/', views.add_event, name='event_create'),
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('update/<int:event_id>/', views.edit_event, name='event_update'),
    path('delete/<int:event_id>/', views.delete_event, name='event_delete'),
    path('send-daily-reminders/', trigger_send_reminders, name='send_daily_reminders'),
    path('media/delete/<int:event_id>/', views.delete_event_media, name='delete_event_media'),
    path('bulk-import/', views.bulk_import, name='bulk_import'),
    path('download-template/', views.download_template, name='download_template'),
    path('analytics/', views.analytics, name='analytics'),
    path('greeting-card/<int:event_id>/', views.greeting_card_view, name='greeting_card_view'),
    path('card/<int:event_id>/validate-password/', views.validate_card_password, name='validate_card_password'),
    path('analytics/download/', views.download_analytics_report, name='download_analytics_report'),
    path('events/toggle-recurring/<int:event_id>/', views.toggle_recurring, name='toggle_recurring'),
    path('past-events/', views.past_events, name='past_events'),
    path('past-events/edit/<int:event_id>/', views.edit_past_event, name='edit_past_event'),
    path('past-events/add-reflection/<int:event_id>/', views.add_reflection, name='add_reflection'),
    path('past-events/download/', views.download_past_events, name='download_past_events'),
    path('trigger-auto-share/', views.trigger_auto_share_card, name='trigger_auto_share_card'),
]