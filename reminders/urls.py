from django.urls import path
from . import views
from .views import trigger_send_reminders

urlpatterns = [
    path('', views.event_list, name='event_list'),
    path('add/', views.add_event, name='add_event'),
    path('send-daily-reminders/', trigger_send_reminders, name='send_daily_reminders'),
]
