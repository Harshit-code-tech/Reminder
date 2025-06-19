from django.contrib import admin
from django.urls import path, include
from . import views
from reminders.views import (
    public_card_view,
    generate_share_link,
    validate_share,
    validate_card_password,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('reminders/', include('reminders.urls')),
    path('users/', include('users.urls')),
    path('', views.home, name='home'),
    path('health/', views.health_check, name='health_check'),
    path('admin-tools/', views.admin_tools, name='admin_tools'),
    path('share/<uuid:token>/', public_card_view, name='public_card_view'),
    path('share/generate/<int:event_id>/', generate_share_link, name='generate_share_link'),
    path('validate-share/<uuid:token>/', validate_share, name='validate_share'),
    path('validate-password/<int:event_id>/', validate_card_password, name='validate_card_password'),
]