from django.core.mail import send_mail

def send_reminder_email(subject, message, recipient_list):
    send_mail(
        subject=subject,
        message=message,
        from_email=None,  # Will use DEFAULT_FROM_EMAIL
        recipient_list=recipient_list,
        fail_silently=False,
    )
