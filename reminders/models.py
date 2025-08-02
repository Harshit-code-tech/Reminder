import secrets
import uuid
from datetime import datetime

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class Event(models.Model):
    EVENT_TYPES = [
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('raksha_bandhan', 'Raksha Bandhan'),
        ('other', 'Other'),
    ]

    # Theme choices for Raksha Bandhan
    RAKSHA_BANDHAN_THEMES = [
        ('traditional', 'Traditional'),
        ('modern', 'Modern'),
        ('regional', 'Regional'),
        ('custom', 'Custom'),
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
    deletion_notified = models.BooleanField(default=False)
    deletion_scheduled = models.DateTimeField(null=True, blank=True)
    media_url = models.URLField(max_length=1000, blank=True, null=True)
    media_type = models.CharField(max_length=100, blank=True, null=True)
    media_path = models.CharField(max_length=512, null=True, blank=True)
    custom_label = models.CharField(max_length=100, blank=True, null=True)
    cultural_theme = models.BooleanField(default=False)
    thread_of_memories = models.TextField(blank=True, null=True)
    highlights = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=True, help_text="Automatically create event for next year.")
    is_archived = models.BooleanField(default=False, help_text="Mark event as archived.")
    card_password = models.CharField(max_length=128, blank=True, null=True,
                                     help_text="Hashed password for card access.")
    recipient_email = models.EmailField(blank=True, null=True, help_text="Email address of the card recipient.")
    auto_share_enabled = models.BooleanField(default=True,
                                             help_text="Automatically share card with recipient on event date.")

    # Raksha Bandhan specific fields
    raksha_bandhan_theme = models.CharField(
        max_length=50,
        choices=RAKSHA_BANDHAN_THEMES,
        blank=True,
        null=True,
        help_text="Theme for Raksha Bandhan cards"
    )
    sibling_relationship = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Brother/Sister/Cousin relationship description"
    )
    sacred_promises = models.TextField(
        blank=True,
        null=True,
        help_text="Sacred promises and blessings for Raksha Bandhan"
    )
    rakhi_ceremony_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Special notes about the rakhi ceremony"
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['notified']),
            models.Index(fields=['deletion_notified']),
            models.Index(fields=['is_archived']),
            models.Index(fields=['event_type']),
        ]

    def set_card_password(self, raw_password):
        """Set the hashed card password."""
        if raw_password and raw_password.strip():
            self.card_password = make_password(raw_password.strip())
            logger.debug(f"[Event: {self.event_type} ID: {self.id}] Card password set successfully.")
        else:
            self.card_password = None
            logger.debug(f"[Event: {self.event_type} ID: {self.id}] No card password set (empty or invalid input).")

    def check_card_password(self, raw_password):
        """Check if the provided password matches the hashed card password."""
        if not self.card_password or not raw_password or not raw_password.strip():
            logger.debug(
                f"[Event: {self.event_type} ID: {self.id}] Card password check failed: Missing password or input.")
            return False
        return check_password(raw_password.strip(), self.card_password)

    def get_raw_card_password(self):
        """Compute the raw (unhashed) password for the event based on its type."""
        if self.event_type == 'birthday':
            return self.name.strip().lower() if self.name else ''
        elif self.event_type == 'anniversary':
            return self.date.strftime('%Y-%m-%d') if self.date else ''
        elif self.event_type == 'raksha_bandhan':
            return 'rakhi'
        elif self.event_type == 'other':
            return self.custom_label.strip().lower() if self.custom_label else ''
        return ''

    def clean(self):
        """Enhanced validation with better error messages."""
        super().clean()

        # Event type specific validations
        if self.event_type == 'birthday':
            if not self.name or not self.name.strip():
                raise ValidationError({'name': "Name is required and cannot be empty for Birthday events."})

        elif self.event_type == 'anniversary':
            if not self.date:
                raise ValidationError({'date': "Date is required for Anniversary events."})

        elif self.event_type == 'raksha_bandhan':
            if not self.name or not self.name.strip():
                raise ValidationError({'name': "Sibling name is required for Raksha Bandhan events."})

            # Validate Raksha Bandhan specific fields
            if self.sibling_relationship and len(self.sibling_relationship.strip()) == 0:
                raise ValidationError({'sibling_relationship': "Sibling relationship cannot be empty if provided."})

        elif self.event_type == 'other':
            if not self.custom_label or not self.custom_label.strip():
                raise ValidationError(
                    {'custom_label': "Custom label is required and cannot be empty for 'Other' events."})

        # Email validation
        if self.recipient_email and not self.recipient_email.strip():
            raise ValidationError({'recipient_email': "Recipient email cannot be empty if provided."})

        # Thread of memories validation
        if self.thread_of_memories:
            memories = [m.strip() for m in self.thread_of_memories.split('\n') if m.strip()]
            if len(memories) < 2:
                raise ValidationError({'thread_of_memories': "Thread of Memories requires at least 2 memories."})

            # For structured memories, ensure even number (pairs)
            if self.event_type == 'raksha_bandhan' and len(memories) % 2 != 0:
                raise ValidationError(
                    {'thread_of_memories': "Thread of Memories should have pairs of headers and descriptions."})

    def get_memory_data(self):
        """Parse thread_of_memories into structured data."""
        if not self.thread_of_memories:
            return []

        memories = [m.strip() for m in self.thread_of_memories.split('\n') if m.strip()]
        structured_memories = []

        for i in range(0, len(memories), 2):
            if i + 1 < len(memories):
                header = memories[i]
                description = memories[i + 1]

                # Extract year if present
                year = ""
                title = header
                if ":" in header:
                    year_part, title_part = header.split(":", 1)
                    if year_part.strip().isdigit():
                        year = year_part.strip()
                        title = title_part.strip()

                structured_memories.append({
                    "year": year,
                    "title": title,
                    "description": description
                })

        return structured_memories

    def get_promises_list(self):
        """Parse sacred_promises into a list."""
        if not self.sacred_promises:
            return []
        return [p.strip() for p in self.sacred_promises.split('\n') if p.strip()]

    def save(self, *args, **kwargs):
        """Override save to auto-set card_password and recurring flag."""
        # Set recurring flag based on event type
        if self.event_type not in ['birthday', 'anniversary', 'raksha_bandhan']:
            self.is_recurring = False

        # Auto-set card password if not already set
        if not self.card_password:
            password_handlers = {
                'birthday': lambda: self._set_birthday_password(),
                'anniversary': lambda: self._set_anniversary_password(),
                'raksha_bandhan': lambda: self._set_raksha_bandhan_password(),
                'other': lambda: self._set_other_password()
            }

            handler = password_handlers.get(self.event_type)
            if handler:
                try:
                    handler()
                    logger.debug(f"[Event: {self.event_type} ID: {self.id}] Auto-set card password during save.")
                except ValidationError as e:
                    logger.error(f"[Event: {self.event_type} ID: {self.id}] Failed to set card password: {str(e)}")
                    raise

        super().save(*args, **kwargs)

    def _set_birthday_password(self):
        """Set password for birthday events."""
        if not self.name or not self.name.strip():
            raise ValidationError("Name is required and cannot be empty for Birthday events.")
        self.set_card_password(self.name)

    def _set_anniversary_password(self):
        """Set password for anniversary events."""
        if not self.date:
            raise ValidationError("Date is required for Anniversary events.")
        self.set_card_password(self.date.strftime('%Y-%m-%d'))

    def _set_raksha_bandhan_password(self):
        """Set password for Raksha Bandhan events."""
        # Use a generic password for Raksha Bandhan that fits the cultural context
        self.set_card_password('rakhi')

    def _set_other_password(self):
        """Set password for other events."""
        if not self.custom_label or not self.custom_label.strip():
            raise ValidationError("Custom label is required and cannot be empty for 'Other' events.")
        self.set_card_password(self.custom_label)

    def is_expired(self):
        """Check if the event date has passed."""
        return self.date < timezone.now().date()

    @property
    def is_active(self):
        """Check if the event is upcoming and not archived."""
        return not self.is_expired() and not self.is_archived

    def __str__(self):
        return f"{self.name}'s {self.get_event_type_display()} on {self.date}"


class EventMedia(models.Model):
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('audio', 'Audio'),
    ]
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='media')
    media_file = models.URLField(max_length=1000)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    mime_type = models.CharField(max_length=50, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(media_type__in=['image', 'audio']), name='valid_media_type')
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


class CardShare(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='shares')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    password = models.CharField(max_length=128, blank=True, null=True)  # Hashed
    view_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_auto_generated = models.BooleanField(default=False)

    def set_password(self, raw_password):
        if raw_password:
            self.password = make_password(raw_password.strip())
        else:
            self.password = None

    def check_password(self, raw_password):
        if not self.password or not raw_password:
            return False
        return check_password(raw_password.strip(), self.password)

    def __str__(self):
        return f"Share for {self.event} with token {self.token}"

    class Meta:
        indexes = [models.Index(fields=['token'])]

    @staticmethod
    def generate_random_password():
        return secrets.token_urlsafe(8)