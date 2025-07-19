from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Event

class EventForm(forms.ModelForm):
    EVENT_TYPES = [
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('raksha_bandhan', 'Raksha Bandhan'),
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
    highlights = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4}),
        required=False,
        label='Milestones (e.g., Year 1: Honeymoon)'
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
            'highlights',
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
        if is_recurring and event_type not in ['birthday', 'anniversary','raksha_bandhan']:
            raise ValidationError("Recurring events are only allowed for birthdays and anniversaries.")

        # Recipient email validation
        if recipient_email and not recipient_email.strip():
            raise ValidationError("Recipient email cannot be empty if provided.")

        return cleaned_data