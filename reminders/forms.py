# reminders/forms.py
from django import forms
from .models import Event
from django.core.exceptions import ValidationError
from django.utils import timezone

class EventForm(forms.ModelForm):
    EVENT_TYPES = [
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('other', 'Other')
    ]

    # This is NOT a model field — it's for multiple uploads in the form only
    media_files = forms.FileField(
        required=False,
        label="Upload Media Files (Max 3)"
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
            'is_recurring'
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'message': forms.Textarea(attrs={'rows': 4}),
            'highlights': forms.Textarea(attrs={'rows': 4}),
        }

    def clean_date(self):
        date = self.cleaned_data.get('date')
        if date and date < timezone.now().date():
            raise ValidationError('Event date cannot be in the past.')
        return date


    def clean(self):
        cleaned_data = super().clean()
        media_files = self.files.getlist('media_files')
        event_type = cleaned_data.get('event_type')
        is_recurring = cleaned_data.get('is_recurring')
        # Perform all validation here
        if len(media_files) > 3:
            raise ValidationError('Maximum 3 media files allowed.')

        allowed_types = ['image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav', 'audio/flac']
        max_image_size = 50 * 1024 * 1024
        max_audio_size = 10 * 1024 * 1024

        for file in media_files:
            if file.content_type not in allowed_types:
                raise ValidationError(f'Invalid file type: {file.name}')
            if file.content_type.startswith('image') and file.size > max_image_size:
                raise ValidationError(f'Image {file.name} exceeds 50MB.')
            if file.content_type.startswith('audio') and file.size > max_audio_size:
                raise ValidationError(f'Audio {file.name} exceeds 10MB.')

        # Custom label logic
        if cleaned_data.get('event_type') == 'other' and not cleaned_data.get('custom_label'):
            self.add_error('custom_label', 'Custom label is required for Other events.')


        if is_recurring and event_type not in ['birthday', 'anniversary']:
            raise forms.ValidationError("Recurring events are only allowed for birthdays and anniversaries.")

        return cleaned_data

