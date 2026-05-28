import { useAuth } from '@/context/AuthContext';
import { EventService, TmEvent } from '@/services/eventService';
import { Stop } from '@planmyroute/types';
import { useQuery } from '@tanstack/react-query';

interface UseNearbyRouteEventsOptions {
    enabled?: boolean;
    startDate?: string | null;
}

function extractCity(address: string | null): string {
    if (!address) return '';
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts[0] ?? '';
}

function stopDate(startDate: string, day: number | null): string {
    if (!day || day < 1) return startDate.split('T')[0];
    const base = new Date(startDate);
    base.setDate(base.getDate() + day - 1);
    return base.toISOString().split('T')[0];
}

export function buildNearStopsInput(stops: Stop[], tripStartDate: string) {
    const EXCLUDE_TYPES = new Set(['origen', 'destino', 'refuel']);
    return stops
        .filter((s) => !EXCLUDE_TYPES.has(s.type) && s.address)
        .map((s) => ({
            city: extractCity(s.address),
            date: stopDate(tripStartDate, s.day),
            countryCode: undefined as string | undefined,
        }))
        .filter((s) => s.city.length > 0);
}

export function useNearbyRouteEvents(
    stops: Stop[] | null | undefined,
    tripStartDate: string | null | undefined,
    options?: UseNearbyRouteEventsOptions,
) {
    const { token } = useAuth();

    const nearStops =
        stops && tripStartDate ? buildNearStopsInput(stops, tripStartDate) : [];

    const enabled = (options?.enabled ?? false) && nearStops.length > 0;

    const query = useQuery<TmEvent[], Error>({
        queryKey: ['nearbyRouteEvents', tripStartDate, nearStops.map((s) => `${s.city}|${s.date}`).join(',')],
        queryFn: () => EventService.getNearStops(nearStops, { token: token || undefined }),
        enabled,
        staleTime: 2 * 60 * 60 * 1000,
        gcTime: 2 * 60 * 60 * 1000,
    });

    return {
        events: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
