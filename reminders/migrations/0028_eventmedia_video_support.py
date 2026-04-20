from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reminders', '0027_event_birthday_page1_seen_event_birthday_unwrap_step'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='eventmedia',
            name='valid_media_type',
        ),
        migrations.AlterField(
            model_name='eventmedia',
            name='media_type',
            field=models.CharField(choices=[('image', 'Image'), ('audio', 'Audio')], max_length=20),
        ),
        migrations.AddConstraint(
            model_name='eventmedia',
            constraint=models.CheckConstraint(
                condition=models.Q(('media_type__in', ['image', 'audio'])),
                name='valid_media_type',
            ),
        ),
    ]