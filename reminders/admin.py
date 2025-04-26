from django.contrib import admin
from .models import Event, ReminderLog
from django_q.tasks import async_task
from .tasks import send_reminder_emails

@admin.action(description='Send Reminder Emails Manually')
def send_reminders_now(modeladmin, request, queryset):
    async_task('reminders.tasks.send_reminder_emails')
    send_reminders_now.short_description = "Send Reminder Emails (Are you sure?)"
    send_reminders_now.confirmation = True


class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_type', 'date', 'user', 'remind_days_before', 'notified')
    actions = [send_reminders_now]

from django.utils.html import format_html

class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'colored_status', 'message', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('user__email', 'event__name')

    def colored_status(self, obj):
        color = 'green' if obj.status == 'Success' else 'red'
        return format_html('<span style="color: {};">{}</span>', color, obj.status)
    colored_status.short_description = 'Status'


admin.site.register(Event, EventAdmin)
admin.site.register(ReminderLog, ReminderLogAdmin)
