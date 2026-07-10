import { getLocales } from "expo-localization";

export type CountryMapRegion = { lat: number; lng: number; zoom: number };

/**
 * Centro y zoom aproximados para ver el país completo en el picker de mapa.
 * El zoom está pensado para pantallas de móvil (Leaflet, zoom entero).
 */
const COUNTRY_REGIONS: Record<string, CountryMapRegion> = {
  ES: { lat: 40.0, lng: -3.7, zoom: 6 },
  PT: { lat: 39.6, lng: -8.0, zoom: 7 },
  FR: { lat: 46.6, lng: 2.4, zoom: 6 },
  IT: { lat: 42.5, lng: 12.5, zoom: 6 },
  DE: { lat: 51.1, lng: 10.4, zoom: 6 },
  GB: { lat: 54.0, lng: -2.5, zoom: 6 },
  IE: { lat: 53.4, lng: -8.0, zoom: 7 },
  NL: { lat: 52.2, lng: 5.3, zoom: 7 },
  BE: { lat: 50.6, lng: 4.7, zoom: 8 },
  CH: { lat: 46.8, lng: 8.2, zoom: 8 },
  AT: { lat: 47.6, lng: 14.1, zoom: 7 },
  PL: { lat: 52.1, lng: 19.4, zoom: 6 },
  RO: { lat: 45.9, lng: 24.9, zoom: 7 },
  GR: { lat: 38.9, lng: 23.8, zoom: 6 },
  AD: { lat: 42.5, lng: 1.5, zoom: 10 },
  MA: { lat: 31.8, lng: -7.1, zoom: 6 },
  US: { lat: 39.8, lng: -98.6, zoom: 4 },
  MX: { lat: 23.6, lng: -102.5, zoom: 5 },
  BR: { lat: -14.2, lng: -51.9, zoom: 4 },
  AR: { lat: -38.4, lng: -63.6, zoom: 4 },
  CL: { lat: -35.7, lng: -71.5, zoom: 4 },
  CO: { lat: 4.6, lng: -74.3, zoom: 5 },
  PE: { lat: -9.2, lng: -75.0, zoom: 5 },
  EC: { lat: -1.8, lng: -78.2, zoom: 6 },
  UY: { lat: -32.5, lng: -55.8, zoom: 7 },
  VE: { lat: 6.4, lng: -66.6, zoom: 5 },
};

const FALLBACK: CountryMapRegion = COUNTRY_REGIONS.ES;

/**
 * Región del mapa según el país configurado en el dispositivo del usuario
 * (sin GPS ni permisos: usa el locale del sistema). Fallback: España.
 */
export function countryMapRegion(): CountryMapRegion {
  const regionCode = getLocales()[0]?.regionCode?.toUpperCase() ?? null;
  return (regionCode && COUNTRY_REGIONS[regionCode]) || FALLBACK;
}
