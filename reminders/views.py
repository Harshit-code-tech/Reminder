from django.shortcuts import render,redirect
from .models import Event
from .forms import EventForm
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from .email_utils import send_reminder_email
# from django.http import HttpResponse
#
#
# def home(request):
#     return HttpResponse("Welcome to the Birthday Reminder App!")

# Create your views here.
@login_required
def add_event(request):
    if request.method=='POST':
        form=EventForm(request.POST)
        if form.is_valid():
            event=form.save(commit=False)
            event.user=request.user
            event.save()
            return redirect('event_list')
    else:
        form=EventForm()
    return render(request,'reminders/event_form.html',{'form':form})

@login_required
def event_list(request):
    events=Event.objects.filter(user=request.user).order_by('date')
    return render(request,'reminders/event_list.html',{'events':events})

# temproary
# def test_email(request):
#     send_reminder_email(
#         subject="🎉 Test Email from Birthday Reminder App",
#         message="Hello! This is a test email sent via MailerSend SMTP settings.",
#         recipient_list=["unknownhai517@gmail.com"],  # Put your actual email to test
#     )
#     return HttpResponse("Test email sent! Check your inbox 📬.")