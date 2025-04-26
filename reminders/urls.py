from django.urls import path
from . import views
# from .views import test_email

urlpatterns = [
    path('add/', views.add_event, name='add_event'),
    path('', views.event_list, name='event_list'),
    # path('test-email/', test_email, name='test_email'),
]
