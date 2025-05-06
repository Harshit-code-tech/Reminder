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
from django.core.signing import Signer
from django_ratelimit.decorators import ratelimit
import string
import random
from .models import VerificationCode, AuditLog
from .forms import CustomUserCreationForm, User
from .decorators import email_verified_required
from .utils import EmailService

logger = logging.getLogger('app_logger')
signer = Signer()

def too_many_requests(request, exception=None):
    return render(request, '429.html', status=429)
# Home page view
@email_verified_required
def home(request):
    today = timezone.localdate()
    Event = apps.get_model('reminders', 'Event')
    events = Event.objects.filter(user=request.user, date__gte=today).order_by('date')
    paginator = Paginator(events, 5)
    page_number = request.GET.get('page')
    upcoming_events = paginator.get_page(page_number)
    return render(request, 'home.html', {'upcoming_events': upcoming_events})

# Login view
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
                messages.info(request, "Please verify your email. A verification code has been sent.")
                return redirect('verify_email')

            messages.success(request, f"Welcome back, {user.username}!")
            return redirect('event_list')
        else:
            messages.error(request, "Invalid username or password. Please try again.")
    else:
        form = AuthenticationForm()

    return render(request, 'users/login.html', {
        'form': form,
        'force_verify': request.session.pop('force_verify', False)
    })

# Signup view
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
            request.session['verification_token'] = signer.sign(user.id)
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

# Generate a verification code
def generate_verification_code(user, length=settings.VERIFICATION_CODE_LENGTH,
                            expiry_minutes=settings.VERIFICATION_CODE_EXPIRY_MINUTES,
                            charset=string.ascii_letters + string.digits):
    # Delete ALL existing verification codes for the user
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

# Resend verification code view
@ratelimit(key='ip', rate='10/m', method='POST', block=True)

def resend_verification_code_view(request):
    last_resend = request.session.get('last_resend_time')
    if last_resend:
        last_resend_time = timezone.datetime.fromisoformat(last_resend)
        if timezone.now() < last_resend_time + timedelta(seconds=30):
            messages.error(request, "Please wait 30 seconds before requesting another code.")
            return redirect('verify_email')

    if not request.user.is_authenticated:
        token = request.session.get('verification_token')
        if not token:
            messages.error(request, "You must sign up or log in to resend the verification code.")
            return redirect('signup')
        try:
            user_id = signer.unsign(token)
            user = User.objects.get(pk=user_id)
            logger.info(f"Retrieved user for resend: {user.username}")
        except (Signer.BadSignature, User.DoesNotExist):
            logger.error(f"Invalid verification token: {token}")
            messages.error(request, "Invalid session. Please sign up again.")
            return redirect('signup')
    else:
        user = request.user
        logger.info(f"Authenticated user for resend: {user.username}")

    if user.is_active:
        messages.info(request, "Your account is already verified.")
        return redirect('event_list')

    code = generate_verification_code(user)
    if EmailService.send_verification_email(user, code):
        request.session['last_resend_time'] = timezone.now().isoformat()
        messages.success(request, "A new verification code has been sent to your email!")
    else:
        messages.error(request, "Failed to send email. Check your email address or try again later.")
    return redirect('verify_email')

# Verify email view
def verify_email_view(request):
    if not request.user.is_authenticated:
        token = request.session.get('verification_token')
        if not token:
            messages.error(request, "You must sign up or log in to verify your email.")
            return redirect('signup')
        try:
            user_id = signer.unsign(token)
            user = User.objects.get(pk=user_id)
            logger.info(f"Retrieved user: {user.username}")
        except (Signer.BadSignature, User.DoesNotExist):
            logger.error(f"Invalid verification token: {token}")
            messages.error(request, "Invalid session. Please sign up again.")
            return redirect('signup')
    else:
        user = request.user
        logger.info(f"Authenticated user: {user.username}")

    if user.is_active:
        messages.info(request, "Your account is already verified!")
        return redirect('event_list')

    if request.method == 'POST':
        code = request.POST.get('code', '').strip()
        logger.info(f"Submitted code: {code}")
        try:
            verification = VerificationCode.objects.get(user=user, code=code)
            logger.info(f"Found verification code: {verification.code} for user: {user.username}")
        except VerificationCode.DoesNotExist:
            logger.error(f"No verification code found for user: {user.username}, code: {code}")
            messages.error(request, "Invalid verification code. Check your email or request a new one.")
            return redirect('verify_email')
        except VerificationCode.MultipleObjectsReturned:
            logger.error(f"Multiple verification codes found for user: {user.username}, code: {code}")
            VerificationCode.objects.filter(user=user).delete()
            messages.error(request, "Invalid verification state. Please request a new code.")
            return redirect('resend_verification_code')

        if verification.is_expired():
            verification.delete()
            messages.error(request, "Verification code expired. Please request a new one.")
            return redirect('resend_verification_code')

        user.is_active = True
        user.save()
        verification.delete()
        AuditLog.objects.create(user=user, action='email_verified', details='Email verified successfully')
        request.session.pop('verification_token', None)
        request.session.pop('last_resend_time', None)
        logger.info(f"User {user.username} email verified successfully")
        messages.success(request, "Your email has been verified successfully!")
        return redirect('event_list')

    return render(request, 'users/verify_email.html')

# Logout view
def logout_view(request):
    user = request.user
    auth_logout(request)
    if user.is_authenticated:  # Check if user was logged in
        AuditLog.objects.create(user=user, action='logout', details='User logged out')
    messages.success(request, "You have been logged out.")
    return redirect('login')