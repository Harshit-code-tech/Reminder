from django.urls import path
from django.contrib.auth import views as auth_views
from . import views


urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('verify-email/', views.verify_email_view, name='verify_email'),
    path('resend-verification-code/', views.resend_verification_code_view, name='resend_verification_code'),
    path('logout/', views.logout_view, name='logout'),
    path('', views.home, name='home'),
]