import logging
from datetime import timedelta
from django.utils import timezone
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login as auth_login, authenticate, logout as auth_logout
from django.contrib.auth.forms import AuthenticationForm
from django.conf import settings
from django.apps import apps
from django.core.paginator import Paginator
from django_ratelimit.decorators import ratelimit
import string
import random
from .models import VerificationCode, AuditLog
from .forms import CustomUserCreationForm, User
from .decorators import email_verified_required
from .utils import EmailService
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.forms import PasswordResetForm
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator

logger = logging.getLogger('app_logger')


def too_many_requests(request, exception=None):
    return render(request, '429.html', status=429)


@email_verified_required
def home(request):
    today = timezone.localdate()
    Event = apps.get_model('reminders', 'Event')
    events = Event.objects.filter(user=request.user, date__gte=today).order_by('date')
    paginator = Paginator(events, 5)
    page_number = request.GET.get('page')
    upcoming_events = paginator.get_page(page_number)
    return render(request, 'home.html', {'upcoming_events': upcoming_events})


@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def login_view(request):
    if request.user.is_authenticated:
        return redirect('event_list')

    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)
            AuditLog.objects.create(user=user, action='login', details='User logged in')
            if not user.is_active:
                code = generate_verification_code(user)
                EmailService.send_verification_email(user, code)
                refresh = RefreshToken.for_user(user)
                request.session['access_token'] = str(refresh.access_token)
                request.session['refresh_token'] = str(refresh)
                request.session['force_verify'] = True
                messages.info(request, "Please verify your email. A verification code has been sent.")
                return redirect('verify_email')
            refresh = RefreshToken.for_user(user)
            request.session['access_token'] = str(refresh.access_token)
            request.session['refresh_token'] = str(refresh)
            messages.success(request, f"Welcome back, {user.username}!")
            return redirect('event_list')
        else:
            logger.warning(f"Failed login attempt: {request.POST.get('username')}")
            messages.error(request, "Invalid username or password. Please try again.")
    else:
        form = AuthenticationForm()

    return render(request, 'users/login.html', {
        'form': form,
        'force_verify': request.session.get('force_verify', False)
    })


@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def signup_view(request):
    if request.user.is_authenticated:
        return redirect('event_list')

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False
            user.save()
            refresh = RefreshToken.for_user(user)
            request.session['access_token'] = str(refresh.access_token)
            request.session['refresh_token'] = str(refresh)
            request.session['user_id'] = user.id
            logger.info(f"User signed up: {user.username}, user_id: {user.id}")
            code = generate_verification_code(user)
            EmailService.send_verification_email(user, code)
            messages.success(request, "Account created! Check your email (including spam) for the verification code.")
            return redirect('verify_email')
        else:
            messages.error(request, "Signup failed. Please check your username, email, or password.")
    else:
        form = CustomUserCreationForm()

    return render(request, 'users/signup.html', {'form': form})


def generate_verification_code(user, length=settings.VERIFICATION_CODE_LENGTH,
                               expiry_minutes=settings.VERIFICATION_CODE_EXPIRY_MINUTES,
                               charset=string.ascii_letters + string.digits):
    VerificationCode.objects.filter(user=user).delete()
    max_attempts = settings.VERIFICATION_CODE_MAX_ATTEMPTS
    for _ in range(max_attempts):
        code = ''.join(random.choices(charset, k=length))
        if not VerificationCode.objects.filter(user=user, code=code).exists():
            expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
            VerificationCode.objects.create(user=user, code=code, expires_at=expires_at)
            logger.info(f"Generated verification code for user {user.username}: {code}")
            return code
    logger.error(f"Failed to generate unique verification code for user {user.username} after {max_attempts} attempts")
    raise ValueError("Unable to generate a unique verification code")


@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def resend_verification_code_view(request):
    last_resend = request.session.get('last_resend_time')
    if last_resend:
        last_resend_time = timezone.datetime.fromisoformat(last_resend)
        if timezone.now() < last_resend_time + timedelta(seconds=30):
            messages.error(request, "Please wait 30 seconds before requesting another code.")
            return redirect('verify_email')

    if request.user.is_authenticated:
        user = request.user
        logger.info(f"Authenticated user for resend: {user.username}")
    else:
        user_id = request.session.get('user_id')
        if not user_id:
            logger.error("No user_id in session for resend")
            messages.error(request, "Session expired. Please sign up again.")
            return redirect('signup')
        try:
            user = User.objects.get(id=user_id)
            logger.info(f"Retrieved user for resend: {user.username}")
        except User.DoesNotExist:
            logger.error(f"User not found for user_id: {user_id}")
            messages.error(request, "No account found. Please sign up again.")
            return redirect('signup')

    if user.is_active:
        messages.info(request, "Your account is already verified.")
        return redirect('event_list')

    code = generate_verification_code(user)
    if EmailService.send_verification_email(user, code):
        request.session['last_resend_time'] = timezone.now().isoformat()
        refresh = RefreshToken.for_user(user)
        request.session['access_token'] = str(refresh.access_token)
        request.session['refresh_token'] = str(refresh)
        messages.success(request, "A new verification code has been sent to your email!")
    else:
        messages.error(request, "Failed to send email. Check your email address or try again later.")
    return redirect('verify_email')


@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def verify_email_view(request):
    if request.method == 'POST':
        code = request.POST.get('code', '').strip()
        logger.info(f"Submitted code: {code}")
        try:
            verification = VerificationCode.objects.get(code=code)
            user = verification.user
            logger.info(f"Found verification code: {verification.code} for user: {user.username}")
        except VerificationCode.DoesNotExist:
            logger.error(f"No verification code found for code: {code}")
            messages.error(request, "Invalid verification code. Check your email or request a new one.")
            return redirect('verify_email')
        except VerificationCode.MultipleObjectsReturned:
            logger.error(f"Multiple verification codes found for code: {code}")
            VerificationCode.objects.filter(code=code).delete()
            messages.error(request, "Invalid verification state. Please request a new code.")
            return redirect('resend_verification_code')

        if verification.is_expired():
            verification.delete()
            messages.error(request, "Verification code expired. Please request a new one.")
            return redirect('resend_verification_code')

        user.is_active = True
        user.save()
        verification.delete()
        auth_login(request, user)
        AuditLog.objects.create(user=user, action='email_verified', details='Email verified successfully')
        refresh = RefreshToken.for_user(user)
        request.session['access_token'] = str(refresh.access_token)
        request.session['refresh_token'] = str(refresh)
        request.session.pop('last_resend_time', None)
        request.session.pop('user_id', None)
        request.session.pop('force_verify', None)
        logger.info(f"User {user.username} email verified successfully")
        messages.success(request, "Your email has been verified successfully!")
        return redirect('event_list')

    return render(request, 'users/verify_email.html')


def logout_view(request):
    user = request.user
    auth_logout(request)
    if user.is_authenticated:
        AuditLog.objects.create(user=user, action='logout', details='User logged out')
    messages.success(request, "You have been logged out.")
    return redirect('login')


@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def password_reset_request(request):
    if request.method == 'POST':
        form = PasswordResetForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            try:
                user = User.objects.filter(email=email).first()
                if not user:
                    messages.error(request, "No account found with this email.")
                else:
                    subject = "Password Reset Request"
                    message = f"""
                    Hi {user.username},

                    You requested a password reset. Click the link below to reset your password:
                    {request.build_absolute_uri('/users/reset/')}{user.id}/{default_token_generator.make_token(user)}/

                    If you didn't request this, please ignore this email.

                    Thanks,
                    Birthday Reminder App
                    """
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [email],
                        fail_silently=False,
                    )
                    messages.success(request, "Password reset email sent. Check your inbox (including spam).")
                    return redirect('password_reset_done')
            except Exception as e:
                logger.error(f"Error sending password reset email: {str(e)}")
                messages.error(request, "Failed to send reset email. Please try again later.")
        else:
            messages.error(request, "Please enter a valid email address.")
    else:
        form = PasswordResetForm()
    return render(request, 'users/password_reset.html', {'form': form})