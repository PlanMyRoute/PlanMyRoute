import { useAuth } from "@/context/AuthContext";
import { EventService, EventsPage, TmEvent } from "@/services/eventService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

/**
 * Hook para obtener eventos paginados con scroll infinito y filtros opcionales.
 * @param params - Filtros opcionales: código de país, palabra clave y coordenadas geográficas.
 * @returns Resultado de useInfiniteQuery con páginas de eventos.
 */
export function useEvents(
  params: {
    countryCode?: string;
    keyword?: string;
    lat?: number;
    lng?: number;
  } = {},
) {
  const { token } = useAuth();

  return useInfiniteQuery<EventsPage, Error>({
    queryKey: [
      "events",
      params.countryCode,
      params.keyword,
      params.lat,
      params.lng,
    ],
    queryFn: ({ pageParam = 0 }) =>
      EventService.getEvents(
        { page: pageParam as number, ...params },
        { token: token ?? undefined },
      ),
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
    initialPageParam: 0,
    staleTime: 60 * 60 * 1000, // 1h — los eventos no cambian frecuentemente
  });
}

/**
 * Hook para obtener un evento individual por su ID.
 * @param eventId - ID del evento a obtener. Si es `null`, la query no se ejecuta.
 * @returns Resultado de useQuery con los datos del evento.
 */
export function useEvent(eventId: string | null) {
  const { token } = useAuth();

  return useQuery<TmEvent, Error>({
    queryKey: ["event", eventId],
    queryFn: () =>
      EventService.getEventById(eventId!, { token: token ?? undefined }),
    enabled: Boolean(eventId),
    staleTime: 30 * 60 * 1000,
  });
}
