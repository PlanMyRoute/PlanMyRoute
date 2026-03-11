import { Json } from "@planmyroute/types";

interface Coordinates {
    lat: number;
    lng: number;
}

export const getCoordinatesFromJson = (point: any): Coordinates => {
    return {
        lat: point?.lat || 0,
        lng: point?.lng || 0,
    };
};

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos
 * utilizando la fórmula de Haversine.
 * @param point1 - Las coordenadas del primer punto { lat, lng }.
 * @param point2 - Las coordenadas del segundo punto { lat, lng }.
 * @returns La distancia en kilómetros.
 */
export const calculateDistance = (point1: Json, point2: Json): number => {
    const coords1 = getCoordinatesFromJson(point1);
    const coords2 = getCoordinatesFromJson(point2);
    const R = 6371; // Radio de la Tierra en kilómetros

    const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
    const dLng = (coords2.lng - coords1.lng) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coords1.lat * (Math.PI / 180)) *
        Math.cos(coords2.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distancia final en km
    return distance;
};