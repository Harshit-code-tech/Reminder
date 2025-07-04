# Generated by Django 5.2 on 2025-05-30 14:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reminders', '0004_remove_event_media_path_event_media_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='event',
            name='event_type',
            field=models.CharField(choices=[('birthday', 'Birthday'), ('anniversary', 'Anniversary'), ('other', 'Other')], max_length=50),
        ),
        migrations.AlterField(
            model_name='event',
            name='media_type',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='event',
            name='media_url',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
        migrations.AlterField(
            model_name='event',
            name='name',
            field=models.CharField(max_length=500),
        ),
    ]
