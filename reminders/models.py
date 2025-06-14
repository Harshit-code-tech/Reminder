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
    deletion_notified = models.BooleanField(default=False)  # Tracks deletion
    deletion_scheduled = models.DateTimeField(null=True, blank=True)  # Deletion date
    media_url = models.URLField(max_length=1000, blank=True, null=True)
    media_type = models.CharField(max_length=100, blank=True, null=True)
    media_path = models.CharField(max_length=512, null=True, blank=True)
    custom_label = models.CharField(max_length=100, blank=True, null=True)  # For Other category
    cultural_theme = models.BooleanField(default=False)  # For diyas in Other
    highlights = models.TextField(blank=True, null=True)  # For Anniversary milestones
    is_recurring = models.BooleanField(
        default=True,
        help_text="Automatically create event for next year (birthdays/anniversaries only)."
    )
    is_archived = models.BooleanField(
        default=False,
        help_text="Mark event as archived (soft delete)."
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['notified']),
            models.Index(fields=['deletion_notified']),
            models.Index(fields=['is_archived']),
        ]

    def is_expired(self):
        return self.date < timezone.now().date()

    def save(self, *args, **kwargs):
        # Set is_recurring default based on event_type
        if self.event_type not in ['birthday', 'anniversary']:
            self.is_recurring = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}'s {self.get_event_type_display()} on {self.date}"

class EventMedia(models.Model):
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('audio', 'Audio'),
    ]
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='media')
    media_file = models.URLField(max_length=1000)  # Supabase public URL
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(media_type__in=['image', 'audio']),
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


class ImportLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    imported_at = models.DateTimeField(auto_now_add=True)
    success_count = models.IntegerField(default=0)
    failure_count = models.IntegerField(default=0)
    errors = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Import by {self.user.username} at {self.imported_at}"

class Reflection(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reflections')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reflections')
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'event'], name='unique_reflection_per_event')
        ]

    def __str__(self):
        return f"Reflection for {self.event} by {self.user.username}"