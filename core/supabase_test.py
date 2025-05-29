
import os
import sys
import django
import requests
import datetime
import logging
from django.conf import settings
from zoneinfo import ZoneInfo
import jwt

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from users.models import User

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
BUCKET = "event-media"

def get_real_jwt(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": password
    }
    try:
        res = requests.post(url, headers=headers, json=data)
    except Exception as e:
        logger.error(f"[LOGIN] Exception for {email}: {e}")
        raise

    if res.status_code == 200:
        token = res.json().get("access_token")
        logger.info(f"[LOGIN] Success for {email}")
        return token
    elif res.status_code == 400 and "Invalid login credentials" in res.text:
        logger.warning(f"[LOGIN] User not found. Trying signup for {email}...")
        if signup_user(email, password):
            return get_real_jwt(email, password)
    logger.error(f"[LOGIN] Auth failed for {email}: {res.status_code} {res.text}")
    raise Exception(f"[ERROR] Auth failed for {email}: {res.status_code} {res.text}")

def get_sub_from_token(token):
    try:
        return jwt.decode(token, options={"verify_signature": False})["sub"]
    except Exception as e:
        logger.error(f"[JWT] Failed to decode token: {e}")
        raise

def signup_user(email, password):
    url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": password
    }
    try:
        res = requests.post(url, headers=headers, json=data)
    except Exception as e:
        logger.error(f"[SIGNUP] Exception for {email}: {e}")
        return False

    if res.status_code == 200:
        logger.info(f"[SIGNUP] User {email} registered in Supabase.")
    elif res.status_code == 400 and "User already registered" in res.text:
        logger.info(f"[SIGNUP] User {email} already exists.")
    else:
        logger.error(f"[SIGNUP] FAILED: {res.status_code} {res.text}")
    return res.ok

def upload_file(user_token, user_id, local_file):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{user_id}/{os.path.basename(local_file)}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {user_token}"
    }
    try:
        with open(local_file, "rb") as f:
            res = requests.post(url, headers=headers, data=f)
    except Exception as e:
        logger.error(f"[UPLOAD] Exception for {user_id}: {e}")
        print(f"[UPLOAD] User {user_id}: FAILURE Exception")
        return False

    if res.ok:
        logger.info(f"[UPLOAD] User {user_id}: SUCCESS")
        print(f"[UPLOAD] User {user_id}: SUCCESS")
        return True
    else:
        logger.error(f"[UPLOAD] User {user_id}: FAILURE {res.status_code} {res.text}")
        print(f"[UPLOAD] User {user_id}: FAILURE {res.status_code} {res.text}")
        return False

def list_files(viewer_token, user_id, viewer_id):
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {viewer_token}",
        "Content-Type": "application/json"
    }
    data = {"prefix": f"{user_id}/"}
    try:
        res = requests.post(url, headers=headers, json=data)
    except Exception as e:
        logger.error(f"[LIST] Exception for viewer {viewer_id}: {e}")
        print(f"[LIST] Viewer {viewer_id} -> User {user_id}'s files: FAILURE Exception")
        return []

    if res.ok:
        files = [item["name"] for item in res.json()]
        logger.info(f"[LIST] Viewer {viewer_id} -> User {user_id}'s files: SUCCESS {files}")
        print(f"[LIST] Viewer {viewer_id} -> User {user_id}'s files: SUCCESS {files}")
        return files
    else:
        logger.error(f"[LIST] Viewer {viewer_id} -> User {user_id}'s files: FAILURE {res.status_code} {res.text}")
        print(f"[LIST] Viewer {viewer_id} -> User {user_id}'s files: FAILURE {res.status_code} {res.text}")
        return []

def get_signed_url(viewer_token, path, viewer_id):
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {viewer_token}",
        "Content-Type": "application/json"
    }
    data = {"expiresIn": 60}
    try:
        res = requests.post(url, headers=headers, json=data)
    except Exception as e:
        logger.error(f"[SIGN URL] Exception for viewer {viewer_id}: {e}")
        print(f"[SIGN URL] Viewer {viewer_id} -> {path}: FAILURE Exception")
        return False

    if res.ok:
        signed = res.json().get("signedURL", "")
        logger.info(f"[SIGN URL] Viewer {viewer_id} -> {path}: SUCCESS {signed}")
        print(f"[SIGN URL] Viewer {viewer_id} -> {path}: SUCCESS {signed}")
        return True
    else:
        logger.error(f"[SIGN URL] Viewer {viewer_id} -> {path}: FAILURE {res.status_code} {res.text}")
        print(f"[SIGN URL] Viewer {viewer_id} -> {path}: FAILURE {res.status_code} {res.text}")
        return False

def delete_file(viewer_token, path, viewer_id):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {viewer_token}"
    }
    try:
        res = requests.delete(url, headers=headers)
    except Exception as e:
        logger.error(f"[DELETE] Exception for viewer {viewer_id}: {e}")
        print(f"[DELETE] Viewer {viewer_id} -> {path}: FAILURE Exception")
        return False

    if res.ok:
        logger.info(f"[DELETE] Viewer {viewer_id} -> {path}: SUCCESS")
        print(f"[DELETE] Viewer {viewer_id} -> {path}: SUCCESS")
        return True
    else:
        logger.error(f"[DELETE] Viewer {viewer_id} -> {path}: FAILURE {res.status_code} {res.text}")
        print(f"[DELETE] Viewer {viewer_id} -> {path}: FAILURE {res.status_code} {res.text}")
        return False

def rls_test():
    try:
        u1, _ = User.objects.get_or_create(username="harshit", email="unknownhai517@gmail.com", defaults={"password": "!Password@123"})
        u2, _ = User.objects.get_or_create(username="raj", email="harshitghosh6@gmail.com", defaults={"password": "!Password@123"})
    except Exception as e:
        logger.error(f"[USER] Exception during user creation: {e}")
        return

    try:
        u1_token = get_real_jwt("unknownhai517@gmail.com", "!Password@123")
        u2_token = get_real_jwt("harshitghosh6@gmail.com", "!Password@123")
        u1_sub = get_sub_from_token(u1_token)
        u2_sub = get_sub_from_token(u2_token)
    except Exception as e:
        logger.error(f"[AUTH] Exception during token retrieval: {e}")
        return

    upload_file(u1_token, u1_sub, "/home/hghosh/Desktop/CODING/Python/self_project/Birthday/core/test_media/test1.png")
    upload_file(u2_token, u2_sub, "/home/hghosh/Desktop/CODING/Python/self_project/Birthday/core/test_media/test2.png")

    list_files(u1_token, u1_sub, viewer_id=u1_sub)
    list_files(u2_token, u2_sub, viewer_id=u2_sub)
    list_files(u2_token, u1_sub, viewer_id=u2_sub)
    list_files(u1_token, u2_sub, viewer_id=u1_sub)

    get_signed_url(u1_token, f"{u1_sub}/test1.png", viewer_id=u1_sub)
    get_signed_url(u2_token, f"{u2_sub}/test2.png", viewer_id=u2_sub)
    get_signed_url(u2_token, f"{u1_sub}/test1.png", viewer_id=u2_sub)
    get_signed_url(u1_token, f"{u2_sub}/test2.png", viewer_id=u1_sub)

    delete_file(u2_token, f"{u1_sub}/test1.png", viewer_id=u2_sub)
    delete_file(u1_token, f"{u2_sub}/test2.png", viewer_id=u1_sub)
    delete_file(u1_token, f"{u1_sub}/test1.png", viewer_id=u1_sub)
    delete_file(u2_token, f"{u2_sub}/test2.png", viewer_id=u2_sub)

    print("\n🎉 RLS Testing Complete.")

if __name__ == "__main__":
    rls_test()