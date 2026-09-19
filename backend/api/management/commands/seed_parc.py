"""Seed de données Parc Auto pour test."""
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from api.models import (
    Company, User, Vehicle, VehicleAssignment, VehicleDocument,
    Maintenance, MaintenanceSchedule, OdometerReading, FuelRecord,
    DriverProfile, DriverInfraction,
)


class Command(BaseCommand):
    help = 'Seed des données de démonstration Parc Auto'

    def handle(self, *args, **options):
        # Nettoyage pour rendre la commande idempotente
        DriverInfraction.objects.all().delete()
        DriverProfile.objects.all().delete()
        FuelRecord.objects.all().delete()
        OdometerReading.objects.all().delete()
        MaintenanceSchedule.objects.all().delete()
        Maintenance.objects.all().delete()
        VehicleDocument.objects.all().delete()
        VehicleAssignment.objects.all().delete()
        Vehicle.objects.all().delete()

        c = Company.objects.filter(slug='acme-corp').first()
        if not c:
            c = Company.objects.create(name='Acme Corp', slug='acme-corp')
            User.objects.create_user(username='superadmin', password='super123', role='superadmin')
            admin = User.objects.create_user(username='acme_admin', password='admin123', role='admin', company=c)
            User.objects.create_user(username='acme_user1', password='user123', role='user', company=c)
        else:
            admin = User.objects.filter(company=c, role='admin').first()

        v1 = Vehicle.objects.create(
            company=c, immatriculation='AB-123-CD', marque='Toyota', modele='Hilux',
            annee=2020, type_vehicule='pickup', type_carburant='diesel', numero_chassis='JTEBU5FJ15K123456',
            statut='en_mission', odometer_km=85000, cout_achat=28000000,
        )
        v2 = Vehicle.objects.create(
            company=c, immatriculation='EF-456-GH', marque='Renault', modele='Kangoo',
            annee=2019, type_vehicule='utilitaire', type_carburant='essence', numero_chassis='VF1FW61F123456789',
            statut='disponible', odometer_km=62000, cout_achat=12000000,
        )
        v3 = Vehicle.objects.create(
            company=c, immatriculation='IJ-789-KL', marque='Mercedes', modele='Vito',
            annee=2021, type_vehicule='utilitaire', type_carburant='diesel', numero_chassis='WDF4471031456789',
            statut='en_maintenance', odometer_km=41000, cout_achat=45000000,
        )

        if admin:
            VehicleAssignment.objects.create(vehicle=v1, user=admin, type='permanente', start_date=date.today() - timedelta(days=30))
            VehicleAssignment.objects.create(vehicle=v2, service_name='Service Logistique', type='temporaire', start_date=date.today() - timedelta(days=10))

        VehicleDocument.objects.create(
            vehicle=v1, type='assurance', title='Assurance 2026', numero='ASS-2026-01',
            date_emission=date.today() - timedelta(days=200), date_expiration=date.today() + timedelta(days=15),
        )
        VehicleDocument.objects.create(
            vehicle=v1, type='controle_technique', title='CT ' + str(date.today().year),
            date_expiration=date.today() - timedelta(days=5),
        )
        VehicleDocument.objects.create(vehicle=v2, type='carte_grise', title='Carte grise', numero='CG-456')

        Maintenance.objects.create(
            vehicle=v3, type='corrective', title='Réparation boîte de vitesses', status='en_cours',
            cout=1500000, fournisseur='Garage Central', scheduled_date=date.today(),
        )
        Maintenance.objects.create(
            vehicle=v1, type='vidange', title='Vidange 10 000 km', status='planifiee',
            scheduled_date=date.today() + timedelta(days=10), cout=45000,
        )

        MaintenanceSchedule.objects.create(
            vehicle=v1, title='Révision systématique', interval_kilometers=10000,
            last_done_km=80000, next_due_km=90000,
        )
        MaintenanceSchedule.objects.create(
            vehicle=v2, title='Vidange', interval_months=6,
            last_done_date=date.today() - timedelta(days=190), next_due_date=date.today() - timedelta(days=10),
        )

        OdometerReading.objects.create(vehicle=v1, odometer_km=85000, recorded_date=date.today())
        OdometerReading.objects.create(vehicle=v2, odometer_km=62000, recorded_date=date.today() - timedelta(days=3))

        FuelRecord.objects.create(vehicle=v1, date=date.today(), volume_liters=60, cost=75000, station='TotalEnergies', odometer_km=85000)
        FuelRecord.objects.create(vehicle=v2, date=date.today() - timedelta(days=2), volume_liters=35, cost=40000, station='Shell', odometer_km=61900)

        d1_user, _ = User.objects.get_or_create(username='jean.kouassi', defaults={'company': c})
        if d1_user.company_id != c.id:
            d1_user.role = 'user'; d1_user.company = c
        d1_user.set_password('driver123'); d1_user.first_name = 'Jean'; d1_user.last_name = 'Kouassi'
        d1_user.email = 'jean.kouassi@acme.com'; d1_user.phone = '+2250700000000'
        d1_user.save()
        d1 = DriverProfile.objects.create(
            company=c, user=d1_user, full_name='Jean Kouassi', type_permis='B, C',
            date_expiration_permis=date.today() + timedelta(days=20), numero_permis='P-001',
        )
        d2_user, _ = User.objects.get_or_create(username='fatou.diarra', defaults={'company': c})
        if d2_user.company_id != c.id:
            d2_user.role = 'user'; d2_user.company = c
        d2_user.set_password('driver123'); d2_user.first_name = 'Fatou'; d2_user.last_name = 'Diarra'
        d2_user.email = 'fatou.diarra@acme.com'; d2_user.phone = '+2250700000002'
        d2_user.save()
        DriverProfile.objects.create(
            company=c, user=d2_user, full_name='Fatou Diarra', type_permis='B',
            date_expiration_permis=date.today() - timedelta(days=40), numero_permis='P-002',
        )

        DriverInfraction.objects.create(
            driver=d1, type='excès_vitesse', montant=30000, date=date.today() - timedelta(days=5),
            status='en_attente', lieu='Boulevard du Sud',
        )

        self.stdout.write(self.style.SUCCESS('Seed Parc Auto OK'))