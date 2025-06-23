from supabase import create_client
from supabase.lib.client_options import ClientOptions
from django.conf import settings
import requests
import logging
import time
import jwt

logger = logging.getLogger('app_logger')

def get_user_supabase_client(request):
    user_jwt = request.session.get('supabase_jwt')
    jwt_expiry = request.session.get('jwt_expiry', 0)

    if not user_jwt or jwt_expiry < time.time() + 300:
        if not request.user.is_authenticated:
            logger.error("No JWT and user not authenticated")
            raise ValueError("User authentication required")

        refresh_token = request.session.get('supabase_refresh_token')
        if not refresh_token:
            logger.error(f"No refresh token for {request.user.email}")
            raise ValueError("No valid Supabase session")

        try:
            response = requests.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
                headers={
                    "apikey": settings.SUPABASE_KEY,
                    "Content-Type": "application/json"
                },
                json={"refresh_token": refresh_token}
            )

            if response.status_code == 200:
                data = response.json()
                user_jwt = data.get("access_token")
                new_refresh_token = data.get("refresh_token")

                # Decode the new JWT to extract actual expiry timestamp
                decoded_jwt = jwt.decode(user_jwt, options={"verify_signature": False})
                jwt_expiry = decoded_jwt.get("exp", time.time())

                # Store in session
                request.session['supabase_jwt'] = user_jwt
                request.session['supabase_refresh_token'] = new_refresh_token
                request.session['jwt_expiry'] = jwt_expiry

                logger.info(f"Refreshed Supabase JWT for {request.user.email}")
            else:
                logger.error(f"JWT refresh failed for {request.user.email}: {response.status_code} {response.text}")
                raise ValueError("Failed to refresh Supabase JWT")

        except Exception as e:
            logger.error(f"JWT refresh error for {request.user.email}: {str(e)}")
            raise ValueError("JWT refresh failed")

    # Final client creation using fresh token
    options = ClientOptions(headers={"Authorization": f"Bearer {user_jwt}"})
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options)


def upload_media(request, event, file):
    supabase = get_user_supabase_client(request)
    file_name = file.name
    file_path = f"{request.user.supabase_id}/{event.id}/{file_name}"
    logger.debug(f"Uploading media to path: {file_path}")

    response = supabase.storage.from_('event-media').upload(
        file_path, file.read(), file_options={"content-type": file.content_type}
    )

    if hasattr(response, 'error') and response.error:
        logger.error(f"Media upload failed for user {request.user.username}: {response.error}")
        return None, f"Failed to upload {file_name}: {response.error}"

    elif hasattr(response, 'status_code') and response.status_code not in (200, 201):
        logger.error(f"Media upload failed for user {request.user.username}: {response}")
        return None, f"Failed to upload {file_name}."

    public_url = supabase.storage.from_('event-media').get_public_url(file_path)
    return public_url, file_path


def delete_media(request, file_path):
    supabase = get_user_supabase_client(request)
    dir_path = "/".join(file_path.split('/')[:-1])
    file_list = supabase.storage.from_('event-media').list(path=dir_path)

    file_exists = any(f['name'] == file_path.split('/')[-1] for f in file_list)
    if not file_exists:
        logger.warning(f"File not found in storage: {file_path}")
        return True

    response = supabase.storage.from_('event-media').remove([file_path])
    if response is None or (isinstance(response, list) and not response):
        logger.error(f"Media deletion failed: {file_path}")
        return False

    logger.info(f"Deleted media from storage: {file_path}")
    return True
