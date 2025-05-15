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

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("This email is already in use.")
        return email


class LoginForm(forms.Form):
    username_or_email = forms.CharField(max_length=100)
    password = forms.CharField(widget=forms.PasswordInput)
    captcha = CaptchaField(required=False)  # Include conditionally

    def __init__(self, *args, show_captcha=False, **kwargs):
        super().__init__(*args, **kwargs)
        if not show_captcha:
            self.fields.pop('captcha')


class VerificationCodeForm(forms.Form):
    code = forms.CharField(max_length=6)
    captcha = CaptchaField()
