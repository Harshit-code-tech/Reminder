from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout, get_backends
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.shortcuts import redirect
from .forms import CustomUserCreationForm
# Home page view
from django.apps import apps
from django.utils import timezone

def home(request):
    upcoming_events = []
    if request.user.is_authenticated:
        today = timezone.localdate()
        Event = apps.get_model('reminders', 'Event')
        upcoming_events = Event.objects.filter(user=request.user, date__gte=today).order_by('date')[:5]

    return render(request, 'home.html', {'upcoming_events': upcoming_events})


# Login view
def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('event_list')  # Redirect to the event list after login
        else:
            messages.error(request, "Invalid login credentials")
    else:
        form = AuthenticationForm()
    return render(request, 'users/login.html', {'form': form})

# Signup view
def signup_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.save()
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password1')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                messages.success(request, "Account created successfully.")
                return redirect('home')
            else:
                messages.error(request, "Authentication failed after signup. Please login manually.")
                return redirect('login')
        else:
            messages.error(request, "Error during signup. Please correct the errors below.")
    else:
        form = CustomUserCreationForm()
    return render(request, 'users/signup.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('home')