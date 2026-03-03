"""
Users app views: authentication, email verification, and password reset.
"""

import logging
import time

import requests
from django.apps import apps
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import (
    authenticate,
    get_backends,
    get_user_model,
    login as auth_login,
    logout as auth_logout,
)
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.paginator import Paginator
from django.shortcuts import redirect, render
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.module_loading import import_string
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_protect
from django_ratelimit.decorators import ratelimit
from rest_framework_simplejwt.tokens import RefreshToken
from user_agents import parse as user_agent_parser

from .decorators import email_verified_required
from .forms import CustomUserCreationForm, LoginForm, VerificationCodeForm, UserSettingsForm
from .models import AuditLog, VerificationCode, UserProfile
from .utils import (
    EmailService,
    generate_verification_code,
    increment_failed_login_attempts,
    is_account_locked,
    lock_account,
    normalize_identifier,
    reset_failed_login_attempts,
    should_show_captcha,
    LOCK_THRESHOLD,
)

logger = logging.getLogger('app_logger')
User = get_user_model()


# =========================================================================
# Custom error pages
# =========================================================================
def too_many_requests(request, exception=None):
    """Render the 429 rate-limit page."""
    return render(request, '429.html', status=429)


# =========================================================================
# Home (authenticated user dashboard)
# =========================================================================
@email_verified_required
def home(request):
    """Show upcoming events for the logged-in user."""
    today = timezone.localdate()
    Event = apps.get_model('reminders', 'Event')
    events = Event.objects.filter(user=request.user, date__gte=today).order_by('date')
    paginator = Paginator(events, 5)
    page_number = request.GET.get('page')
    upcoming_events = paginator.get_page(page_number)
    return render(request, 'user_home.html', {'upcoming_events': upcoming_events})


# =========================================================================
# Supabase auth helper
# =========================================================================
def _fetch_supabase_jwt(email, password):
    """Authenticate against Supabase and return (access_token, refresh_token, expires_in) or raise."""
    response = requests.post(
        f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": settings.SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=10,
    )
    if response.status_code != 200:
        raise ValueError(f"Supabase auth failed: {response.status_code} {response.text}")
    data = response.json()
    return data.get("access_token"), data.get("refresh_token"), data.get("expires_in", 3600)


def _store_supabase_session(request, token, refresh_token, expires_in):
    """Persist Supabase tokens in the Django session."""
    request.session['supabase_jwt'] = token
    request.session['supabase_refresh_token'] = refresh_token
    request.session['jwt_expiry'] = time.time() + expires_in


# =========================================================================
# Login
# =========================================================================
@csrf_protect
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_view(request):
    """Handle user login with captcha, rate limiting, and Supabase JWT."""
    identifier = ""
    show_captcha = False
    ip_address = request.META.get("REMOTE_ADDR", "unknown")
    user_info = user_agent_parser(request.META.get("HTTP_USER_AGENT", ""))

    if request.method == "POST":
        identifier = request.POST.get("username_or_email", "").strip().lower()
        show_captcha = should_show_captcha(identifier)
        form = LoginForm(request.POST, show_captcha=show_captcha)

        if not form.is_valid():
            messages.error(request, "Invalid form submission.")
            logger.warning(f"Invalid login form | Identifier: {identifier} | IP: {ip_address}")
            return render(request, "users/login.html", {
                "form": form, "show_captcha": show_captcha, "username": identifier,
            })

        identifier = normalize_identifier(form.cleaned_data["username_or_email"])
        password = form.cleaned_data["password"]

        # Account lockout check
        if is_account_locked(identifier):
            messages.error(request, "Account temporarily locked due to repeated failed attempts.")
            AuditLog.objects.create(
                user=None, action="locked_login",
                details=f"Locked account login attempt for {identifier} from IP {ip_address}",
            )
            return render(request, "users/login.html", {
                "form": LoginForm(show_captcha=True),
                "username": identifier, "show_captcha": True,
            })

        user = authenticate(request, username=identifier, password=password)

        if not user:
            attempts = increment_failed_login_attempts(identifier)
            if attempts >= LOCK_THRESHOLD:
                lock_account(identifier)
                messages.error(request, "Account locked after too many failed attempts.")
            else:
                messages.error(request, "Invalid credentials.")
            AuditLog.objects.create(
                user=None, action="failed_login",
                details=f"Failed login for {identifier}. Browser: {user_info.browser.family}, IP: {ip_address}",
            )
            return render(request, "users/login.html", {
                "form": form, "username": identifier, "show_captcha": show_captcha,
            })

        if not user.is_active:
            messages.error(request, "Account is deactivated. Please contact support.")
            return render(request, "users/login.html", {
                "form": form, "username": identifier, "show_captcha": show_captcha,
            })

        if not user.is_verified:
            code = generate_verification_code(user)
            EmailService.send_verification_email(user, code)
            request.session["force_verify"] = True
            request.session["user_id"] = user.id
            messages.info(request, "Please verify your email. A code has been sent.")
            return redirect("verify_email")

        # Successful authentication
        auth_login(request, user)
        reset_failed_login_attempts(identifier)

        try:
            token, refresh_token, expires_in = _fetch_supabase_jwt(user.email, password)
            _store_supabase_session(request, token, refresh_token, expires_in)
            logger.info(f"Fetched Supabase JWT for {user.email}")
        except Exception as e:
            logger.error(f"Supabase JWT fetch error for {user.email}: {e}")
            messages.error(request, "Failed to authenticate with Supabase.")
            return render(request, "users/login.html", {
                "form": form, "username": identifier, "show_captcha": show_captcha,
            })

        response = redirect('event_list')
        response.set_cookie(
            "jwt", token,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=60 * 60 * 2,
        )

        AuditLog.objects.create(
            user=user, action="login",
            details=f"Logged in via {user_info.device.family}/{user_info.browser.family} (IP: {ip_address})",
        )
        messages.success(request, f"Welcome back, {user.username}!")
        return response

    # GET request
    request.session.pop("force_verify", None)
    identifier = request.GET.get("username_or_email", "").strip().lower()
    show_captcha = cache.get(f"login_attempts:{identifier}", 0) >= LOCK_THRESHOLD
    form = LoginForm(show_captcha=show_captcha)

    return render(request, "users/login.html", {
        "form": form, "show_captcha": show_captcha,
        "force_verify": request.session.pop("force_verify", False),
        "username": identifier,
    })


# =========================================================================
# Signup
# =========================================================================
@csrf_protect
def signup_view(request):
    """Handle user registration with Supabase account creation."""
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = None
            try:
                user = form.save(commit=False)
                user.email = form.cleaned_data['email'].lower()
                user.is_verified = False
                user.save()

                password = form.cleaned_data['password1']

                # Create Supabase user
                response = requests.post(
                    f"{settings.SUPABASE_URL}/auth/v1/signup",
                    headers={"apikey": settings.SUPABASE_KEY, "Content-Type": "application/json"},
                    json={"email": user.email, "password": password},
                    timeout=10,
                )
                if response.status_code != 200:
                    logger.error(f"Supabase signup failed for {user.email}: {response.status_code}")
                    user.delete()
                    messages.error(request, "Failed to create Supabase account.")
                    return render(request, "users/signup.html", {"form": form})

                supabase_user = response.json().get("user", {})
                user.supabase_id = supabase_user.get("id")
                user.save()
                logger.info(f"Created Supabase user for {user.email}")

                # Fetch JWT for new user
                try:
                    token, refresh_token, expires_in = _fetch_supabase_jwt(user.email, password)
                    _store_supabase_session(request, token, refresh_token, expires_in)
                except Exception as e:
                    logger.error(f"JWT fetch failed for new user {user.email}: {e}")
                    user.delete()
                    messages.error(request, "Failed to authenticate with Supabase.")
                    return render(request, "users/signup.html", {"form": form})

                code = generate_verification_code(user)
                EmailService.send_verification_email(user, code)
                request.session["force_verify"] = True
                request.session["user_id"] = user.id
                messages.success(request, "Account created! Please verify your email.")
                return redirect("verify_email")

            except Exception as e:
                logger.error(f"Signup error: {e}")
                if user and user.pk:
                    user.delete()
                messages.error(request, "An error occurred. Please try again.")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = CustomUserCreationForm()
    return render(request, "users/signup.html", {"form": form})


# =========================================================================
# Email verification
# =========================================================================
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def resend_verification_code_view(request):
    """Resend a verification code, with a 30-second cooldown."""
    from datetime import timedelta as td

    last_resend = request.session.get('last_resend_time')
    if last_resend:
        last_resend_time = timezone.datetime.fromisoformat(last_resend)
        if timezone.now() < last_resend_time + td(seconds=30):
            messages.error(request, "Please wait 30 seconds before requesting another code.")
            return redirect('verify_email')

    if request.user.is_authenticated:
        user = request.user
    else:
        user_id = request.session.get('user_id')
        if not user_id:
            messages.error(request, "Session expired. Please sign up again.")
            return redirect('signup')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            messages.error(request, "No account found. Please sign up again.")
            return redirect('signup')

    if user.is_verified:
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
    """Verify the user's email with the 6-digit code."""
    form = VerificationCodeForm(request.POST or None)

    if request.method == 'POST' and form.is_valid():
        code = form.cleaned_data['code'].strip()

        try:
            verification = VerificationCode.objects.get(code=code)
            user = verification.user
        except VerificationCode.DoesNotExist:
            messages.error(request, "Invalid verification code. Check your email or request a new one.")
            return redirect('verify_email')
        except VerificationCode.MultipleObjectsReturned:
            VerificationCode.objects.filter(code=code).delete()
            messages.error(request, "Invalid verification state. Please request a new code.")
            return redirect('resend_verification_code')

        if verification.is_expired():
            verification.delete()
            messages.error(request, "Verification code expired. Please request a new one.")
            return redirect('resend_verification_code')

        # Mark user as verified and active
        user.is_active = True
        user.is_verified = True
        user.save()
        verification.delete()

        # Auto-login after verification
        backend_class = import_string(settings.AUTHENTICATION_BACKENDS[0])
        for backend in get_backends():
            if isinstance(backend, backend_class):
                user.backend = f"{backend.__module__}.{backend.__class__.__name__}"
                break
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

    elif request.method == 'POST':
        messages.error(request, "Invalid verification form submission.")

    return render(request, 'users/verify_email.html', {'form': form})


# =========================================================================
# Logout
# =========================================================================
def logout_view(request):
    """Log the user out and clear session data."""
    user = request.user
    auth_logout(request)
    if user.is_authenticated:
        AuditLog.objects.create(user=user, action='logout', details='User logged out', timestamp=now())
    response = redirect('home')
    messages.success(request, "You have been logged out.")
    response.delete_cookie('jwt')
    return response


# =========================================================================
# Password reset
# =========================================================================
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def password_reset_request(request):
    """Initiate a password reset by sending an email with a reset link."""
    ip_address = request.META.get('REMOTE_ADDR', 'unknown')

    if request.method == 'POST':
        form = PasswordResetForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email'].strip().lower()
            user = User.objects.filter(email=email).first()
            if not user:
                logger.warning(f"Password reset attempted for non-existent email: {email}, IP: {ip_address}")
                messages.error(request, "No account found with this email.")
            else:
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                reset_url = request.build_absolute_uri(f"/users/reset/{uidb64}/{token}/")
                if EmailService.send_reset_password_email(user, reset_url):
                    logger.info(f"Password reset email sent to {email}, IP: {ip_address}")
                    messages.success(request, "Password reset email sent. Check your inbox (including spam).")
                    return redirect('password_reset_done')
                else:
                    logger.error(f"Failed to send password reset email to {email}, IP: {ip_address}")
                    messages.error(request, "Failed to send reset email. Please try again later.")
        else:
            messages.error(request, "Please enter a valid email address.")
    else:
        form = PasswordResetForm()

    return render(request, 'users/password_reset_form.html', {'form': form})


def password_reset_done(request):
    return render(request, 'users/password_reset_done.html')


@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def password_reset_confirm(request, uidb64, token):
    """Validate the reset token and allow the user to set a new password."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    validlink = user is not None and default_token_generator.check_token(user, token)
    form = SetPasswordForm(user, request.POST or None) if validlink else None

    if request.method == 'POST' and validlink and form and form.is_valid():
        form.save()
        messages.success(request, "Your password has been set. You can now log in.")
        return redirect('password_reset_complete')

    return render(request, 'users/password_reset_confirm.html', {
        'form': form,
        'validlink': validlink,
    })


def password_reset_complete(request):
    return render(request, 'users/password_reset_complete.html')


# =========================================================================
# Account settings
# =========================================================================
from django.contrib.auth.decorators import login_required

@login_required
def account_settings(request):
    """User account settings — edit profile, notification prefs, delete account."""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        action = request.POST.get('action', 'save')

        if action == 'delete_account':
            username = request.user.username
            request.user.delete()
            auth_logout(request)
            logger.info(f"User {username} deleted their account.")
            messages.success(request, "Your account has been permanently deleted.")
            return redirect('home')

        form = UserSettingsForm(request.POST, user=request.user)
        if form.is_valid():
            # Update user fields
            old_email = request.user.email
            request.user.username = form.cleaned_data['username']
            request.user.email = form.cleaned_data['email']
            request.user.save()

            # Update profile fields
            profile.notification_email = form.cleaned_data.get('notification_email') or None
            profile.timezone = form.cleaned_data.get('timezone', 'Asia/Kolkata')
            profile.save()

            # If email changed, mark as unverified so they re-verify
            if old_email != request.user.email:
                request.user.is_verified = False
                request.user.save()
                code = generate_verification_code(request.user)
                EmailService.send_verification_email(request.user, code)
                messages.info(request, "Email changed — please verify your new email address.")
                return redirect('verify_email')

            AuditLog.objects.create(
                user=request.user,
                action='account_settings_updated',
                details='User updated their account settings.',
            )
            messages.success(request, "Settings saved successfully.")
            return redirect('account_settings')
    else:
        form = UserSettingsForm(user=request.user)

    from reminders.models import Event, ReminderLog
    event_count = Event.objects.filter(user=request.user).count()
    reminder_count = ReminderLog.objects.filter(user=request.user, status='success').count()

    return render(request, 'users/account_settings.html', {
        'form': form,
        'event_count': event_count,
        'reminder_count': reminder_count,
    })