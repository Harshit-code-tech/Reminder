from django import forms
from .models import Event

class EventForm(forms.ModelForm):
    class Meta:
        model = Event
        fields=['name','event_type','date','remind_days_before','message']
        widgets={
            'date':forms.DateInput(attrs={'type':'date'}),
        }