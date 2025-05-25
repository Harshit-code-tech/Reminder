from django.urls import path, include
from . import views
from django.contrib.auth import views as auth_views
from django.contrib.auth.tokens import default_token_generator

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('verify-email/', views.verify_email_view, name='verify_email'),
    path('resend-verification-code/', views.resend_verification_code_view, name='resend_verification_code'),
    path('logout/', views.logout_view, name='logout'),
    path('captcha/', include('captcha.urls')),
    path('password-reset/', views.password_reset_request, name='password_reset'),
    path('reset/<int:uid>/<str:token>/', views.password_reset_confirm, name='password_reset_confirm'),
    path('reset/done/', views.password_reset_done, name='password_reset_done'),
    path('reset/complete/', views.password_reset_complete, name='password_reset_complete'),
]