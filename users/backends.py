# users/backend.py

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

UserModel = get_user_model()

class EmailOrUserModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        try:
            user = UserModel.objects.get(Q(email__iexact=username) | Q(username__iexact=username))
            if user.check_password(password) and user.is_active:
                return user
        except UserModel.DoesNotExist:
            return None
        return None

    def user_can_authenticate(self, user):
        return user.is_active
