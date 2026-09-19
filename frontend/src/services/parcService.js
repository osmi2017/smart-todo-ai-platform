import { useCrudService } from '../utils/createCrudService';

const vehicleFormat = (data) => ({
  immatriculation: data.immatriculation,
  marque: data.marque,
  modele: data.modele,
  annee: data.annee || null,
  type_vehicule: data.type_vehicule || 'berline',
  type_carburant: data.type_carburant || 'diesel',
  numero_chassis: data.numero_chassis || '',
  statut: data.statut || 'disponible',
  odometer_km: data.odometer_km || 0,
  cout_achat: data.cout_achat || 0,
  cout_kilometre: data.cout_kilometre || 0,
  consommation_moyenne: data.consommation_moyenne || 0,
});

const assignmentFormat = (data) => ({
  vehicle: data.vehicle,
  user: data.user || null,
  service_name: data.service_name || '',
  type: data.type || 'temporaire',
  start_date: data.start_date,
  end_date: data.end_date || null,
  notes: data.notes || '',
});

const documentFormat = (data) => ({
  vehicle: data.vehicle,
  type: data.type,
  title: data.title,
  file_name: data.file_name || '',
  file_url: data.file_url || '',
  numero: data.numero || '',
  date_emission: data.date_emission || null,
  date_expiration: data.date_expiration || null,
  notes: data.notes || '',
});

const maintenanceFormat = (data) => ({
  vehicle: data.vehicle,
  type: data.type || 'preventive',
  title: data.title,
  description: data.description || '',
  status: data.status || 'planifiee',
  scheduled_date: data.scheduled_date || null,
  completed_date: data.completed_date || null,
  odometer_at: data.odometer_at || null,
  cout: data.cout || 0,
  fournisseur: data.fournisseur || '',
  facture_ref: data.facture_ref || '',
});

const scheduleFormat = (data) => ({
  vehicle: data.vehicle,
  title: data.title,
  interval_kilometers: data.interval_kilometers || null,
  interval_months: data.interval_months || null,
  last_done_km: data.last_done_km || null,
  last_done_date: data.last_done_date || null,
  next_due_km: data.next_due_km || null,
  next_due_date: data.next_due_date || null,
  notes: data.notes || '',
});

const odometerFormat = (data) => ({
  vehicle: data.vehicle,
  odometer_km: data.odometer_km,
  recorded_date: data.recorded_date || null,
  source: data.source || 'manuel',
});

const fuelFormat = (data) => ({
  vehicle: data.vehicle,
  date: data.date,
  volume_liters: data.volume_liters,
  cost: data.cost || 0,
  station: data.station || '',
  odometer_km: data.odometer_km || null,
  full_tank: data.full_tank !== undefined ? data.full_tank : true,
  currency: data.currency || 'xof',
  notes: data.notes || '',
});

const driverFormat = (data) => ({
  user: data.user || null,
  full_name: data.full_name || '',
  type_permis: data.type_permis || '',
  date_expiration_permis: data.date_expiration_permis || null,
  numero_permis: data.numero_permis || '',
  telephone: data.telephone || '',
  email: data.email || '',
  notes: data.notes || '',
});

const infractionFormat = (data) => ({
  driver: data.driver,
  type: data.type,
  description: data.description || '',
  montant: data.montant || 0,
  currency: data.currency || 'xof',
  date: data.date,
  status: data.status || 'en_attente',
  lieu: data.lieu || '',
});

export const useVehicleService = () => {
  const service = useCrudService('/vehicles', {
    resourceName: 'vehicles',
    formatData: vehicleFormat,
    extraActions: (api) => ({
      recordOdometer: async (id, data) => {
        const res = await api.post(`/vehicles/${id}/record_odometer/`, data);
        return res.data;
      },
      uploadPhoto: async (vehicleId, file, caption) => {
        const formData = new FormData();
        formData.append('vehicle', vehicleId);
        formData.append('image', file);
        if (caption) formData.append('caption', caption);
        const res = await api.post('/vehicle-photos/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      },
      deletePhoto: async (id) => {
        const res = await api.delete(`/vehicle-photos/${id}/`);
        return res.data;
      },
      getSummary: async (params) => {
        const res = await api.get('/vehicles/', { params });
        return res.data;
      },
    }),
  });
  return {
    getVehicles: service.getAll,
    getVehicle: service.getOne,
    createVehicle: service.create,
    updateVehicle: service.update,
    deleteVehicle: service.remove,
    recordOdometer: service.recordOdometer,
    uploadPhoto: service.uploadPhoto,
    deletePhoto: service.deletePhoto,
    getSummary: service.getSummary,
  };
};

export const useAssignmentService = () => {
  const service = useCrudService('/vehicle-assignments', {
    resourceName: 'vehicle-assignments',
    formatData: assignmentFormat,
  });
  return {
    getAssignments: service.getAll,
    getAssignment: service.getOne,
    createAssignment: service.create,
    updateAssignment: service.update,
    deleteAssignment: service.remove,
  };
};

export const useDocumentService = () => {
  const service = useCrudService('/vehicle-documents', {
    resourceName: 'vehicle-documents',
    formatData: documentFormat,
    extraActions: (api) => ({
      getExpiring: async () => {
        const res = await api.get('/vehicle-documents/expiring/');
        return res.data;
      },
    }),
  });
  return {
    getDocuments: service.getAll,
    getDocument: service.getOne,
    createDocument: service.create,
    updateDocument: service.update,
    deleteDocument: service.remove,
    getExpiring: service.getExpiring,
  };
};

export const useMaintenanceService = () => {
  const service = useCrudService('/maintenances', {
    resourceName: 'maintenances',
    formatData: maintenanceFormat,
    extraActions: (api) => ({
      setStatus: async (id, status) => {
        const res = await api.post(`/maintenances/${id}/set_status/`, { status });
        return res.data;
      },
      getUpcoming: async () => {
        const res = await api.get('/maintenances/upcoming/');
        return res.data;
      },
    }),
  });
  return {
    getMaintenances: service.getAll,
    getMaintenance: service.getOne,
    createMaintenance: service.create,
    updateMaintenance: service.update,
    deleteMaintenance: service.remove,
    setStatus: service.setStatus,
    getUpcoming: service.getUpcoming,
  };
};

export const useScheduleService = () => {
  const service = useCrudService('/maintenance-schedules', {
    resourceName: 'maintenance-schedules',
    formatData: scheduleFormat,
    extraActions: (api) => ({
      getDue: async () => {
        const res = await api.get('/maintenance-schedules/due/');
        return res.data;
      },
    }),
  });
  return {
    getSchedules: service.getAll,
    getSchedule: service.getOne,
    createSchedule: service.create,
    updateSchedule: service.update,
    deleteSchedule: service.remove,
    getDue: service.getDue,
  };
};

export const useOdometerService = () => {
  const service = useCrudService('/odometer-readings', {
    resourceName: 'odometer-readings',
    formatData: odometerFormat,
  });
  return {
    getReadings: service.getAll,
    getReading: service.getOne,
    createReading: service.create,
    updateReading: service.update,
    deleteReading: service.remove,
  };
};

export const useFuelService = () => {
  const service = useCrudService('/fuel-records', {
    resourceName: 'fuel-records',
    formatData: fuelFormat,
  });
  return {
    getFuelRecords: service.getAll,
    getFuelRecord: service.getOne,
    createFuelRecord: service.create,
    updateFuelRecord: service.update,
    deleteFuelRecord: service.remove,
  };
};

export const useDriverService = () => {
  const service = useCrudService('/drivers', {
    resourceName: 'drivers',
    formatData: driverFormat,
    extraActions: (api) => ({
      getExpiring: async () => {
        const res = await api.get('/drivers/expiring/');
        return res.data;
      },
    }),
  });
  return {
    getDrivers: service.getAll,
    getDriver: service.getOne,
    createDriver: service.create,
    updateDriver: service.update,
    deleteDriver: service.remove,
    getExpiring: service.getExpiring,
  };
};

export const useInfractionService = () => {
  const service = useCrudService('/driver-infractions', {
    resourceName: 'driver-infractions',
    formatData: infractionFormat,
  });
  return {
    getInfractions: service.getAll,
    getInfraction: service.getOne,
    createInfraction: service.create,
    updateInfraction: service.update,
    deleteInfraction: service.remove,
  };
};

export const useFleetDashboard = () => {
  const service = useCrudService('/fleet-dashboard', {
    resourceName: 'fleet-dashboard',
  });
  return {
    getDashboard: service.getAll,
  };
};
