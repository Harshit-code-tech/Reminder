from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

from . import views
urlpatterns = [
    path('admin/', admin.site.urls),
    path('reminders/', include('reminders.urls')),
    path('users/', include('users.urls')),
    path('', views.home, name='home'),
    path('health/', views.health_check, name='health_check'),
    path('admin-tools/', views.admin_tools, name='admin_tools'),
]
