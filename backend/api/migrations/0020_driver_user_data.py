import re

from django.db import migrations


def create_driver_users(apps, schema_editor):
    """Chaque conducteur existant sans utilisateur se voit attribuer un compte User."""
    User = apps.get_model('api', 'User')
    DriverProfile = apps.get_model('api', 'DriverProfile')
    for driver in DriverProfile.objects.filter(user__isnull=True):
        base = re.sub(r'[^a-z0-9]+', '', (driver.full_name or 'conducteur').lower())[:20] or 'conducteur'
        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            counter += 1
            username = f'{base}{counter}'
        parts = (driver.full_name or '').split()
        user = User.objects.create_user(
            username=username,
            password=None,
            role='user',
            company=driver.company,
            first_name=parts[0] if parts else '',
            last_name=' '.join(parts[1:]) if len(parts) > 1 else '',
            email=driver.email or '',
        )
        driver.user = user
        driver.save(update_fields=['user'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_vehicle_type_and_photos'),
    ]

    operations = [
        migrations.RunPython(create_driver_users, reverse_code=migrations.RunPython.noop),
    ]