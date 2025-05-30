from django.urls import path
from . import views
from .views import trigger_send_reminders

urlpatterns = [
    path('', views.event_list, name='event_list'),
    path('create/', views.add_event, name='event_create'),
    path('update/<int:event_id>/', views.edit_event, name='event_update'),
    path('delete/<int:event_id>/', views.delete_event, name='event_delete'),
    path('send-daily-reminders/', trigger_send_reminders, name='send_daily_reminders'),
    path('media/delete/<int:event_id>/', views.delete_event_media, name='delete_event_media'),

]