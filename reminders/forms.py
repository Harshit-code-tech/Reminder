from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Event
import json
import re

class EventForm(forms.ModelForm):
    EVENT_TYPES = [
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('raksha_bandhan', 'Raksha Bandhan'),
        ('other', 'Other')
    ]

    RAKSHA_BANDHAN_THEMES = [
        ('traditional', 'Traditional'),
        ('modern', 'Modern'),
        ('regional', 'Regional'),
        ('custom', 'Custom'),
    ]

    image_files = forms.FileField(
        required=False,
        label="Upload Images for Slideshow (Page 3)",
        widget=forms.ClearableFileInput(attrs={
            'allow_multiple_selected': True,
            'accept': '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.svg'

        }),
    )
    audio_files = forms.FileField(
        required=False,
        label="Upload Audio for Voice Message (Page 4)",
        widget=forms.ClearableFileInput(attrs={
            'allow_multiple_selected': True,
            'accept': '.mp3,.wav,.flac,.ogg,.aac,.m4a'

        }),
    )
    custom_label = forms.CharField(
        max_length=100,
        required=False,
        label='Custom Event Label (for Other)'
    )
    cultural_theme = forms.BooleanField(
        required=False,
        label='Use Cultural Theme (e.g., diyas)'
    )
    thread_of_memories = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 4,
            'placeholder': 'Format:\n2015: First Rakhi Together\nWhen we celebrated our first Rakhi\n\n2018: Long Distance Rakhi\nSent rakhi by post, love remained the same'
        }),
        required=False,
        label='Thread of Memories'
    )

    highlights = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 4,
            'placeholder': 'Year 1: Honeymoon\nYear 5: First House\nYear 10: Anniversary Trip'
        }),
        required=False,
        label='Milestones (e.g., Year 1: Honeymoon)'
    )
    memory_display_type = forms.ChoiceField(
        choices=[('highlights', 'Highlights/Milestones'), ('thread_of_memories', 'Thread of Memories')],
        widget=forms.RadioSelect,
        required=True,
        initial='highlights',
        label='Memory Display Type'
    )

    recipient_email = forms.EmailField(
        required=False,
        label='Recipient Email',
        help_text='Email address to send the greeting card to.'
    )
    auto_share_enabled = forms.BooleanField(
        required=False,
        initial=True,
        label='Enable Auto-Sharing',
        help_text='Automatically send the greeting card to the recipient on the event date.'
    )

    # Raksha Bandhan specific fields
    raksha_bandhan_theme = forms.ChoiceField(
        choices=RAKSHA_BANDHAN_THEMES,
        required=False,
        initial='traditional',
        label='Raksha Bandhan Theme',
        help_text='Choose the visual theme for your Raksha Bandhan card'
    )

    sibling_relationship = forms.CharField(
        max_length=100,
        required=False,
        label='Sibling Relationship',
        help_text='Brother/Sister/Cousin relationship description',
        widget=forms.TextInput(attrs={
            'placeholder': 'e.g., Beloved Brother, Dear Sister, Cousin Brother'
        })
    )

    sacred_promises = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 3,
            'placeholder': 'I promise to always support you\nI promise to be there in tough times\nI promise to celebrate your successes'
        }),
        required=False,
        label='Sacred Promises & Blessings',
        help_text='Special promises and blessings for Raksha Bandhan'
    )

    rakhi_ceremony_notes = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 3,
            'placeholder': 'Special memories or notes about the rakhi ceremony...'
        }),
        required=False,
        label='Rakhi Ceremony Notes',
        help_text='Special notes about the rakhi ceremony or memories'
    )

    class Meta:
        model = Event
        fields = [
            'name',
            'event_type',
            'date',
            'remind_days_before',
            'message',
            'custom_label',
            'cultural_theme',
            'memory_display_type',
            'highlights',
            'thread_of_memories',
            'is_recurring',
            'recipient_email',
            'auto_share_enabled',
            # Raksha Bandhan fields
            'raksha_bandhan_theme',
            'sibling_relationship',
            'sacred_promises',
            'rakhi_ceremony_notes'
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'message': forms.Textarea(attrs={'rows': 4}),
            'highlights': forms.Textarea(attrs={'rows': 4}),
            'is_recurring': forms.CheckboxInput(),
            'auto_share_enabled': forms.CheckboxInput(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Get event type from various sources
        event_type = (
                self.initial.get('event_type') or
                self.data.get('event_type') or
                (self.instance.event_type if self.instance and self.instance.pk else None)
        )

        # Handle recurring logic for different event types
        if event_type == 'other':
            self.fields['is_recurring'].initial = False
            self.fields['is_recurring'].widget.attrs['disabled'] = True
            if hasattr(self.data, '_mutable'):
                self.data._mutable = True
            if self.data and 'is_recurring' in self.data:
                self.data = self.data.copy()
                self.data['is_recurring'] = False
        else:
            self.fields['is_recurring'].initial = (
                self.instance.is_recurring if self.instance and self.instance.pk else True
            )

        # Show/hide Raksha Bandhan specific fields based on event type
        if event_type != 'raksha_bandhan':
            # Hide Raksha Bandhan specific fields for other event types
            raksha_fields = ['raksha_bandhan_theme', 'sibling_relationship', 'sacred_promises', 'rakhi_ceremony_notes']
            for field_name in raksha_fields:
                self.fields[field_name].widget = forms.HiddenInput()
                self.fields[field_name].required = False

        # Adjust labels and defaults based on event type
        if event_type == 'raksha_bandhan':
            self.fields['name'].label = 'Sibling Name'
            self.fields['name'].help_text = 'Name of your brother, sister, or cousin'
            self.fields['cultural_theme'].initial = True
            self.fields['cultural_theme'].label = 'Use Traditional Raksha Bandhan Theme'
            self.fields['cultural_theme'].help_text = 'Enable traditional diyas, rangoli, and marigold decorations'

            # Set default values for Raksha Bandhan
            if not self.instance or not self.instance.pk:
                self.fields['raksha_bandhan_theme'].initial = 'traditional'

    def clean_highlights(self):
        """Normalise CRLF/CR line endings to LF so newlines render correctly on cards."""
        value = self.cleaned_data.get('highlights')
        if value:
            value = value.replace('\r\n', '\n').replace('\r', '\n')
        return value

    def clean_date(self):
        """Validate the event date is not in the past (for new events)."""
        date = self.cleaned_data.get('date')
        # Allow past dates when editing an existing event
        if self.instance and self.instance.pk:
            return date
        if date and date < timezone.now().date():
            raise ValidationError('Event date cannot be in the past.')
        return date

    def clean(self):
        cleaned_data = super().clean()
        event_type = cleaned_data.get('event_type')
        memory_display_type = cleaned_data.get('memory_display_type')

        # ------------------------------------------------------------------
        # File validations
        # ------------------------------------------------------------------
        image_files = self.files.getlist('image_files')
        audio_files = self.files.getlist('audio_files')

        max_file_size = 50 * 1024 * 1024  # 50 MB
        allowed_image_types = set(settings.ALLOWED_IMAGE_TYPES)
        allowed_audio_types = set(settings.ALLOWED_AUDIO_TYPES)

        for file in image_files:
            if file.content_type not in allowed_image_types:
                raise ValidationError(
                    f'Invalid image type: {file.name}. Allowed: JPG, PNG, GIF, WEBP, BMP, TIFF, SVG'
                )
            if file.size > max_file_size:
                raise ValidationError(f'Image {file.name} exceeds 50 MB.')

        for file in audio_files:
            if file.content_type not in allowed_audio_types:
                raise ValidationError(f'Invalid audio type: {file.name}. Allowed: MP3, WAV, FLAC, OGG, AAC, M4A')
            if file.size > max_file_size:
                raise ValidationError(f'Audio {file.name} exceeds 50 MB.')

        # ------------------------------------------------------------------
        # Event-type specific validations
        # ------------------------------------------------------------------
        if event_type == 'other':
            if not cleaned_data.get('custom_label'):
                self.add_error('custom_label', 'Custom label is required for Other events.')

        elif event_type == 'raksha_bandhan':
            cleaned_data['cultural_theme'] = True

            name = cleaned_data.get('name')
            if not name or not name.strip():
                self.add_error('name', 'Sibling name is required for Raksha Bandhan events.')

            sacred_promises = cleaned_data.get('sacred_promises')
            if sacred_promises and sacred_promises.strip():
                promises = [p.strip() for p in sacred_promises.split('\n') if p.strip()]
                if len(promises) < 1:
                    self.add_error('sacred_promises', 'At least one promise is required if providing sacred promises.')

            if not cleaned_data.get('raksha_bandhan_theme'):
                cleaned_data['raksha_bandhan_theme'] = 'traditional'

        # Recurring event constraint
        is_recurring = cleaned_data.get('is_recurring')
        if is_recurring and event_type not in ['birthday', 'anniversary', 'raksha_bandhan']:
            raise ValidationError("Recurring events are only allowed for birthdays, anniversaries, and Raksha Bandhan.")

        # Recipient email guard
        recipient_email = cleaned_data.get('recipient_email')
        if recipient_email and not recipient_email.strip():
            raise ValidationError("Recipient email cannot be empty if provided.")

        # ------------------------------------------------------------------
        # Memory display validation
        # ------------------------------------------------------------------
        if memory_display_type == 'thread_of_memories':
            thread_of_memories = cleaned_data.get('thread_of_memories')

            # Treat empty JSON arrays ("[]") the same as truly empty — the JS
            # sets this when no memories have been filled in yet.
            is_actually_empty = not thread_of_memories or not thread_of_memories.strip()
            if not is_actually_empty:
                try:
                    memories_data = json.loads(thread_of_memories)
                    if isinstance(memories_data, list) and len(memories_data) == 0:
                        is_actually_empty = True
                except (json.JSONDecodeError, ValueError):
                    pass

            if not is_actually_empty:
                try:
                    memories_data = json.loads(thread_of_memories)
                    if not isinstance(memories_data, list):
                        self.add_error('thread_of_memories', 'Invalid thread of memories format.')
                    else:
                        valid_memories = [
                            m for m in memories_data
                            if isinstance(m, dict) and (
                                m.get('title', '').strip() or m.get('description', '').strip()
                            )
                        ]
                        if len(valid_memories) < 2:
                            self.add_error(
                                'thread_of_memories',
                                f'Thread of Memories requires at least 2 memories '
                                f'(found {len(valid_memories)} valid).',
                            )
                except json.JSONDecodeError:
                    # Legacy newline-separated text format
                    lines = [l.strip() for l in thread_of_memories.strip().split('\n') if l.strip()]
                    if len(lines) < 2:
                        self.add_error(
                            'thread_of_memories',
                            'Thread of Memories requires at least 2 memory entries.',
                        )
            else:
                # Only enforce the "must have memories" rule when explicitly
                # setting thread_of_memories on a NEW event. When editing an
                # existing event the user may just be toggling is_recurring,
                # so only block if thread_of_memories is genuinely the chosen
                # display and has no data at all (new event path).
                is_new = not (self.instance and self.instance.pk)
                if is_new:
                    self.add_error('thread_of_memories', 'Please add at least 2 memories for Thread of Memories.')

        elif memory_display_type == 'highlights':
            if cleaned_data.get('highlights'):
                cleaned_data['highlights'] = cleaned_data['highlights'].replace('\r\n', '\n').replace('\r', '\n')

        return cleaned_data

    def clean_sacred_promises(self):
        """Clean and validate sacred promises field."""
        sacred_promises = self.cleaned_data.get('sacred_promises')
        event_type = self.cleaned_data.get('event_type')

        if event_type == 'raksha_bandhan' and sacred_promises:
            # Ensure each line is a proper promise
            promises = [p.strip() for p in sacred_promises.split('\n') if p.strip()]

            # Filter out very short promises (less than 10 characters)
            valid_promises = [p for p in promises if len(p) >= 10]

            if len(valid_promises) != len(promises):
                raise ValidationError("Each promise should be at least 10 characters long.")

            return '\n'.join(valid_promises)

        return sacred_promises

    def clean_thread_of_memories(self):
        """Clean and validate thread of memories, normalising to JSON."""
        thread_of_memories = self.cleaned_data.get('thread_of_memories')
        memory_display_type = self.cleaned_data.get('memory_display_type')

        if memory_display_type != 'thread_of_memories' or not thread_of_memories:
            return thread_of_memories

        # Already valid JSON — clean and return
        try:
            memories_data = json.loads(thread_of_memories)
            if isinstance(memories_data, list):
                cleaned = [
                    {
                        'year': str(m.get('year', '')).strip(),
                        'title': str(m.get('title', '')).strip(),
                        'description': str(m.get('description', '')).strip(),
                    }
                    for m in memories_data
                    if isinstance(m, dict) and (
                        str(m.get('title', '')).strip() or str(m.get('description', '')).strip()
                    )
                ]
                return json.dumps(cleaned)
        except json.JSONDecodeError:
            pass

        # Legacy plain-text format — attempt conversion to JSON
        text = thread_of_memories.strip()
        year_pattern = re.compile(r'^(\d{4})\s*[:\-]?\s*(.+)', re.MULTILINE)
        matches = year_pattern.findall(text)

        if len(matches) >= 2:
            structured = [{'year': y, 'title': t.strip(), 'description': ''} for y, t in matches]
            return json.dumps(structured)

        # Fallback: treat each non-empty line as a separate memory
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        return '\n'.join(lines)