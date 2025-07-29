from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Event

class EventForm(forms.ModelForm):
    EVENT_TYPES = [
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('other', 'Other')
    ]

    image_files = forms.FileField(
        required=False,
        label="Upload Images for Slideshow (Page 3)",
        widget=forms.ClearableFileInput(attrs={'allow_multiple_selected': True, 'accept': '.jpg,.jpeg,.png'}),
    )
    audio_files = forms.FileField(
        required=False,
        label="Upload Audio for Voice Message (Page 4)",
        widget=forms.ClearableFileInput(attrs={'allow_multiple_selected': True, 'accept': '.mp3,.wav,.flac,.ogg,.aac'}),
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
        widget=forms.Textarea(attrs={'rows': 4}),
        required=False,
        label='Thread of Memories'
    )

    highlights = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4}),
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
            'auto_share_enabled'
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
        event_type = self.initial.get('event_type') or self.data.get('event_type')

        if event_type == 'other':
            self.fields['is_recurring'].initial = False
            self.fields['is_recurring'].widget.attrs['disabled'] = True
            if self.data:
                mutable_data = self.data.copy()
                mutable_data['is_recurring'] = False
                self.data = mutable_data
        else:
            self.fields['is_recurring'].initial = self.instance.is_recurring if self.instance else True

    def clean_date(self):
        date = self.cleaned_data.get('date')
        if date and date < timezone.now().date():
            raise ValidationError('Event date cannot be in the past.')
        return date

    def clean(self):
        cleaned_data = super().clean()
        image_files = self.files.getlist('image_files')
        audio_files = self.files.getlist('audio_files')
        event_type = cleaned_data.get('event_type')
        is_recurring = cleaned_data.get('is_recurring')
        recipient_email = cleaned_data.get('recipient_email')
        memory_display_type = cleaned_data.get('memory_display_type')
        thread_of_memories = cleaned_data.get('thread_of_memories')
        highlights = cleaned_data.get('highlights')


        # Validate images
        allowed_image_types = ['image/jpeg', 'image/png']
        max_image_size = 50 * 1024 * 1024  # 50MB
        for file in image_files:
            if file.content_type not in allowed_image_types:
                raise ValidationError(f'Invalid image type: {file.name}. Allowed: JPG, PNG')
            if file.size > max_image_size:
                raise ValidationError(f'Image {file.name} exceeds 50MB.')

        # Validate audio
        allowed_audio_types = ['audio/mpeg', 'audio/wav', 'audio/flac','audio/ogg','audio/aac']
        max_audio_size = 50 * 1024 * 1024  # 50MB
        for file in audio_files:
            if file.content_type not in allowed_audio_types:
                raise ValidationError(f'Invalid audio type: {file.name}. Allowed: MP3, WAV, FLAC, OGG, AAC')
            if file.size > max_audio_size:
                raise ValidationError(f'Audio {file.name} exceeds 50MB.')

        # Custom label logic
        if event_type == 'other' and not cleaned_data.get('custom_label'):
            self.add_error('custom_label', 'Custom label is required for Other events.')

        # Recurring event logic
        if is_recurring and event_type not in ['birthday', 'anniversary']:
            raise ValidationError("Recurring events are only allowed for birthdays and anniversaries.")

        # Recipient email validation
        if recipient_email and not recipient_email.strip():
            raise ValidationError("Recipient email cannot be empty if provided.")

        # Thread of memory or Highlights
        if memory_display_type == 'thread_of_memories':
            # Parse thread_of_memories to ensure there are at least 2 memories
            if thread_of_memories:
                # Split by lines and filter empty ones
                memories = [m.strip() for m in thread_of_memories.split('\n') if m.strip()]
                if len(memories) < 2:
                    self.add_error('thread_of_memories', 'Thread of Memories requires at least 2 memories.')
            else:
                # Empty thread_of_memories when that option is selected
                self.add_error('thread_of_memories', 'Please add at least 2 memories for Thread of Memories.')

            # Clear highlights if thread_of_memories is active
            cleaned_data['highlights'] = ''
        elif memory_display_type == 'highlights':
            # Clear thread_of_memories if highlights is active
            cleaned_data['thread_of_memories'] = ''


        return cleaned_data