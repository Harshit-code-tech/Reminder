from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model
from captcha.fields import CaptchaField

User = get_user_model()

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True, help_text="Enter a valid email address.")

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')
        widgets = {
            'username': forms.TextInput(attrs={'autocomplete': 'username'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].widget.attrs['autocomplete'] = 'email'
        self.fields['password1'].widget.attrs['autocomplete'] = 'new-password'
        self.fields['password2'].widget.attrs['autocomplete'] = 'new-password'

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("This email is already in use.")
        return email


class LoginForm(forms.Form):
    username_or_email = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={'autocomplete': 'username'}),
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'autocomplete': 'current-password'}),
    )

    def __init__(self, *args, show_captcha=False, **kwargs):
        super().__init__(*args, **kwargs)
        if show_captcha:
            self.fields['captcha'] = CaptchaField()



class VerificationCodeForm(forms.Form):
    code = forms.CharField(max_length=6)
    captcha = CaptchaField()


class UserSettingsForm(forms.Form):
    """Form for updating user account and profile settings."""
    username = forms.CharField(
        max_length=150,
        help_text="Letters, digits and @/./+/-/_ only.",
        widget=forms.TextInput(attrs={'class': 'settings-input', 'autocomplete': 'username'}),
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'settings-input', 'autocomplete': 'email'}),
    )
    notification_email = forms.EmailField(
        required=False,
        help_text="Optional. Reminder emails will be sent here instead of your main email.",
        widget=forms.EmailInput(attrs={'class': 'settings-input', 'autocomplete': 'email', 'placeholder': 'Leave blank to use main email'}),
    )
    timezone = forms.ChoiceField(
        choices=[
            ('Asia/Kolkata', 'Asia/Kolkata (IST)'),
            ('US/Eastern', 'US/Eastern (EST)'),
            ('US/Central', 'US/Central (CST)'),
            ('US/Pacific', 'US/Pacific (PST)'),
            ('Europe/London', 'Europe/London (GMT)'),
            ('Europe/Berlin', 'Europe/Berlin (CET)'),
            ('Asia/Tokyo', 'Asia/Tokyo (JST)'),
            ('Australia/Sydney', 'Australia/Sydney (AEST)'),
            ('UTC', 'UTC'),
        ],
        widget=forms.Select(attrs={'class': 'settings-input'}),
    )

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user
        if user:
            self.fields['username'].initial = user.username
            self.fields['email'].initial = user.email
            profile = getattr(user, 'profile', None)
            if profile:
                self.fields['notification_email'].initial = profile.notification_email or ''
                self.fields['timezone'].initial = profile.timezone or 'Asia/Kolkata'

    def clean_username(self):
        username = self.cleaned_data['username']
        if User.objects.filter(username__iexact=username).exclude(pk=self.user.pk).exists():
            raise forms.ValidationError("This username is already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data['email']
        if User.objects.filter(email__iexact=email).exclude(pk=self.user.pk).exists():
            raise forms.ValidationError("This email is already in use.")
        return email
