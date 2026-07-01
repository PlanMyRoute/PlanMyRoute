import { Json } from "@planmyroute/types";

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Factor multiplicador para estimar distancia por carretera a partir de distancia
 * haversine (línea recta). Valor conservador (1.3) adecuado tanto para planificación
 * de viaje como para cálculos de autonomía de combustible.
 */
export const ROAD_FACTOR = 1.3;

/** Extrae coordenadas de un objeto JSON genérico */
export const getCoordinatesFromJson = (point: any): Coordinates => {
  return {
    lat: point?.lat ?? 0,
    lng: point?.lng ?? 0,
  };
};

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos
 * utilizando la fórmula de Haversine (con coordenadas tipadas).
 * @param a - Coordenadas del primer punto { lat, lng }.
 * @param b - Coordenadas del segundo punto { lat, lng }.
 * @returns La distancia en línea recta en kilómetros.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const A =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
}

/**
 * Estima la distancia por carretera entre dos puntos usando haversine * ROAD_FACTOR.
 * @param a - Coordenadas del primer punto { lat, lng }.
 * @param b - Coordenadas del segundo punto { lat, lng }.
 * @returns La distancia estimada por carretera en kilómetros.
 */
export function estimateRoadDistanceKm(a: Coordinates, b: Coordinates): number {
  return haversineKm(a, b) * ROAD_FACTOR;
}

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos
 * utilizando la fórmula de Haversine (acepta Json genérico).
 * @param point1 - Las coordenadas del primer punto { lat, lng }.
 * @param point2 - Las coordenadas del segundo punto { lat, lng }.
 * @returns La distancia en kilómetros.
 */
export const calculateDistance = (point1: Json, point2: Json): number => {
  const coords1 = getCoordinatesFromJson(point1);
  const coords2 = getCoordinatesFromJson(point2);
  return haversineKm(coords1, coords2);
};
