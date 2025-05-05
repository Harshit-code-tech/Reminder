# users/backend.py

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

UserModel = get_user_model()

class EmailOrUserModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        try:
            user = UserModel.objects.get(email=username)  # Try email
        except UserModel.DoesNotExist:
            try:
                user = UserModel.objects.get(username=username)  # Try username
            except UserModel.DoesNotExist:
                return None

        if user.check_password(password):
            return user
        return None
