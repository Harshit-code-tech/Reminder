from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('reminders/', include('reminders.urls')),
    path('users/', include('users.urls')),
    path('', lambda request: redirect('home')),
]
