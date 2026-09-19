export const VEHICLE_TYPES = ['berline', 'suv', 'pickup', 'utilitaire', 'camion', 'moto', 'autre'];

export const VEHICLE_TYPE_IMAGE = {
  berline: '/images/vehicules/berline.svg',
  suv: '/images/vehicules/suv.svg',
  pickup: '/images/vehicules/pickup.svg',
  utilitaire: '/images/vehicules/utilitaire.svg',
  camion: '/images/vehicules/camion.svg',
  moto: '/images/vehicules/moto.svg',
  autre: '/images/vehicules/autre.svg',
};

export const getVehicleTypeImage = (type) => VEHICLE_TYPE_IMAGE[type] || VEHICLE_TYPE_IMAGE.autre;