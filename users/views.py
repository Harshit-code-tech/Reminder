from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, get_backends
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
import requests
from django.core.paginator import Paginator
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django_ratelimit.decorators import ratelimit
from rest_framework_simplejwt.tokens import RefreshToken
from user_agents import parse as user_agent_parser
from django.contrib.auth.decorators import login_required
from .decorators import email_verified_required
from .forms import CustomUserCreationForm, LoginForm, VerificationCodeForm
from .models import AuditLog, User, VerificationCode
from .utils import (
    generate_verification_code, EmailService, normalize_identifier,
    increment_failed_login_attempts, is_account_locked, reset_failed_login_attempts,
    should_show_captcha, lock_account
)
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.utils.module_loading import import_string
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils.timezone import now
import logging
import random
import string
from datetime import timedelta
from django.apps import apps
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str

logger = logging.getLogger('app_logger')
User = get_user_model()

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
    return render(request, 'user_home.html', {'upcoming_events': upcoming_events})

logger = logging.getLogger(__name__)

FAILED_LOGIN_THRESHOLD = 3


# Dynamically return login form with or without CAPTCHA
def get_login_form_class(identifier):
    if should_show_captcha(identifier):
        from captcha.fields import CaptchaField
        class LoginFormWithCaptcha(LoginForm):
            captcha = CaptchaField()

        return LoginFormWithCaptcha
    return LoginForm


@csrf_protect
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_view(request):
    identifier = ""
    show_captcha = False
    form = None
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    user_info = user_agent_parser(user_agent)
    ip_address = request.META.get("REMOTE_ADDR", "unknown")

    if request.method == "POST":
        identifier = request.POST.get("username_or_email", "").strip().lower()
        show_captcha = should_show_captcha(identifier)
        form = LoginForm(request.POST, show_captcha=show_captcha)

        if not form.is_valid():
            messages.error(request, "Invalid form submission.")
            captcha_value = request.POST.get("captcha", "N/A")
            logger.error(
                f"[CAPTCHA] Invalid login form submission. CAPTCHA: {captcha_value} | Identifier: {identifier} | IP: {ip_address}"
            )
            return render(request, "users/login.html", {
                "form": form,
                "show_captcha": show_captcha,
                "username": identifier,
            })

        identifier = normalize_identifier(form.cleaned_data["username_or_email"])
        password = form.cleaned_data["password"]

        if is_account_locked(identifier):
            messages.error(request, "Account temporarily locked due to repeated failed attempts.")
            AuditLog.objects.create(
                user=None,
                action="locked_login",
                details=f"Locked account login attempt for {identifier} from IP {ip_address}",
                timestamp=timezone.now()
            )
            form = LoginForm(show_captcha=True)
            return render(request, "users/login.html", {
                "form": form,
                "username": identifier,
                "show_captcha": True,
            })

        user = authenticate(request, username=identifier, password=password)

        if not user:
            increment_failed_login_attempts(identifier)
            attempts = cache.get(f"login_attempts:{identifier}", 0)
            if attempts >= 3:
                lock_account(identifier)
                messages.error(request, "Account locked after too many failed attempts.")
            else:
                messages.error(request, "Invalid credentials.")
                if attempts >= 3:
                    messages.error(request, "Too many failed attempts? Try resetting your password.")
            AuditLog.objects.create(
                user=None,
                action="failed_login",
                details=f"Failed login for {identifier}. Browser: {user_info.browser.family}, IP: {ip_address}",
                timestamp=timezone.now()
            )
            return render(request, "users/login.html", {
                "form": form,
                "username": identifier,
                "show_captcha": show_captcha,
            })

        if not user.is_active:
            messages.error(request, "Account is deactivated. Please contact support.")
            return render(request, "users/login.html", {
                "form": form,
                "username": identifier,
                "show_captcha": show_captcha,
            })

        if not user.is_verified:
            code = generate_verification_code(user)
            EmailService.send_verification_email(user, code)
            request.session["force_verify"] = True
            request.session["user_id"] = user.id
            messages.info(request, "Please verify your email. A code has been sent.")
            return redirect("verify_email")

        auth_login(request, user)
        reset_failed_login_attempts(identifier)

        try:
            response = requests.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": settings.SUPABASE_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": user.email,
                    "password": password,
                }
            )
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                refresh_token = data.get("refresh_token")
                request.session['supabase_jwt'] = token
                request.session['supabase_refresh_token'] = refresh_token
                logger.info(f"Fetched Supabase JWT for {user.email}")
            else:
                logger.error(f"Supabase JWT fetch failed for {user.email}: {response.status_code} {response.text}")
                messages.error(request, "Failed to authenticate with Supabase.")
                return render(request, "users/login.html", {
                    "form": form,
                    "username": identifier,
                    "show_captcha": show_captcha,
                })
        except Exception as e:
            logger.error(f"Supabase JWT fetch error for {user.email}: {str(e)}")
            messages.error(request, "Failed to authenticate with Supabase.")
            return render(request, "users/login.html", {
                "form": form,
                "username": identifier,
                "show_captcha": show_captcha,
            })

        response = redirect('event_list')
        response.set_cookie(
            "jwt", token,
            httponly=True,
            secure=False if settings.DEBUG else True,
            samesite="Lax",
            max_age=60 * 60 * 2
        )
        logger.info(f"Set JWT cookie for {user.username}: {token[:10]}...")

        AuditLog.objects.create(
            user=user,
            action="login",
            details=f"User logged in via {user_info.device.family}/{user_info.browser.family} (IP: {ip_address})",
            timestamp=timezone.now()
        )

        messages.success(request, f"Welcome back, {user.username}!")
        return response

    request.session.pop("force_verify", None)
    identifier = request.GET.get("username_or_email", "").strip().lower()
    show_captcha = cache.get(f"login_attempts:{identifier}", 0) >= 3
    form = LoginForm(show_captcha=show_captcha)

    return render(request, "users/login.html", {
        "form": form,
        "show_captcha": show_captcha,
        "force_verify": request.session.pop("force_verify", False),
        "username": identifier,
    })


@csrf_protect
def signup_view(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            try:
                user = form.save(commit=False)
                user.email = form.cleaned_data['email'].lower()
                user.is_verified = False
                user.save()

                password = form.cleaned_data['password1']
                response = requests.post(
                    f"{settings.SUPABASE_URL}/auth/v1/signup",
                    headers={
                        "apikey": settings.SUPABASE_KEY,
                        "Content-Type": "application/json"
                    },
                    json={
                        "email": user.email,
                        "password": password
                    }
                )
                if response.status_code == 200:
                    supabase_user = response.json().get("user", {})
                    user.supabase_id = supabase_user.get("id")
                    user.save()
                    logger.info(f"Created Supabase user for {user.email}")

                    token_response = requests.post(
                        f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                        headers={
                            "apikey": settings.SUPABASE_KEY,
                            "Content-Type": "application/json"
                        },
                        json={
                            "email": user.email,
                            "password": password
                        }
                    )
                    if token_response.status_code == 200:
                        data = token_response.json()
                        token = data.get("access_token")
                        refresh_token = data.get("refresh_token")
                        request.session['supabase_jwt'] = token
                        request.session['supabase_refresh_token'] = refresh_token
                        logger.info(f"Fetched Supabase JWT for {user.email}")
                    else:
                        logger.error(f"JWT fetch failed for {user.email}: {token_response.status_code} {token_response.text}")
                        user.delete()
                        messages.error(request, "Failed to authenticate with Supabase.")
                        return render(request, "users/signup.html", {"form": form})
                else:
                    logger.error(f"Supabase signup failed for {user.email}: {response.status_code} {response.text}")
                    user.delete()
                    messages.error(request, "Failed to create Supabase account.")
                    return render(request, "users/signup.html", {"form": form})

                code = generate_verification_code(user)
                EmailService.send_verification_email(user, code)
                request.session["force_verify"] = True
                request.session["user_id"] = user.id
                messages.success(request, "Account created! Please verify your email.")
                return redirect("verify_email")
            except Exception as e:
                logger.error(f"Signup error for {form.cleaned_data['email']}: {str(e)}")
                if 'user' in locals():
                    user.delete()
                messages.error(request, "An error occurred. Please try again.")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = CustomUserCreationForm()
    return render(request, "users/signup.html", {"form": form})

def generate_verification_code(user, length=settings.VERIFICATION_CODE_LENGTH,
                               expiry_minutes=settings.VERIFICATION_CODE_EXPIRY_MINUTES,
                               charset=string.ascii_letters + string.digits):
    VerificationCode.objects.filter(user=user).delete()
    max_attempts = settings.VERIFICATION_CODE_MAX_ATTEMPTS
    for _ in range(max_attempts):
        code = ''.join(random.choices(charset, k=length))
        if not VerificationCode.objects.filter(user=user, code=code).exists():
            expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
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
    form = VerificationCodeForm(request.POST or None)

    if request.method == 'POST':
        if form.is_valid():
            captcha_value = form.cleaned_data.get("captcha", None)
            logger.info(f"Email verification attempt with CAPTCHA: {captcha_value}")
            code = form.cleaned_data['code'].strip()
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
            user.is_verified = True
            user.save()
            verification.delete()
            # Set the backend attribute explicitly
            backends = get_backends()
            backend_class = import_string(settings.AUTHENTICATION_BACKENDS[0])

            for backend in backends:
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
        else:
            logger.error(f"Invalid email verification form submission. CAPTCHA: {request.POST.get('captcha', 'N/A')}")
            messages.error(request, "Invalid verification form submission.")

    return render(request, 'users/verify_email.html', {'form': form})

def logout_view(request):
    user = request.user
    auth_logout(request)
    if user.is_authenticated:
        AuditLog.objects.create(user=user, action='logout', details='User logged out', timestamp=now())
    response = redirect('home')
    messages.success(request, "You have been logged out.")
    response.delete_cookie('jwt')
    return response

@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def password_reset_request(request):
    ip_address = request.META.get('REMOTE_ADDR', 'unknown')
    if request.method == 'POST':
        form = PasswordResetForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email'].strip().lower()
            try:
                user = User.objects.filter(email=email).first()
                if not user:
                    logger.warning(f"Password reset attempted for non-existent email: {email}, IP: {ip_address}")
                    messages.error(request, "No account found with this email.")
                else:
                    subject = "Password Reset Request"
                    token = default_token_generator.make_token(user)
                    uid = user.id
                    reset_url = f"{request.build_absolute_uri('/users/reset/')}{uid}/{token}/"
                    if EmailService.send_reset_password_email(user, reset_url):
                        logger.info(f"Password reset email sent to {email}, IP: {ip_address}")
                        messages.success(request, "Password reset email sent. Check your inbox (including spam).")
                        return redirect('password_reset_done')
                    else:
                        logger.error(f"Failed to send password reset email to {email}, IP: {ip_address}")
                        messages.error(request, "Failed to send reset email. Please try again later.")
            except Exception as e:
                logger.error(f"Error in password reset for {email}: {str(e)}, IP: {ip_address}")
                messages.error(request, "An error occurred. Please try again later.")
        else:
            logger.warning(f"Invalid password reset form submission, IP: {ip_address}")
            messages.error(request, "Please enter a valid email address.")
    else:
        form = PasswordResetForm()
    return render(request, 'emails/password_reset_email.html', {'form': form})


@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def password_reset_request(request):
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
                subject = "Password Reset Request"
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
            logger.warning(f"Invalid password reset form submission, IP: {ip_address}")
            messages.error(request, "Please enter a valid email address.")
    else:
        form = PasswordResetForm()
    return render(request, 'users/password_reset_form.html', {'form': form})

def password_reset_complete(request):
    return render(request, 'users/password_reset_complete.html')


def password_reset_done(request):
    return render(request, 'users/password_reset_done.html')

@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def password_reset_confirm(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    validlink = user is not None and default_token_generator.check_token(user, token)
    form = SetPasswordForm(user, request.POST or None) if validlink else None

    if request.method == 'POST' and validlink and form.is_valid():
        form.save()
        messages.success(request, "Your password has been set. You can now log in.")
        return redirect('password_reset_complete')

    return render(request, 'users/password_reset_confirm.html', {
        'form': form,
        'validlink': validlink,
    })