# users/models.py
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class VerificationCode(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_codes')
    code = models.CharField(max_length=6, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"VerificationCode(user={self.user.username}, code={self.code}, expires_at={self.expires_at})"


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    notification_email = models.BooleanField(default=True)
    notification_sms = models.BooleanField(default=False)

    def __str__(self):
        return f"Profile for {self.user.username}"



class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"
