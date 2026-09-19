from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_driver_user_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='driverprofile',
            name='user',
            field=models.OneToOneField(
                on_delete=models.CASCADE,
                related_name='driver_profile',
                to='api.user',
            ),
        ),
    ]