"""
Custom decorators for the users app.
"""

from functools import wraps

from django.contrib import messages
from django.http import HttpResponse
from django.shortcuts import redirect
from django_ratelimit.decorators import ratelimit


def email_verified_required(view_func):
    """Ensure the user is authenticated and has a verified email."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')

        if not request.user.is_verified:
            messages.error(request, "Please verify your email before proceeding.")
            return redirect('verify_email')

        return view_func(request, *args, **kwargs)

    return wrapper


def rate_limited(view_func):
    """Rate-limit POST requests to 10 per minute per IP."""
    @wraps(view_func)
    @ratelimit(key='ip', rate='10/m', method='POST')
    def wrapper(request, *args, **kwargs):
        if getattr(request, 'limited', False):
            return HttpResponse("Rate limit exceeded", status=429)
        return view_func(request, *args, **kwargs)

    return wrapper

    return wrapper
