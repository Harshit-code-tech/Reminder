from django.contrib import admin
from django.urls import path, include

from . import views
from reminders import views as reminder_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('reminders/', include('reminders.urls')),
    path('users/', include('users.urls')),
    path('', views.home, name='home'),
    path('health/', views.health_check, name='health_check'),
    path('admin-tools/', views.admin_tools, name='admin_tools'),

    # Public / shared card routes (no auth required)
    path('share/<uuid:token>/', reminder_views.public_card_view, name='public_card_view'),
    path('validate-share/<uuid:token>/', reminder_views.validate_share, name='validate_share'),
]