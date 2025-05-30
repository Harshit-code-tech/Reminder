# reminders/supabase_helpers.py
from supabase import create_client
from supabase.lib.client_options import ClientOptions
from django.conf import settings
import requests
import logging

logger = logging.getLogger('app_logger')

def get_user_supabase_client(request):
    user_jwt = request.COOKIES.get('jwt')
    if not user_jwt:
        # Fallback: Check session
        user_jwt = request.session.get('supabase_jwt')
        if not user_jwt:
            if not request.user.is_authenticated:
                logger.error("No JWT and user not authenticated")
                raise ValueError("User authentication required")
            refresh_token = request.session.get('supabase_refresh_token')
            if not refresh_token:
                logger.error(f"No refresh token for {request.user.email}")
                raise ValueError("No valid Supabase session")
            # Fetch real Supabase JWT
            try:
                # Assume Supabase password is synced during signup/login
                # We'll store it securely or use refresh token
                response = requests.post(
                    f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                    headers={
                        "apikey": settings.SUPABASE_KEY,
                        "Content-Type": "application/json"
                    },
                    json={"refresh_token": refresh_token}
                )
                if response.status_code == 200:
                    data = response.json()
                    user_jwt = response.json().get("access_token")
                    new_refresh_token = data.get("refresh_token")
                    request.session['supabase_jwt'] = user_jwt
                    request.session['supabase_refresh_token'] = new_refresh_token
                    logger.info(f"Refreshed Supabase JWT for {request.user.email}")
                else:
                    logger.error(f"JWT refreshed failed for {request.user.email}: {response.status_code} {response.text}")
                    raise ValueError("Failed to refresh Supabase JWT")
            except Exception as e:
                logger.error(f"JWT refresh error for {request.user.email}: {str(e)}")
                raise ValueError("User JWT not found")
    options = ClientOptions(headers={"Authorization": f"Bearer {user_jwt}"})
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options)