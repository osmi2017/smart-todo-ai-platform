from datetime import timedelta

from django.db.models import Sum, Avg, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import (
    Vehicle, VehiclePhoto, VehicleAssignment, VehicleDocument, Maintenance,
    MaintenanceSchedule, OdometerReading, FuelRecord, DriverProfile,
    DriverInfraction,
)
from .serializers_parc import (
    VehicleSerializer, VehicleDetailSerializer, VehicleSummarySerializer,
    VehiclePhotoSerializer,
    VehicleAssignmentSerializer, VehicleDocumentSerializer,
    MaintenanceSerializer, MaintenanceScheduleSerializer,
    OdometerReadingSerializer, FuelRecordSerializer,
    DriverProfileSerializer, DriverProfileDetailSerializer,
    DriverInfractionSerializer,
)


def _company_queryset(model, user):
    """Filtre multi-tenant basé sur le rôle de l'utilisateur."""
    if user.role == 'superadmin':
        return model.objects.all()
    if user.role == 'admin' and user.company:
        return model.objects.filter(company=user.company)
    if user.company:
        return model.objects.filter(company=user.company)
    return model.objects.none()


def _company_filter(self, model):
    return _company_queryset(model, self.request.user)


class MulitTenantMixin:
    """Mixin pour les ViewSets dependant d'un champ 'company'."""

    def get_queryset(self):
        return _company_queryset(self.model, self.request.user)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class VehicleViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = Vehicle
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return VehicleDetailSerializer
        return VehicleSerializer

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        statut = request.query_params.get('statut')
        search = request.query_params.get('search')
        if statut:
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(
                Q(immatriculation__icontains=search)
                | Q(marque__icontains=search)
                | Q(modele__icontains=search)
            )
        qs = qs.order_by('immatriculation')
        page = self.paginate_queryset(qs)
        serializer = VehicleSummarySerializer(
            page if page is not None else qs, many=True, context={'request': request}
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def record_odometer(self, request, pk=None):
        vehicle = self.get_object()
        odometer_km = request.data.get('odometer_km')
        if odometer_km is None:
            return Response({'error': 'odometer_km requis'}, status=status.HTTP_400_BAD_REQUEST)
        OdometerReading.objects.create(
            vehicle=vehicle,
            odometer_km=odometer_km,
            recorded_date=request.data.get('recorded_date') or timezone.now().date(),
            source=request.data.get('source') or 'manuel',
            created_by=request.user,
        )
        vehicle.odometer_km = odometer_km
        vehicle.save(update_fields=['odometer_km', 'updated_at'])
        return Response({'odometer_km': vehicle.odometer_km})


class VehiclePhotoViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    """Photos des véhicules (upload multipart)."""
    model = VehiclePhoto
    queryset = VehiclePhoto.objects.all()
    serializer_class = VehiclePhotoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if self.request.user.role == 'superadmin':
            qs = VehiclePhoto.objects.all()
        else:
            qs = VehiclePhoto.objects.filter(vehicle__company=self.request.user.company)
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    def perform_create(self, serializer):
        vehicle = serializer.validated_data.pop('vehicle', None)
        if not vehicle:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'vehicle': 'Véhicule requis.'})
        user = self.request.user
        same_company = (
            user.role == 'superadmin'
            or (user.company and vehicle.company_id == user.company_id)
        )
        if not same_company:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous n\'avez pas accès à ce véhicule.')
        serializer.save(vehicle=vehicle, uploaded_by=user)


class VehicleAssignmentViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = VehicleAssignment
    queryset = VehicleAssignment.objects.all()
    serializer_class = VehicleAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'superadmin':
            return VehicleAssignment.objects.all()
        return VehicleAssignment.objects.filter(vehicle__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save()


class VehicleDocumentViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = VehicleDocument
    queryset = VehicleDocument.objects.all()
    serializer_class = VehicleDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'superadmin':
            return VehicleDocument.objects.all()
        return VehicleDocument.objects.filter(vehicle__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Documents expirés ou arrivant à échéance sous 30 jours."""
        from django.utils import timezone as tz
        today = tz.now().date()
        cutoff = today + timedelta(days=30)
        qs = self.get_queryset().filter(
            date_expiration__isnull=False,
            date_expiration__lte=cutoff,
        )
        serializer = VehicleDocumentSerializer(qs, many=True)
        return Response(serializer.data)


class MaintenanceViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = Maintenance
    queryset = Maintenance.objects.all()
    serializer_class = MaintenanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'superadmin':
            return Maintenance.objects.all()
        return Maintenance.objects.filter(vehicle__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        maintenance = self.get_object()
        new_status = request.data.get('status')
        valid = dict(Maintenance.STATUS_CHOICES)
        if new_status not in valid:
            return Response({'error': 'statut invalide'}, status=status.HTTP_400_BAD_REQUEST)
        maintenance.status = new_status
        if new_status == 'terminee' and not maintenance.completed_date:
            maintenance.completed_date = timezone.now().date()
        maintenance.save()
        serializer = MaintenanceSerializer(maintenance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Maintenances à venir / en cours pour les alertes."""
        from django.utils import timezone as tz
        today = tz.now().date()
        cutoff = today + timedelta(days=14)
        qs = self.get_queryset().filter(
            scheduled_date__isnull=False,
            scheduled_date__lte=cutoff,
        ).exclude(status__in=['terminee', 'annulee'])
        serializer = MaintenanceSerializer(qs, many=True)
        return Response(serializer.data)


class MaintenanceScheduleViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = MaintenanceSchedule
    queryset = MaintenanceSchedule.objects.all()
    serializer_class = MaintenanceScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'superadmin':
            return MaintenanceSchedule.objects.all()
        return MaintenanceSchedule.objects.filter(vehicle__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'])
    def due(self, request):
        qs = [
            s for s in self.get_queryset()
            if s.is_due
        ]
        serializer = MaintenanceScheduleSerializer(qs, many=True)
        return Response(serializer.data)


class OdometerReadingViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = OdometerReading
    queryset = OdometerReading.objects.all()
    serializer_class = OdometerReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.get_queryset_base()
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    def get_queryset_base(self):
        if self.request.user.role == 'superadmin':
            return OdometerReading.objects.all()
        return OdometerReading.objects.filter(vehicle__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        reading = serializer.instance
        reading.vehicle.odometer_km = reading.odometer_km
        reading.vehicle.save(update_fields=['odometer_km', 'updated_at'])


class FuelRecordViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = FuelRecord
    queryset = FuelRecord.objects.all()
    serializer_class = FuelRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = self.get_queryset_base()
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return qs

    def get_queryset_base(self):
        if self.request.user.role == 'superadmin':
            return FuelRecord.objects.all()
        return FuelRecord.objects.filter(vehicle__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DriverProfileViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = DriverProfile
    queryset = DriverProfile.objects.all()
    serializer_class = DriverProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DriverProfileDetailSerializer
        return DriverProfileSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Permis expirés ou arrivant à échéance sous 30 jours."""
        from django.utils import timezone as tz
        today = tz.now().date()
        cutoff = today + timedelta(days=30)
        qs = self.get_queryset().filter(
            date_expiration_permis__isnull=False,
            date_expiration_permis__lte=cutoff,
        )
        serializer = DriverProfileSerializer(qs, many=True)
        return Response(serializer.data)


class DriverInfractionViewSet(MulitTenantMixin, viewsets.ModelViewSet):
    model = DriverInfraction
    queryset = DriverInfraction.objects.all()
    serializer_class = DriverInfractionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'superadmin':
            return DriverInfraction.objects.all()
        return DriverInfraction.objects.filter(driver__company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save()


class FleetDashboardView(MulitTenantMixin, viewsets.ViewSet):
    """Tableau de bord Parc Auto : KPIs + alertes."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        vehicles = _company_queryset(Vehicle, user)
        maintainances = Maintenance.objects.filter(vehicle__in=vehicles)
        fuel = FuelRecord.objects.filter(vehicle__in=vehicles)
        drivers = _company_queryset(DriverProfile, user)

        # KPIs
        total_vehicles = vehicles.count()
        status_counts = {}
        for key, _label in Vehicle.STATUS_CHOICES:
            status_counts[key] = vehicles.filter(statut=key).count()

        total_cost = vehicles.aggregate(s=Sum('cout_achat'))['s'] or 0
        total_fuel_cost = fuel.aggregate(s=Sum('cost'))['s'] or 0
        total_maintenance_cost = maintainances.filter(status='terminee').aggregate(s=Sum('cout'))['s'] or 0
        total_km = vehicles.aggregate(s=Sum('odometer_km'))['s'] or 0
        total_liters = fuel.aggregate(s=Sum('volume_liters'))['s'] or 0

        cost_per_km = (float(total_fuel_cost) + float(total_maintenance_cost)) / total_km if total_km else 0
        consumption = (float(total_liters) / total_km * 100) if total_km else 0

        # Alertes
        today = timezone.now().date()
        cutoff = today + timedelta(days=30)
        alerts = []

        expiring_docs = VehicleDocument.objects.filter(
            vehicle__in=vehicles, date_expiration__isnull=False, date_expiration__lte=cutoff
        )
        for doc in expiring_docs:
            alerts.append({
                'type': 'document',
                'severity': 'danger' if doc.is_expired else 'warning',
                'title': f"Document {doc.get_type_display()} - {doc.vehicle}",
                'message': f'Expire le {doc.date_expiration.strftime("%d/%m/%Y")}',
            })

        upcoming_maintenance = maintainances.filter(
            scheduled_date__isnull=False, scheduled_date__lte=cutoff
        ).exclude(status__in=['terminee', 'annulee'])
        for m in upcoming_maintenance:
            alerts.append({
                'type': 'maintenance',
                'severity': 'danger' if m.scheduled_date < today else 'warning',
                'title': f'Maintenance {m.title} - {m.vehicle}',
                'message': f'Prévue le {m.scheduled_date.strftime("%d/%m/%Y")}',
            })

        due_schedules = [s for s in MaintenanceSchedule.objects.filter(vehicle__in=vehicles) if s.is_due]
        for s in due_schedules:
            alerts.append({
                'type': 'schedule',
                'severity': 'warning',
                'title': f'Entretien {s.title} - {s.vehicle}',
                'message': 'Échéance atteinte',
            })

        expiring_drivers = drivers.filter(
            date_expiration_permis__isnull=False,
            date_expiration_permis__lte=cutoff,
        )
        for d in expiring_drivers:
            alerts.append({
                'type': 'driver',
                'severity': 'danger' if d.permis_expired else 'warning',
                'title': f"Permis {d.full_name}",
                'message': f'Expire le {d.date_expiration_permis.strftime("%d/%m/%Y")}',
            })

        return Response({
            'kpis': {
                'total_vehicles': total_vehicles,
                'available_vehicles': status_counts.get('disponible', 0),
                'in_mission': status_counts.get('en_mission', 0),
                'in_maintenance': status_counts.get('en_maintenance', 0),
                'reformed': status_counts.get('reforme', 0),
                'total_cost': total_cost,
                'total_fuel_cost': total_fuel_cost,
                'total_maintenance_cost': total_maintenance_cost,
                'total_km': total_km,
                'total_liters': total_liters,
                'cost_per_km': round(cost_per_km, 2),
                'consumption': round(consumption, 2),
                'total_drivers': drivers.count(),
            },
            'status_counts': status_counts,
            'alerts': alerts,
        })
