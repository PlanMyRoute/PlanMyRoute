import { useAuth } from '@/context/AuthContext';
import { Accommodation, Activity, Refuel, Route, Stop } from '@planmyroute/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GeocodingService, ItineraryService } from '../services/itineraryService';

// =============== TYPES ===============

type UseItineraryOptions = {
    token?: string;
    enabled?: boolean;
};

type UseItineraryResult = {
    itinerary: Array<Route & { stops: Stop[] }> | null;
    stops: Stop[] | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
};

type UseStopsResult = {
    stops: Stop[] | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
};

// Tipos para crear paradas con subtipos
export type CreateActivityStopData = {
    stopData: Partial<Stop>;
    activityData: Partial<Activity>;
};

export type CreateAccommodationStopData = {
    stopData: Partial<Stop>;
    accommodationData: Partial<Accommodation>;
};

export type CreateRefuelStopData = {
    stopData: Partial<Stop>;
    refuelData: Partial<Refuel>;
};

// =============== HOOKS ===============

/**
 * Hook para obtener el itinerario completo de un viaje (rutas con paradas)
 */
export function useItinerary(
    tripId: string | null | undefined,
    options?: UseItineraryOptions
): UseItineraryResult {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = Boolean(tripId) && (options?.enabled !== false);

    const query = useQuery<Array<Route & { stops: Stop[] }>, Error>({
        queryKey: ['itinerary', tripId],
        queryFn: () => ItineraryService.getTripItinerary(tripId as string, { token: finalToken || undefined }),
        enabled,
    });

    // Extraer todas las paradas únicas del itinerario
    const stops = query.data && Array.isArray(query.data)
        ? Array.from(
            new Map(
                query.data.flatMap((route) => route.stops || []).map((stop) => [stop.id, stop])
            ).values()
        )
        : null;

    return {
        itinerary: query.data ?? null,
        stops,
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: () => query.refetch(),
    };
}

/**
 * Hook para obtener solo las paradas de un viaje
 */
export function useStops(
    tripId: string | null | undefined,
    options?: UseItineraryOptions
): UseStopsResult {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = Boolean(tripId) && (options?.enabled !== false);

    const query = useQuery<Stop[], Error>({
        queryKey: ['stops', tripId],
        queryFn: () => ItineraryService.getStopsByTripId(tripId as string, { token: finalToken || undefined }),
        enabled,
        staleTime: 0, // Los datos se consideran stale inmediatamente
        gcTime: 5 * 60 * 1000, // Mantén en caché 5 minutos
    });

    return {
        stops: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: () => query.refetch(),
    };
}

/**
 * Hook para crear una nueva parada simple
 */
export function useCreateStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (stopData: Partial<Stop>) => {
            return await ItineraryService.createStop(tripId, stopData, finalToken || undefined);
        },
        onSuccess: () => {
            // Invalidar y refetch del itinerario y paradas
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
        },
    });
}

/**
 * Hook para crear una parada de tipo Activity
 */
export function useCreateActivityStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateActivityStopData) => {
            return await ItineraryService.createActivityStop(tripId, data, finalToken || undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
            queryClient.invalidateQueries({ queryKey: ['activityCostByTrip', tripId] });
        },
    });
}

/**
 * Hook para crear una parada de tipo Accommodation
 */
export function useCreateAccommodationStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateAccommodationStopData) => {
            return await ItineraryService.createAccommodationStop(tripId, data, finalToken || undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
            queryClient.invalidateQueries({ queryKey: ['accommodationCostByTrip', tripId] });
        },
    });
}

/**
 * Hook para crear una parada de tipo Refuel
 */
export function useCreateRefuelStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateRefuelStopData) => {
            return await ItineraryService.createRefuelStop(tripId, data, finalToken || undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
            queryClient.invalidateQueries({ queryKey: ['refuelCostByTrip', tripId] });
            // También invalida el costo de refuel del usuario
            queryClient.invalidateQueries({ queryKey: ['refuelCostByUser'] });
        },
    });
}

/**
 * Hook para actualizar una parada existente
 */
export function useUpdateStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            stopId,
            stopData,
        }: {
            stopId: string;
            stopData: Partial<Stop>;
        }) => {
            return await ItineraryService.updateStop(stopId, stopData, tripId, finalToken || undefined);
        },
        onSuccess: () => {
            // Invalidar y refetch del itinerario y paradas
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
        },
    });
}

/**
 * Hook para actualizar los datos de una parada Activity
 */
export function useUpdateActivityStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stopId, activityData }: { stopId: string; activityData: Partial<Activity> }) => {
            return await ItineraryService.updateActivityStop(tripId, stopId, activityData, finalToken || undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
            queryClient.invalidateQueries({ queryKey: ['activityCostByTrip', tripId] });
        },
    });
}

/**
 * Hook para actualizar los datos de una parada Accommodation
 */
export function useUpdateAccommodationStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stopId, accommodationData }: { stopId: string; accommodationData: Partial<Accommodation> }) => {
            return await ItineraryService.updateAccommodationStop(tripId, stopId, accommodationData, finalToken || undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
            queryClient.invalidateQueries({ queryKey: ['accommodationCostByTrip', tripId] });
        },
    });
}

/**
 * Hook para actualizar los datos de una parada Refuel
 */
export function useUpdateRefuelStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ stopId, refuelData }: { stopId: string; refuelData: Partial<Refuel> }) => {
            return await ItineraryService.updateRefuelStop(tripId, stopId, refuelData, finalToken || undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
            queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
            queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
            queryClient.invalidateQueries({ queryKey: ['refuelCostByTrip', tripId] });
        },
    });
}

/**
 * Hook para eliminar una parada
 */
export function useDeleteStop(tripId: string, options?: { token?: string }) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (stopId: string) => {
            return await ItineraryService.deleteStop(stopId, tripId, finalToken || undefined);
        },
        onSuccess: (_, stopId) => {
            // Asegurar que tripId no es null antes de invalidar
            if (tripId) {
                // Invalidar y refetch del itinerario y paradas
                queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
                queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
                queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
                queryClient.invalidateQueries({ queryKey: ['refuelCostByTrip', tripId] });
                queryClient.invalidateQueries({ queryKey: ['refuelCostByUser'] });
            }
        },
    });
}

/**
 * Hook para geocodificar una dirección
 */
export function useGeocode() {
    return useMutation({
        mutationFn: async (address: string) => {
            return await GeocodingService.geocodeAddress(address);
        },
    });
}

/**
 * Hook para calcular una ruta entre coordenadas
 */
export function useCalculateRoute() {
    return useMutation({
        mutationFn: async (coordinates: Array<{ latitude: number; longitude: number }>) => {
            return await GeocodingService.calculateRoute(coordinates);
        },
    });
}

/**
 * Hook para obtener el costo total de repostaje de un usuario
 */
export function useRefuelCostByUser(userId: string | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!userId;

    return useQuery({
        queryKey: ['refuelCostByUser', userId],
        queryFn: async () => {
            if (!userId) return null;
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/refuel/user/${userId}/total-cost`;
            console.log('Fetching refuel cost by user:', url);
            const response = await fetch(url, {
                headers: finalToken ? { Authorization: `Bearer ${finalToken}` } : undefined,
            });
            if (!response.ok) {
                throw new Error(`Error al obtener costos de repostaje: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Refuel cost by user data:', data);
            return data;
        },
        enabled,
    });
}

/**
 * Hook para obtener el costo total de repostaje de un viaje
 */
export function useRefuelCostByTrip(tripId: string | number | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!tripId;
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['refuelCostByTrip', tripId],
        queryFn: async () => {
            if (!tripId) return null;
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/refuel/trip/${tripId}/total-cost`;
            console.log('Fetching refuel cost by trip:', url);
            const response = await fetch(url, {
                headers: finalToken ? { Authorization: `Bearer ${finalToken}` } : undefined,
            });
            if (!response.ok) {
                throw new Error(`Error al obtener costos de repostaje del viaje: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Refuel cost by trip data:', data);
            return data;
        },
        enabled,
    });
}

/**
 * Hook para obtener el costo total de alojamiento de un viaje
 */
export function useAccommodationCostByTrip(tripId: string | number | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!tripId;

    console.log('[useAccommodationCostByTrip] Token from auth:', token ? 'exists' : 'missing');
    console.log('[useAccommodationCostByTrip] Final token:', finalToken ? 'exists' : 'missing');

    return useQuery({
        queryKey: ['accommodationCostByTrip', tripId],
        queryFn: async () => {
            if (!tripId) return { trip_id: tripId, total_cost: 0, accommodation_count: 0 };
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/accommodation/trip/${tripId}/total-cost`;
            console.log('Fetching accommodation cost by trip:', url, 'Token:', finalToken ? 'exists' : 'missing');
            try {
                const response = await fetch(url, {
                    headers: finalToken ? { Authorization: `Bearer ${finalToken}` } : undefined,
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Accommodation cost error response:', errorText);
                    // Retornar valor por defecto en caso de error
                    return { trip_id: tripId, total_cost: 0, accommodation_count: 0 };
                }
                const data = await response.json();
                console.log('Accommodation cost by trip data:', data);
                return data;
            } catch (error) {
                console.error('Accommodation cost fetch error:', error);
                return { trip_id: tripId, total_cost: 0, accommodation_count: 0 };
            }
        },
        enabled,
    });
}

/**
 * Hook para obtener el costo total de actividades (comida, etc) de un viaje
 */
export function useActivityCostByTrip(tripId: string | number | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!tripId;

    return useQuery({
        queryKey: ['activityCostByTrip', tripId],
        queryFn: async () => {
            if (!tripId) return null;
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/activity/trip/${tripId}/total-cost`;
            console.log('Fetching activity cost by trip:', url);
            const response = await fetch(url, {
                headers: finalToken ? { Authorization: `Bearer ${finalToken}` } : undefined,
            });
            if (!response.ok) {
                throw new Error(`Error al obtener costos de actividades del viaje: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Activity cost by trip data:', data);
            return data;
        },
        enabled,
    });
}

export default useItinerary;
