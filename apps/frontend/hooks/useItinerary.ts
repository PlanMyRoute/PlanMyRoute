import { useAuth } from '@/context/AuthContext';
import { Accommodation, Activity, Refuel, Route, Stop } from '@planmyroute/types';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';
import { GeocodingService, ItineraryService } from '../services/itineraryService';

const TRIP_STALE_TIME = 30_000;

/**
 * Delay tras el cual se re-invalidan las paradas para recoger el enriquecimiento
 * en background del backend (foto + precio de Google Places), que se completa
 * ~1-2 s después de crear la parada.
 */
const ENRICHMENT_REFETCH_DELAY_MS = 2500;

/**
 * Invalida las queries de paradas/itinerario inmediatamente y de nuevo tras
 * ENRICHMENT_REFETCH_DELAY_MS, para reflejar foto/precio que el backend rellena
 * de forma asíncrona después de crear una parada.
 */
function invalidateStopQueries(
    queryClient: QueryClient,
    tripId: string,
    extraKeys: readonly (readonly unknown[])[] = [],
) {
    const run = () => {
        queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
        queryClient.invalidateQueries({ queryKey: ['stops', tripId] });
        queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'stops'] });
        for (const key of extraKeys) {
            queryClient.invalidateQueries({ queryKey: key });
        }
    };
    run();
    setTimeout(run, ENRICHMENT_REFETCH_DELAY_MS);
}

// =============== OPTIMISTIC CACHE HELPERS ===============

type ItineraryCache = Array<Route & { stops: Stop[] }>;

/** Instantánea de ambas caches (paradas + itinerario) para poder revertir. */
type StopCacheSnapshot = {
    stops: Stop[] | undefined;
    itinerary: ItineraryCache | undefined;
};

const stopsKey = (tripId: string) => ['stops', tripId] as const;
const itineraryKey = (tripId: string) => ['itinerary', tripId] as const;

/** Cancela refetches en curso para que no pisen la actualización optimista. */
async function cancelStopQueries(queryClient: QueryClient, tripId: string) {
    await Promise.all([
        queryClient.cancelQueries({ queryKey: stopsKey(tripId) }),
        queryClient.cancelQueries({ queryKey: itineraryKey(tripId) }),
    ]);
}

function snapshotStopCaches(queryClient: QueryClient, tripId: string): StopCacheSnapshot {
    return {
        stops: queryClient.getQueryData<Stop[]>(stopsKey(tripId)),
        itinerary: queryClient.getQueryData<ItineraryCache>(itineraryKey(tripId)),
    };
}

function restoreStopCaches(queryClient: QueryClient, tripId: string, snapshot: StopCacheSnapshot) {
    queryClient.setQueryData(stopsKey(tripId), snapshot.stops);
    queryClient.setQueryData(itineraryKey(tripId), snapshot.itinerary);
}

/** Elimina una parada de ambas caches de forma inmediata. */
function removeStopFromCaches(queryClient: QueryClient, tripId: string, stopId: string | number) {
    const idStr = String(stopId);
    queryClient.setQueryData<Stop[]>(stopsKey(tripId), (old) =>
        old ? old.filter((s) => String(s.id) !== idStr) : old,
    );
    queryClient.setQueryData<ItineraryCache>(itineraryKey(tripId), (old) =>
        old
            ? old.map((route) => ({
                  ...route,
                  stops: (route.stops ?? []).filter((s) => String(s.id) !== idStr),
              }))
            : old,
    );
}

/** Aplica un patch parcial a una parada en ambas caches de forma inmediata. */
function patchStopInCaches(
    queryClient: QueryClient,
    tripId: string,
    stopId: string | number,
    patch: Partial<Stop>,
) {
    const idStr = String(stopId);
    queryClient.setQueryData<Stop[]>(stopsKey(tripId), (old) =>
        old ? old.map((s) => (String(s.id) === idStr ? { ...s, ...patch } : s)) : old,
    );
    queryClient.setQueryData<ItineraryCache>(itineraryKey(tripId), (old) =>
        old
            ? old.map((route) => ({
                  ...route,
                  stops: (route.stops ?? []).map((s) =>
                      String(s.id) === idStr ? { ...s, ...patch } : s,
                  ),
              }))
            : old,
    );
}

// =============== TYPES ===============

type RefuelCostByUserResponse = { user_id: string; total_cost: number; refuel_count: number; trips_count: number };
type RefuelCostByTripResponse = { trip_id: number; total_cost: number; refuel_count: number };
type AccommodationCostByTripResponse = { trip_id: number; total_cost: number; accommodation_count: number };
type ActivityCostByTripResponse = { trip_id: number; total_cost: number; activity_count: number };

type UseItineraryOptions = {
    token?: string;
    enabled?: boolean;
    refetchInterval?: number | false;
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
        staleTime: TRIP_STALE_TIME,
        gcTime: 5 * 60 * 1000,
        refetchInterval: options?.refetchInterval ?? false,
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
        onSuccess: () => invalidateStopQueries(queryClient, tripId),
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
        onSuccess: () =>
            invalidateStopQueries(queryClient, tripId, [['activityCostByTrip', tripId]]),
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
        onSuccess: () =>
            invalidateStopQueries(queryClient, tripId, [['accommodationCostByTrip', tripId]]),
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
        onSuccess: () =>
            invalidateStopQueries(queryClient, tripId, [
                ['refuelCostByTrip', tripId],
                ['refuelCostByUser'],
            ]),
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
        // Edición optimista: los cambios (nombre, dirección, descripción…) se
        // reflejan al instante y se revierten si la petición falla.
        onMutate: async ({ stopId, stopData }): Promise<StopCacheSnapshot | undefined> => {
            if (!tripId) return undefined;
            await cancelStopQueries(queryClient, tripId);
            const snapshot = snapshotStopCaches(queryClient, tripId);
            patchStopInCaches(queryClient, tripId, stopId, stopData);
            return snapshot;
        },
        onError: (_err, _vars, context) => {
            if (tripId && context) restoreStopCaches(queryClient, tripId, context);
        },
        onSettled: () => {
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
        // Borrado optimista: la parada desaparece de la lista al instante y se
        // restaura si la petición falla.
        onMutate: async (stopId): Promise<StopCacheSnapshot | undefined> => {
            if (!tripId) return undefined;
            await cancelStopQueries(queryClient, tripId);
            const snapshot = snapshotStopCaches(queryClient, tripId);
            removeStopFromCaches(queryClient, tripId, stopId);
            return snapshot;
        },
        onError: (_err, _stopId, context) => {
            if (tripId && context) restoreStopCaches(queryClient, tripId, context);
        },
        onSettled: () => {
            if (tripId) {
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

    return useQuery<RefuelCostByUserResponse>({
        queryKey: ['refuelCostByUser', userId],
        queryFn: () => apiFetch<RefuelCostByUserResponse>(`/api/refuel/user/${userId}/total-cost`, { token: finalToken || undefined }),
        enabled,
        staleTime: TRIP_STALE_TIME,
    });
}

/**
 * Hook para obtener el costo total de repostaje de un viaje
 */
export function useRefuelCostByTrip(tripId: string | number | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!tripId;

    return useQuery<RefuelCostByTripResponse>({
        queryKey: ['refuelCostByTrip', tripId],
        queryFn: () => apiFetch<RefuelCostByTripResponse>(`/api/refuel/trip/${tripId}/total-cost`, { token: finalToken || undefined }),
        enabled,
        staleTime: TRIP_STALE_TIME,
    });
}

/**
 * Hook para obtener el costo total de alojamiento de un viaje
 */
export function useAccommodationCostByTrip(tripId: string | number | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!tripId;

    return useQuery<AccommodationCostByTripResponse>({
        queryKey: ['accommodationCostByTrip', tripId],
        queryFn: async () => {
            try {
                return await apiFetch<AccommodationCostByTripResponse>(`/api/accommodation/trip/${tripId}/total-cost`, { token: finalToken || undefined });
            } catch {
                return { trip_id: Number(tripId), total_cost: 0, accommodation_count: 0 };
            }
        },
        enabled,
        staleTime: TRIP_STALE_TIME,
    });
}

/**
 * Hook para obtener el costo total de actividades (comida, etc) de un viaje
 */
export function useActivityCostByTrip(tripId: string | number | null | undefined, options?: UseItineraryOptions) {
    const { token } = useAuth();
    const finalToken = options?.token || token;
    const enabled = options?.enabled !== false && !!tripId;

    return useQuery<ActivityCostByTripResponse>({
        queryKey: ['activityCostByTrip', tripId],
        queryFn: () => apiFetch<ActivityCostByTripResponse>(`/api/activity/trip/${tripId}/total-cost`, { token: finalToken || undefined }),
        enabled,
        staleTime: TRIP_STALE_TIME,
    });
}

export default useItinerary;
