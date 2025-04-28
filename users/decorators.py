# users/decorators.py
from django.shortcuts import redirect
from functools import wraps

def email_verified_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')

        if not request.user.is_active:
            return redirect('verify_email')

        return view_func(request, *args, **kwargs)
    return wrapper