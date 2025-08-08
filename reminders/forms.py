from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Event
import json

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
            'accept': '.jpg,.jpeg,.png'

        }),
    )
    audio_files = forms.FileField(
        required=False,
        label="Upload Audio for Voice Message (Page 4)",
        widget=forms.ClearableFileInput(attrs={
            'allow_multiple_selected': True,
            'accept': '.mp3,.wav,.flac,.ogg,.aac'

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
            # Force recurring to False for 'other' events
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

    def clean_date(self):
        date = self.cleaned_data.get('date')
        if date and date < timezone.now().date():
            raise ValidationError('Event date cannot be in the past.')
        return date

    def clean(self):
        cleaned_data = super().clean()
        event_type = cleaned_data.get('event_type')
        memory_display_type = cleaned_data.get('memory_display_type')

        # File validations
        image_files = self.files.getlist('image_files')
        audio_files = self.files.getlist('audio_files')

        # Validate images
        allowed_image_types = ['image/jpeg', 'image/png', 'image/jpg']
        max_file_size = 50 * 1024 * 1024  # 50MB

        for file in image_files:
            if file.content_type not in allowed_image_types:
                raise ValidationError(f'Invalid image type: {file.name}. Allowed: JPG, PNG')
            if file.size > max_file_size:
                raise ValidationError(f'Image {file.name} exceeds 50MB.')

        # Validate audio
        allowed_audio_types = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/mp3']
        for file in audio_files:
            if file.content_type not in allowed_audio_types:
                raise ValidationError(f'Invalid audio type: {file.name}. Allowed: MP3, WAV, FLAC, OGG, AAC')
            if file.size > max_file_size:
                raise ValidationError(f'Audio {file.name} exceeds 50MB.')

        # Event-specific validations
        if event_type == 'other':
            if not cleaned_data.get('custom_label'):
                self.add_error('custom_label', 'Custom label is required for Other events.')

        elif event_type == 'raksha_bandhan':
            # Force cultural theme for Raksha Bandhan
            cleaned_data['cultural_theme'] = True

            # Validate sibling name
            name = cleaned_data.get('name')
            if not name or not name.strip():
                self.add_error('name', 'Sibling name is required for Raksha Bandhan events.')

            # Validate sacred promises format if provided
            sacred_promises = cleaned_data.get('sacred_promises')
            if sacred_promises and sacred_promises.strip():
                promises = [p.strip() for p in sacred_promises.split('\n') if p.strip()]
                if len(promises) < 1:
                    self.add_error('sacred_promises', 'At least one promise is required if providing sacred promises.')

            # Set default theme if not provided
            if not cleaned_data.get('raksha_bandhan_theme'):
                cleaned_data['raksha_bandhan_theme'] = 'traditional'

        # Recurring event logic
        is_recurring = cleaned_data.get('is_recurring')
        if is_recurring and event_type not in ['birthday', 'anniversary']:
            raise ValidationError("Recurring events are only allowed for birthdays, anniversaries, and Raksha Bandhan.")

        # Recipient email validation
        recipient_email = cleaned_data.get('recipient_email')
        if recipient_email and not recipient_email.strip():
            raise ValidationError("Recipient email cannot be empty if provided.")

        # Memory display validation
        if memory_display_type == 'thread_of_memories':
            thread_of_memories = cleaned_data.get('thread_of_memories')
            print(f"DEBUG: memory_display_type={memory_display_type}, thread_of_memories='{thread_of_memories}'")
            
            if thread_of_memories and thread_of_memories.strip():
                try:
                    memories_data = json.loads(thread_of_memories)
                    print(f"DEBUG: Successfully parsed JSON with {len(memories_data)} entries: {memories_data}")
                    
                    # Validate JSON structure
                    if not isinstance(memories_data, list):
                        self.add_error('thread_of_memories', 'Invalid thread of memories format.')
                    else:
                        # Filter out empty memories and count valid ones
                        valid_memories = [
                            m for m in memories_data 
                            if isinstance(m, dict) and (
                                (m.get('title', '').strip()) or 
                                (m.get('description', '').strip())
                            )
                        ]
                        
                        print(f"DEBUG: Found {len(valid_memories)} valid memories out of {len(memories_data)} total")
                        for i, mem in enumerate(valid_memories):
                            print(f"DEBUG: Memory {i+1}: title='{mem.get('title', '')}', desc='{mem.get('description', '')}', year='{mem.get('year', '')}'")
                        
                        if len(valid_memories) < 2:
                            self.add_error('thread_of_memories', f'Thread of Memories requires at least 2 memories. Currently have {len(valid_memories)} valid memories out of {len(memories_data)} total entries.')
                            
                except json.JSONDecodeError as e:
                    print(f"DEBUG: JSON decode error: {e}, trying text parsing")
                    # Fallback to legacy text format validation - more flexible
                    text_content = thread_of_memories.strip()
                    
                    # Look for year patterns (4 digits at start or anywhere in line)
                    import re
                    
                    # More flexible year pattern - matches year followed by content
                    year_pattern = r'\d{4}\s+[^\n]+'
                    memory_entries = re.findall(year_pattern, text_content, re.MULTILINE)
                    
                    if len(memory_entries) >= 2:
                        # Found sufficient year-based entries
                        print(f"DEBUG: Found {len(memory_entries)} year-based entries")
                        pass
                    else:
                        # Try alternative pattern - lines that start with year
                        alt_year_pattern = r'^\s*\d{4}\s*.+'
                        alt_memory_entries = re.findall(alt_year_pattern, text_content, re.MULTILINE)
                        
                        if len(alt_memory_entries) >= 2:
                            print(f"DEBUG: Found {len(alt_memory_entries)} alternative year-based entries")
                            pass
                        else:
                            # Most lenient check - just count lines that have substantial content
                            lines = [line.strip() for line in text_content.split('\n') if line.strip() and len(line.strip()) > 10]
                            print(f"DEBUG: Found {len(lines)} substantial lines")
                            if len(lines) < 2:  # At least 2 substantial lines
                                self.add_error('thread_of_memories', f'Thread of Memories requires at least 2 memories. Found {len(lines)} substantial lines of content.')
            else:
                print(f"DEBUG: thread_of_memories is empty or None")
                # Empty thread_of_memories when that option is selected
                self.add_error('thread_of_memories', 'Please add at least 2 memories for Thread of Memories.')

            # Clear highlights if thread_of_memories is active
            cleaned_data['highlights'] = ''

        elif memory_display_type == 'highlights':
            # Clear thread_of_memories if highlights is active
            cleaned_data['thread_of_memories'] = ''

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
        """Clean and validate thread of memories field."""
        thread_of_memories = self.cleaned_data.get('thread_of_memories')
        memory_display_type = self.cleaned_data.get('memory_display_type')
        
        print(f"DEBUG clean_thread_of_memories: memory_display_type={memory_display_type}, thread_of_memories length={len(thread_of_memories) if thread_of_memories else 0}")

        if memory_display_type == 'thread_of_memories' and thread_of_memories:
            try:
                memories_data = json.loads(thread_of_memories)
                print(f"DEBUG clean_thread_of_memories: Parsed {len(memories_data)} memories")
                
                # Validate and clean the JSON data
                if isinstance(memories_data, list):
                    # Clean each memory entry
                    cleaned_memories = []
                    for memory in memories_data:
                        if isinstance(memory, dict):
                            cleaned_memory = {
                                'year': str(memory.get('year', '')).strip(),
                                'title': str(memory.get('title', '')).strip(),
                                'description': str(memory.get('description', '')).strip()
                            }
                            # Only include memories that have at least a title or description
                            if cleaned_memory['title'] or cleaned_memory['description']:
                                cleaned_memories.append(cleaned_memory)
                    
                    print(f"DEBUG clean_thread_of_memories: Returning {len(cleaned_memories)} cleaned memories")
                    return json.dumps(cleaned_memories)
                    
            except json.JSONDecodeError:
                # Try to parse legacy text format like:
                # "2022 Title Here Description here..."
                text_content = thread_of_memories.strip()
                import re
                
                # Pattern to match: Year + Title/Description on same line
                pattern = r'(\d{4})\s+([^.!?]*[.!?]?[^0-9]*?)(?=\d{4}|$)'
                matches = re.findall(pattern, text_content, re.DOTALL)
                
                if len(matches) >= 2:
                    # Convert to structured format
                    structured_memories = []
                    for year, content in matches:
                        content = content.strip()
                        # Try to split into title and description
                        sentences = content.split('.')
                        if len(sentences) >= 2:
                            title = sentences[0].strip()
                            description = '.'.join(sentences[1:]).strip()
                        else:
                            # Use first part as title, rest as description
                            words = content.split()
                            if len(words) > 6:
                                title = ' '.join(words[:6])
                                description = ' '.join(words[6:])
                            else:
                                title = content[:50] + '...' if len(content) > 50 else content
                                description = content
                        
                        structured_memories.append({
                            'year': year,
                            'title': title[:100],  # Limit title length
                            'description': description
                        })
                    
                    return json.dumps(structured_memories)
                
                # Fallback to simple line parsing
                memories = [m.strip() for m in thread_of_memories.split('\n') if m.strip()]
                return '\n'.join(memories)

        return thread_of_memories