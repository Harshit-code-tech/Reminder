from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Event(models.Model):
    EVENT_TYPES=[
        ('birthday', 'Birthday'),
        ('anniversary', 'Anniversary'),
        ('other', 'Other')
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE,related_name='events')
    name=models.CharField(max_length=100)
    event_type=models.CharField(max_length=20, choices=EVENT_TYPES)
    date=models.DateField()
    remind_days_before=models.IntegerField(default=1)
    message=models.TextField(blank=True,null=True)
    created_at=models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.name}'s{self.get_event_type_display()}on {self.date}"

class ReminderLog(models.Model):
    user=models.ForeignKey(User,on_delete=models.CASCADE)
    event=models.ForeignKey('Event',on_delete=models.CASCADE)
    email_sent_at=models.DateTimeField(auto_now_add=True)
    status=models.CharField(max_length=50)
    message=models.TextField(blank=True,null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reminder sent to {self.user.email} for {self.event.name} at {self.email_sent_at}"