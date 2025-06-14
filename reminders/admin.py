# reminders/admin.py
from django.contrib import admin
from django_q.tasks import async_task
from .models import Event, ReminderLog, EventMedia, Reflection
from django.utils.html import format_html

@admin.action(description='Send Reminder Emails Manually')
def send_reminders_now(modeladmin, request, queryset):
    async_task('reminders.tasks.send_reminder_emails')
    modeladmin.message_user(request, "Reminder emails task has been queued.")

@admin.action(description='Process Recurring Events Manually')
def check_recurring_now(modeladmin, request, queryset):
    async_task('reminders.tasks.check_recurring_events')
    modeladmin.message_user(request, "Recurring events task has been queued.")

class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_type', 'date', 'user', 'remind_days_before', 'notified', 'is_recurring', 'is_archived')
    list_filter = ('event_type', 'notified', 'is_recurring', 'is_archived', 'user')
    search_fields = ('name', 'user__username')
    actions = [send_reminders_now, check_recurring_now]

class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'colored_status', 'message', 'timestamp')
    list_filter = ('status', 'timestamp', 'user')
    search_fields = ('user__email', 'event__name')

    def colored_status(self, obj):
        color = 'green' if obj.status == 'Success' else 'red'
        return format_html('<span style="color: {};">{}</span>', color, obj.status)
    colored_status.short_description = 'Status'

class EventMediaAdmin(admin.ModelAdmin):
    list_display = ('event', 'media_type', 'media_file', 'uploaded_at')
    list_filter = ('media_type',)
    search_fields = ('event__name',)

class ReflectionAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'note_preview', 'created_at', 'updated_at')
    list_filter = ('created_at', 'user')
    search_fields = ('note', 'event__name', 'user__username')

    def note_preview(self, obj):
        return obj.note[:50] + '...' if len(obj.note) > 50 else obj.note
    note_preview.short_description = 'Note'

admin.site.register(Event, EventAdmin)
admin.site.register(ReminderLog, ReminderLogAdmin)
admin.site.register(EventMedia, EventMediaAdmin)
admin.site.register(Reflection, ReflectionAdmin)