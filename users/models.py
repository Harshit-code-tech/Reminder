# users/models.py
from django.db import models

# Create your models here.
import random
import string
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

User=get_user_model()

class VerificationCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def generate_code(self):
        self.code = ''.join(random.choices(string.digits, k=6))

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"VerificationCode(user={self.user.username}, code={self.code}, expires_at={self.expires_at})"

    def save(self, *args, **kwargs):
        if not self.pk:
            self.generate_code()
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
