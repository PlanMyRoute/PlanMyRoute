import { useAuth } from '@/context/AuthContext';
import { EventService, EventsPage, TmEvent } from '@/services/eventService';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export function useEvents(params: { countryCode?: string; keyword?: string } = {}) {
    const { token } = useAuth();

    return useInfiniteQuery<EventsPage, Error>({
        queryKey: ['events', params.countryCode, params.keyword],
        queryFn: ({ pageParam = 0 }) =>
            EventService.getEvents({ page: pageParam as number, ...params }, { token }),
        getNextPageParam: (last) =>
            last.page + 1 < last.totalPages ? last.page + 1 : undefined,
        initialPageParam: 0,
        staleTime: 60 * 60 * 1000, // 1h — los eventos no cambian frecuentemente
    });
}

export function useEvent(eventId: string | null) {
    const { token } = useAuth();

    return useQuery<TmEvent, Error>({
        queryKey: ['event', eventId],
        queryFn: () => EventService.getEventById(eventId!, { token }),
        enabled: Boolean(eventId),
        staleTime: 30 * 60 * 1000,
    });
}
