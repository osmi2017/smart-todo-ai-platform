from rest_framework import serializers
from .models import (
    Vehicle, VehiclePhoto, VehicleAssignment, VehicleDocument, Maintenance,
    MaintenanceSchedule, OdometerReading, FuelRecord, DriverProfile,
    DriverInfraction,
)
from .models import User, Company


class UserLightSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']


# ----------------------------------------------------------------------
# Véhicules
# ----------------------------------------------------------------------
class VehicleAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = VehicleAssignment
        fields = [
            'id', 'vehicle', 'user', 'user_name', 'service_name',
            'type', 'start_date', 'end_date', 'notes', 'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username
        return obj.service_name


class VehicleDocumentSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    expires_soon = serializers.BooleanField(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = VehicleDocument
        fields = [
            'id', 'vehicle', 'type', 'type_display', 'title', 'file_name',
            'file_url', 'numero', 'date_emission', 'date_expiration',
            'notes', 'is_expired', 'expires_soon', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MaintenanceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Maintenance
        fields = [
            'id', 'vehicle', 'type', 'type_display', 'title', 'description',
            'status', 'status_display', 'scheduled_date', 'completed_date',
            'odometer_at', 'cout', 'fournisseur', 'facture_ref',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MaintenanceScheduleSerializer(serializers.ModelSerializer):
    is_due = serializers.BooleanField(read_only=True)
    vehicle_label = serializers.CharField(source='vehicle.__str__', read_only=True)

    class Meta:
        model = MaintenanceSchedule
        fields = [
            'id', 'vehicle', 'vehicle_label', 'title',
            'interval_kilometers', 'interval_months',
            'last_done_km', 'last_done_date', 'next_due_km', 'next_due_date',
            'notes', 'is_due', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OdometerReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OdometerReading
        fields = [
            'id', 'vehicle', 'odometer_km', 'recorded_date', 'source', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FuelRecordSerializer(serializers.ModelSerializer):
    cost_per_liter = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = FuelRecord
        fields = [
            'id', 'vehicle', 'date', 'volume_liters', 'cost', 'station',
            'odometer_km', 'full_tank', 'currency', 'notes', 'cost_per_liter',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'cost_per_liter']


class VehiclePhotoSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True, default='')

    class Meta:
        model = VehiclePhoto
        fields = ['id', 'vehicle', 'image', 'caption', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class VehicleSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_carburant_display = serializers.CharField(source='get_type_carburant_display', read_only=True)
    type_vehicule_display = serializers.CharField(source='get_type_vehicule_display', read_only=True)
    current_assignment = VehicleAssignmentSerializer(read_only=True)
    assignments = VehicleAssignmentSerializer(many=True, read_only=True)
    documents = VehicleDocumentSerializer(many=True, read_only=True)
    maintenances = MaintenanceSerializer(many=True, read_only=True)
    fuel_records = FuelRecordSerializer(many=True, read_only=True)
    photos = VehiclePhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'immatriculation', 'marque', 'modele', 'annee',
            'type_vehicule', 'type_vehicule_display',
            'type_carburant', 'type_carburant_display', 'numero_chassis',
            'statut', 'statut_display', 'odometer_km',
            'cout_achat', 'cout_kilometre', 'consommation_moyenne',
            'current_assignment', 'assignments', 'documents',
            'maintenances', 'fuel_records', 'photos', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'current_assignment', 'assignments',
            'documents', 'maintenances', 'fuel_records', 'photos',
            'created_at', 'updated_at',
        ]

    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)


class VehicleDetailSerializer(VehicleSerializer):
    pass


class VehicleSummarySerializer(serializers.ModelSerializer):
    """Sérialiseur léger pour listes/agrégations"""
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_vehicule_display = serializers.CharField(source='get_type_vehicule_display', read_only=True)
    type_carburant_display = serializers.CharField(source='get_type_carburant_display', read_only=True)
    type_vehicule = serializers.CharField(read_only=True)
    current_assignment = VehicleAssignmentSerializer(read_only=True)
    first_photo = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'immatriculation', 'marque', 'modele', 'statut', 'statut_display',
            'type_vehicule', 'type_vehicule_display',
            'type_carburant', 'type_carburant_display', 'numero_chassis', 'annee',
            'cout_achat', 'cout_kilometre', 'odometer_km',
            'current_assignment', 'first_photo',
        ]

    def get_first_photo(self, obj):
        photo = obj.photos.first()
        if not photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(photo.image.url)
        return photo.image.url


# ----------------------------------------------------------------------
# Conducteurs
# ----------------------------------------------------------------------
class DriverInfractionSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DriverInfraction
        fields = [
            'id', 'driver', 'type', 'type_display', 'description',
            'montant', 'currency', 'date', 'status', 'status_display',
            'lieu', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DriverProfileSerializer(serializers.ModelSerializer):
    permis_expired = serializers.BooleanField(read_only=True)
    permis_expires_soon = serializers.BooleanField(read_only=True)
    infractions = DriverInfractionSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    full_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = DriverProfile
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_phone', 'full_name', 'type_permis',
            'date_expiration_permis', 'numero_permis', 'telephone', 'email',
            'notes', 'permis_expired', 'permis_expires_soon', 'infractions',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'telephone', 'email', 'user_email', 'user_phone',
            'permis_expired', 'permis_expires_soon', 'infractions', 'created_at', 'updated_at',
        ]

    def validate_user(self, value):
        """L'utilisateur doit appartenir à l'entreprise du conducteur."""
        user = self.context['request'].user
        if user.role == 'superadmin':
            return value
        if not value.company_id or value.company_id != user.company_id:
            raise serializers.ValidationError('Le conducteur doit être un utilisateur de cette entreprise.')
        return value

    def validate(self, attrs):
        if attrs.get('user') and not (attrs.get('full_name') or '').strip():
            attrs['full_name'] = attrs['user'].get_full_name() or attrs['user'].username
        attrs.setdefault('full_name', '')
        return attrs

    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)

    def get_user_name(self, obj):
        return obj.user.username if obj.user else ''

    def get_user_email(self, obj):
        return obj.user.email if obj.user else ''

    def get_user_phone(self, obj):
        return getattr(obj.user, 'phone', '') if obj.user else ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # L'email et le téléphone du conducteur sont ceux de l'utilisateur
        if instance.user:
            data['email'] = instance.user.email
            data['telephone'] = getattr(instance.user, 'phone', '')
        return data


class DriverProfileDetailSerializer(DriverProfileSerializer):
    pass
