from django.contrib import admin
from django_q.tasks import async_task
from .models import Event, ReminderLog
from django.utils.html import format_html

@admin.action(description='Send Reminder Emails Manually')
def send_reminders_now(modeladmin, request, queryset):
    async_task('reminders.tasks.send_reminder_emails')
    modeladmin.message_user(request, "Reminder emails task has been queued.")

class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_type', 'date', 'user', 'remind_days_before', 'notified')
    list_filter = ('event_type', 'notified', 'user')
    search_fields = ('name', 'user__username')
    actions = [send_reminders_now]

class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'colored_status', 'message', 'timestamp')
    list_filter = ('status', 'timestamp', 'user')
    search_fields = ('user__email', 'event__name')

    def colored_status(self, obj):
        color = 'green' if obj.status == 'Success' else 'red'
        return format_html('<span style="color: {};">{}</span>', color, obj.status)
    colored_status.short_description = 'Status'

admin.site.register(Event, EventAdmin)
admin.site.register(ReminderLog, ReminderLogAdmin)