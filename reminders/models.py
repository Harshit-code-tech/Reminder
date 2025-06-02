# reminders/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator

User = get_user_model()

class Event(models.Model):
    EVENT_TYPES = [
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('other', 'Other')
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=500)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)  # Increased
    date = models.DateField()
    remind_days_before = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notified = models.BooleanField(default=False)
    media_url = models.URLField(max_length=1000, blank=True, null=True)  # Increased
    media_type = models.CharField(max_length=100, blank=True, null=True)  # Increased
    media_path = models.CharField(max_length=512, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['notified']),
        ]

    def is_expired(self):
        return self.date < timezone.now().date()

    def __str__(self):
        return f"{self.name}'s {self.get_event_type_display()} on {self.date}"

class ReminderLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    email_sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50)
    message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"Reminder sent to {self.user.email} for {self.event.name} at {self.email_sent_at}"