export const AMENITY_CONFIG = {
  wifi: { label: 'Wi-Fi', icon: 'wifi' },
  parking: { label: 'Otopark', icon: 'local-parking' },
  pool: { label: 'Havuz', icon: 'pool' },
  gym: { label: 'Spor Salonu', icon: 'fitness-center' },
  elevator: { label: 'Asansor', icon: 'elevator' },
  balcony: { label: 'Balkon', icon: 'balcony' },
  security: { label: 'Guvenlik', icon: 'security' },
  generator: { label: 'Jenerator', icon: 'bolt' },
  garden: { label: 'Bahce', icon: 'grass' },
  storage: { label: 'Depo', icon: 'inventory-2' },
  jacuzzi: { label: 'Jakuzi', icon: 'hot-tub' },
} as const;

export type AmenityKey = keyof typeof AMENITY_CONFIG;
