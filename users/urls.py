from django.urls import path, include

from . import views

urlpatterns = [
    path('', views.home, name='home'),

    # Authentication
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),

    # Email Verification
    path('verify-email/', views.verify_email_view, name='verify_email'),
    path('resend-verification-code/', views.resend_verification_code_view, name='resend_verification_code'),

    # CAPTCHA
    path('captcha/', include('captcha.urls')),

    # Password Reset
    path('password-reset/', views.password_reset_request, name='password_reset'),
    path('reset/<str:uidb64>/<str:token>/', views.password_reset_confirm, name='password_reset_confirm'),
    path('reset/done/', views.password_reset_done, name='password_reset_done'),
    path('reset/complete/', views.password_reset_complete, name='password_reset_complete'),
]
