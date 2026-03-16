import { apiFetch } from '@/constants/api';
import { Accommodation, Activity, Refuel, Route, Stop } from '@planmyroute/types';

type FetchOptions = {
    token?: string;
    signal?: AbortSignal;
};

/**
 * Servicio para gestionar el itinerario de un viaje (rutas y paradas)
 */
export class ItineraryService {
    // =============== RUTAS ===============

    /**
     * Obtiene todas las rutas de un viaje
     */
    static async getRoutesByTripId(tripId: string, opts?: FetchOptions): Promise<Route[]> {
        try {
            return await apiFetch<Route[]>(`/api/route/trip/${tripId}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('Error in getRoutesByTripId:', error);
            throw error;
        }
    }

    /**
     * Obtiene una ruta específica con sus paradas
     */
    static async getRouteWithStops(routeId: string, opts?: FetchOptions): Promise<Route & { stops: Stop[] }> {
        try {
            return await apiFetch<Route & { stops: Stop[] }>(`/api/route/${routeId}/with-stops`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('Error in getRouteWithStops:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva ruta
     */
    static async createRoute(routeData: Partial<Route>, token?: string): Promise<Route> {
        try {
            return await apiFetch<Route>(`/api/route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(routeData),
            });
        } catch (error) {
            console.error('Error in createRoute:', error);
            throw error;
        }
    }

    /**
     * Elimina una ruta
     */
    static async deleteRoute(routeId: string, token?: string): Promise<void> {
        try {
            await apiFetch<void>(`/api/route/${routeId}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            console.error('Error in deleteRoute:', error);
            throw error;
        }
    }

    // =============== PARADAS ===============

    /**
     * Obtiene todas las paradas de un viaje
     */
    static async getStopsByTripId(tripId: string, opts?: FetchOptions): Promise<Stop[]> {
        try {
            return await apiFetch<Stop[]>(`/api/itinerary/trip/${tripId}/stops`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('Error in getStopsByTripId:', error);
            throw error;
        }
    }

    /**
     * Obtiene una parada específica por su ID
     */
    static async getStopById(stopId: string, opts?: FetchOptions): Promise<Stop> {
        try {
            return await apiFetch<Stop>(`/api/stop/${stopId}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('Error in getStopById:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva parada
     */
    static async createStop(tripId: string, stopData: Partial<Stop>, token?: string): Promise<Stop> {
        try {
            const result = await apiFetch<Stop>(`/api/trip/${tripId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(stopData),
            });
            console.log('Parada creada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in createStop:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva parada de tipo Activity
     */
    static async createActivityStop(
        tripId: string,
        data: { stopData: Partial<Stop>; activityData: Partial<Activity> },
        token?: string
    ): Promise<any> {
        try {
            const result = await apiFetch<any>(`/api/trip/${tripId}/stop/activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(data),
            });
            console.log('Parada de actividad creada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in createActivityStop:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva parada de tipo Accommodation
     */
    static async createAccommodationStop(
        tripId: string,
        data: { stopData: Partial<Stop>; accommodationData: Partial<Accommodation> },
        token?: string
    ): Promise<any> {
        try {
            const result = await apiFetch<any>(`/api/trip/${tripId}/stop/accommodation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(data),
            });
            console.log('Parada de alojamiento creada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in createAccommodationStop:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva parada de tipo Refuel
     */
    static async createRefuelStop(
        tripId: string,
        data: { stopData: Partial<Stop>; refuelData: Partial<Refuel> },
        token?: string
    ): Promise<any> {
        try {
            const result = await apiFetch<any>(`/api/trip/${tripId}/stop/refuel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(data),
            });
            console.log('Parada de repostaje creada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in createRefuelStop:', error);
            throw error;
        }
    }

    /**
     * Actualiza una parada existente
     */
    static async updateStop(stopId: string, stopData: Partial<Stop>, tripId: string, token?: string): Promise<Stop> {
        try {
            return await apiFetch<Stop>(`/api/trip/${tripId}/stop/${stopId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(stopData),
            });
        } catch (error) {
            // No loguear errores de validación (origen/destino/intermedia)
            if (!(error as Error)?.message?.includes('Origen') &&
                !(error as Error)?.message?.includes('Destino') &&
                !(error as Error)?.message?.includes('intermedia')) {
                console.error('Error in updateStop:', error);
            }
            throw error;
        }
    }

    /**
     * Actualiza los datos de una parada de tipo Activity
     */
    static async updateActivityStop(
        tripId: string,
        stopId: string,
        activityData: Partial<Activity>,
        token?: string
    ): Promise<any> {
        try {
            const result = await apiFetch<any>(`/api/trip/${tripId}/stop/activity/${stopId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify({ stopData: {}, activityData }),
            });
            console.log('Parada de actividad actualizada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in updateActivityStop:', error);
            throw error;
        }
    }

    /**
     * Actualiza los datos de una parada de tipo Accommodation
     */
    static async updateAccommodationStop(
        tripId: string,
        stopId: string,
        accommodationData: Partial<Accommodation>,
        token?: string
    ): Promise<any> {
        try {
            const result = await apiFetch<any>(`/api/trip/${tripId}/stop/accommodation/${stopId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify({ stopData: {}, accommodationData }),
            });
            console.log('Parada de alojamiento actualizada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in updateAccommodationStop:', error);
            throw error;
        }
    }

    /**
     * Actualiza los datos de una parada de tipo Refuel
     */
    static async updateRefuelStop(
        tripId: string,
        stopId: string,
        refuelData: Partial<Refuel>,
        token?: string
    ): Promise<any> {
        try {
            const result = await apiFetch<any>(`/api/trip/${tripId}/stop/refuel/${stopId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify({ stopData: {}, refuelData }),
            });
            console.log('Parada de repostaje actualizada exitosamente:', result);
            return result;
        } catch (error) {
            console.error('Error in updateRefuelStop:', error);
            throw error;
        }
    }

    /**
     * Elimina una parada
     */
    static async deleteStop(stopId: string, tripId: string, token?: string): Promise<void> {
        try {
            await apiFetch<void>(`/api/trip/${tripId}/stop/${stopId}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            console.error('Error in deleteStop:', error);
            throw error;
        }
    }

    // =============== ITINERARIO COMPLETO ===============

    /**
     * Obtiene el itinerario completo de un viaje (rutas con sus paradas)
     */
    static async getTripItinerary(
        tripId: string,
        opts?: FetchOptions
    ): Promise<Array<Route & { stops: Stop[] }>> {
        try {
            return await apiFetch<Array<Route & { stops: Stop[] }>>(`/api/itinerary/trip/${tripId}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('Error in getTripItinerary:', error);
            throw error;
        }
    }

    // =============== ADJUNTOS ===============

    /**
     * Sube un archivo de reserva a una parada
     */
    static async uploadReservationFile(
        stopId: string,
        file: { uri: string; name: string; mimeType: string },
        token: string
    ): Promise<{ id: string; path: string; url: string }> {
        try {
            const formData = new FormData();

            // En React Native, crear objeto de archivo
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType,
            } as any);

            const result = await apiFetch<{ data: { id: string; path: string; url: string } }>(`/api/stop/${stopId}/attachments`, {
                method: 'POST',
                token,
                body: formData,
            });
            return result.data;
        } catch (error) {
            console.error('Error in uploadReservationFile:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los adjuntos de una parada
     */
    static async getStopAttachments(
        stopId: string,
        token: string
    ): Promise<Array<{
        id: string;
        stop_id: number;
        file_path: string;
        file_name: string;
        file_type: string;
        file_size: number;
        url: string;
        created_at: string;
    }>> {
        try {
            const result = await apiFetch<{
                data: Array<{
                    id: string;
                    stop_id: number;
                    file_path: string;
                    file_name: string;
                    file_type: string;
                    file_size: number;
                    url: string;
                    created_at: string;
                }>
            }>(`/api/stop/${stopId}/attachments`, {
                token,
            });
            return result.data || [];
        } catch (error) {
            console.error('Error in getStopAttachments:', error);
            throw error;
        }
    }

    /**
     * Elimina un adjunto
     */
    static async deleteAttachment(attachmentId: string, token: string): Promise<void> {
        try {
            await apiFetch<void>(`/api/attachments/${attachmentId}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            console.error('Error in deleteAttachment:', error);
            throw error;
        }
    }
}

/**
 * Servicio para geocodificación y cálculo de rutas
 */
export class GeocodingService {
    /**
     * Geocodifica una dirección usando Nominatim (OpenStreetMap)
     */
    static async geocodeAddress(address: string): Promise<{
        latitude: number;
        longitude: number;
        displayName: string;
    } | null> {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'PlanMyRoute/1.0',
                    },
                }
            );

            if (!response.ok) throw new Error('Error geocoding address');

            const data = await response.json();

            if (data.length === 0) return null;

            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                displayName: data[0].display_name,
            };
        } catch (error) {
            console.error('Error in geocodeAddress:', error);
            throw error;
        }
    }

    /**
     * Geocodifica inversamente unas coordenadas (obtiene la dirección)
     */
    static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                {
                    headers: {
                        'User-Agent': 'PlanMyRoute/1.0',
                    },
                }
            );

            if (!response.ok) throw new Error('Error reverse geocoding');

            const data = await response.json();

            return data.display_name || null;
        } catch (error) {
            console.error('Error in reverseGeocode:', error);
            throw error;
        }
    }

    /**
     * Calcula la ruta entre múltiples coordenadas usando OSRM
     */
    static async calculateRoute(
        coordinates: Array<{ latitude: number; longitude: number }>
    ): Promise<{ latitude: number; longitude: number }[]> {
        if (coordinates.length < 2) return [];

        try {
            const coordsString = coordinates
                .map((coord) => `${coord.longitude},${coord.latitude}`)
                .join(';');

            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`
            );

            if (!response.ok) throw new Error('Error calculating route');

            const data = await response.json();

            if (data.routes && data.routes[0]) {
                return data.routes[0].geometry.coordinates.map((coord: number[]) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                }));
            }

            return [];
        } catch (error) {
            console.error('Error in calculateRoute:', error);
            throw error;
        }
    }

    /**
     * Calcula la distancia y duración entre dos puntos
     */
    static async getDistanceAndDuration(
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number }
    ): Promise<{ distance: number; duration: number } | null> {
        try {
            const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`
            );

            if (!response.ok) throw new Error('Error getting distance and duration');

            const data = await response.json();

            if (data.routes && data.routes[0]) {
                return {
                    distance: data.routes[0].distance, // en metros
                    duration: data.routes[0].duration, // en segundos
                };
            }

            return null;
        } catch (error) {
            console.error('Error in getDistanceAndDuration:', error);
            throw error;
        }
    }
}

