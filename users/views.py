# users/views.py
import string
import random
import logging
from mailersend import emails
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login as auth_login, authenticate, logout as auth_logout, get_backends
from django.contrib.auth.forms import AuthenticationForm
from django.utils import timezone
from django.conf import settings
from django.apps import apps
from .models import VerificationCode
from .forms import CustomUserCreationForm, User
from .decorators import email_verified_required

logger = logging.getLogger('app_logger')

# Home page view
@email_verified_required
def home(request):
    upcoming_events = []
    today = timezone.localdate()

    Event = apps.get_model('reminders', 'Event')
    upcoming_events = Event.objects.filter(user=request.user, date__gte=today).order_by('date')[:5]

    return render(request, 'home.html', {'upcoming_events': upcoming_events})


# Login view
def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)

            if not user.is_active:
                code = generate_verification_code(user)
                send_verification_email(user.email, code)
                messages.info(request, "Please verify your email. A verification code has been sent.")
                return redirect('verify_email')

            messages.success(request, f"Welcome back, {user.username}!")
            return redirect('home')
        else:
            messages.error(request, "Invalid login credentials.")
    else:
        form = AuthenticationForm()

    return render(request, 'users/login.html', {
        'form': form,
        'force_verify': request.session.pop('force_verify', False)
    })


# Signup view
def signup_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False
            user.save()


            # Store user ID in session for verification
            request.session['user_id'] = user.id

            code = generate_verification_code(user)
            send_verification_email(user.email, code)

            messages.success(request, "Account created! Please check your email for the verification code.")
            return redirect('verify_email')
        else:
            messages.error(request, "Error during signup. Please correct the errors below.")
    else:
        form = CustomUserCreationForm()

    return render(request, 'users/signup.html', {'form': form})


# Send verification email
def send_verification_email(email, code):
    api_key = settings.MAILERSEND_API_KEY
    mailer = emails.NewEmail(api_key)

    from_email = settings.DEFAULT_FROM_EMAIL
    if '<' in from_email and '>' in from_email:
        from_email = from_email.split('<')[1].strip('>')

    mail_body = {
        "from": {"email": from_email},
        "to": [{"email": email}],
        "subject": "Verify Your Email Address",
        "text": f"Your verification code is: {code}",
        "html": f"<p>Your verification code is: <strong>{code}</strong></p>"
    }

    try:
        response = mailer.send(mail_body)
        logger.info(f"Verification email sent successfully to {email}. Response: {response}")
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}. Error: {str(e)}")


# Generate a verification code
def generate_verification_code(user, length=6, expiry_minutes=10, charset=string.digits):
    VerificationCode.objects.filter(user=user).delete()

    code = ''.join(random.choices(charset, k=length))
    expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)

    VerificationCode.objects.create(user=user, code=code, expires_at=expires_at)
    return code


# Resend verification code view
def resend_verification_code_view(request):
    # Allow access to resend verification code even if the user is not authenticated
    if not request.user.is_authenticated:
        user_id = request.session.get('user_id')  # Retrieve user ID from session
        if not user_id:
            messages.error(request, "You must sign up or log in to resend the verification code.")
            return redirect('signup')  # Redirect to signup if no user ID in session
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            messages.error(request, "Invalid user session. Please sign up again.")
            return redirect('signup')
    else:
        user = request.user

    if user.is_active:
        messages.info(request, "Your account is already verified.")
        return redirect('home')

    # Generate and send new verification code
    code = generate_verification_code(user)
    send_verification_email(user.email, code)

    messages.success(request, "A new verification code has been sent to your email!")
    return redirect('verify_email')


# Verify email view
def verify_email_view(request):
    # Allow access to the verification page even if the user is not authenticated
    if not request.user.is_authenticated:
        user_id = request.session.get('user_id')  # Retrieve user ID from session
        if not user_id:
            messages.error(request, "You must sign up or log in to verify your email.")
            return redirect('signup')  # Redirect to signup if no user ID in session
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            messages.error(request, "Invalid user session. Please sign up again.")
            return redirect('signup')
    else:
        user = request.user

    if user.is_active:
        messages.info(request, "Your account is already verified!")
        return redirect('home')

    if request.method == 'POST':
        code = request.POST.get('code')
        try:
            verification = VerificationCode.objects.get(user=user, code=code)
        except VerificationCode.DoesNotExist:
            messages.error(request, "Invalid verification code.")
            return redirect('verify_email')

        if timezone.now() > verification.expires_at:
            verification.delete()
            messages.error(request, "Verification code expired. Please request a new one.")
            return redirect('resend_verification_code')

        # Mark user as active (verified)
        user.is_active = True
        user.save()
        verification.delete()
        messages.success(request, "Your email has been verified successfully!")
        return redirect('home')

    return render(request, 'users/verify_email.html')


# Logout view
def logout_view(request):
    auth_logout(request)
    return redirect('home')
