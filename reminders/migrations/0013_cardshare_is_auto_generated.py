# Generated by Django 5.2 on 2025-06-16 10:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reminders', '0012_cardshare'),
    ]

    operations = [
        migrations.AddField(
            model_name='cardshare',
            name='is_auto_generated',
            field=models.BooleanField(default=False),
        ),
    ]
