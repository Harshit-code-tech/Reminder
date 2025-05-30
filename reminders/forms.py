from django import forms
from .models import Event
from django.core.exceptions import ValidationError
from PIL import Image
import io
from django.core.files.uploadedfile import InMemoryUploadedFile

class EventForm(forms.ModelForm):
    media = forms.FileField(required=False, label='Media (Optional)')

    class Meta:
        model = Event
        fields = ['name', 'event_type', 'date', 'remind_days_before', 'message']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'message': forms.Textarea(attrs={'rows': 4}),
        }

    def clean_media(self):
        media = self.cleaned_data.get('media')
        if media:
            # Validate file type
            if not media.name.lower().endswith(('.jpg', '.jpeg', '.png')):
                raise ValidationError('Only .jpg and .png files are allowed.')
            # Validate file size (50MB)
            if media.size > 50 * 1024 * 1024:
                raise ValidationError('File size must be under 50MB.')
            # Compress image
            try:
                img = Image.open(media)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                output = io.BytesIO()
                img.thumbnail((1920, 1920))  # Resize to max 1920x1920
                img.save(output, format='JPEG', quality=80, optimize=True)
                output.seek(0)
                media = InMemoryUploadedFile(
                    output, 'ImageField', f"{media.name.split('.')[0]}.jpg",
                    'image/jpeg', output.getbuffer().nbytes, None
                )
            except Exception as e:
                raise ValidationError(f'Image processing failed: {str(e)}')
        return media