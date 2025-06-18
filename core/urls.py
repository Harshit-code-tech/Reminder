from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from reminders import views as reminder_views
from . import views
urlpatterns = [
    path('admin/', admin.site.urls),
    path('reminders/', include('reminders.urls')),
    path('users/', include('users.urls')),
    path('', views.home, name='home'),
    path('health/', views.health_check, name='health_check'),
    path('admin-tools/', views.admin_tools, name='admin_tools'),
    path('share/<uuid:token>/', reminder_views.public_card_view, name='public_card_view'),
    path('share/generate/<int:event_id>/', reminder_views.generate_share_link, name='generate_share_link'),
]
