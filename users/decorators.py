from django.shortcuts import redirect
from functools import wraps
from django_ratelimit.decorators import ratelimit # Correct import
from django.http import HttpResponse  # Import HttpResponse


def email_verified_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')

        if not request.user.is_active:
            return redirect('verify_email')

        return view_func(request, *args, **kwargs)

    return wrapper


def rate_limited(view_func):
    @wraps(view_func)
    @ratelimit(key='ip', rate='10/m', method='POST')  # Corrected decorator
    def wrapper(request, *args, **kwargs):
        # Check if the request was rate-limited
        if getattr(request, 'limited', False):
            return HttpResponse("Rate limit exceeded", status=429)  # Return a 429 response
        return view_func(request, *args, **kwargs)

    return wrapper
