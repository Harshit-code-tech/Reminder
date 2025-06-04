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
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    date = models.DateField()
    remind_days_before = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notified = models.BooleanField(default=False)
    media_url = models.URLField(max_length=1000, blank=True, null=True)
    media_type = models.CharField(max_length=100, blank=True, null=True)
    media_path = models.CharField(max_length=512, null=True, blank=True)
    custom_label = models.CharField(max_length=100, blank=True, null=True)  # For Other category
    cultural_theme = models.BooleanField(default=False)  # For diyas in Other
    highlights = models.TextField(blank=True, null=True)  # For Anniversary milestones


    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['notified']),
        ]

    def is_expired(self):
        return self.date < timezone.now().date()

    def __str__(self):
        return f"{self.name}'s {self.get_event_type_display()} on {self.date}"

class EventMedia(models.Model):
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('audio', 'Audio'),
        ('gif', 'GIF'),
    ]
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='media')
    media_file = models.URLField(max_length=1000)  # Supabase public URL
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(media_type__in=['image', 'audio', 'gif']),
                name='valid_media_type'
            ),
        ]

    def __str__(self):
        return f"{self.media_type} for {self.event}"

class CelebrationCardPage(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='card_pages')
    page_number = models.IntegerField(validators=[MinValueValidator(1)])
    image = models.ForeignKey(EventMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name='image_pages')
    audio = models.ForeignKey(EventMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name='audio_pages')
    caption = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['page_number']
        constraints = [
            models.UniqueConstraint(fields=['event', 'page_number'], name='unique_page_per_event')
        ]

    def __str__(self):
        return f"Page {self.page_number} for {self.event}"

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