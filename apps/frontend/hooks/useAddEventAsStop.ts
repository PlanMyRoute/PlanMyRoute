import { TmEvent } from '@/services/eventService';
import { useCallback, useState } from 'react';
import { useCreateActivityStop } from './useItinerary';

function segmentToCategory(segment: string | null): string {
    switch (segment) {
        case 'Music':          return 'concierto';
        case 'Sports':         return 'deportes';
        case 'Arts & Theatre': return 'teatro';
        default:               return 'experiencia_local';
    }
}

function eventDayInTrip(eventDate: string | null, tripStartDate: string): number {
    if (!eventDate) return 1;
    const start = new Date(tripStartDate);
    const evDate = new Date(eventDate + 'T00:00:00');
    start.setHours(0, 0, 0, 0);
    evDate.setHours(0, 0, 0, 0);
    const diff = Math.round((evDate.getTime() - start.getTime()) / 86400000);
    return Math.max(1, diff + 1);
}

/**
 * Crea una parada de tipo "actividad" directamente a partir de un evento de
 * Ticketmaster — sin pasar por el formulario de nueva parada — calculando el día
 * del viaje según la fecha del evento. Compartido entre la pestaña de paradas y
 * el mapa del viaje (capa de eventos cercanos).
 */
export function useAddEventAsStop(tripId: string) {
    const [addingEventId, setAddingEventId] = useState<string | null>(null);
    const createActivityStop = useCreateActivityStop(tripId);

    const addEventAsStop = useCallback(async (event: TmEvent, tripStartDate: string | null | undefined) => {
        if (!tripStartDate || addingEventId) return;
        setAddingEventId(event.id);
        const day = eventDayInTrip(event.date, tripStartDate);
        const address = [event.venue?.address, event.venue?.city, event.venue?.country].filter(Boolean).join(', ');
        try {
            await createActivityStop.mutateAsync({
                stopData: {
                    name: event.name,
                    address: address || null,
                    description: event.segment ? `${event.segment}${event.genre ? ` · ${event.genre}` : ''}` : null,
                    type: 'intermedia',
                    day,
                } as any,
                activityData: {
                    category: segmentToCategory(event.segment) as any,
                    entry_price: event.priceMin ?? null,
                    booking_required: true,
                    estimated_duration_minutes: 180,
                    url: event.url ?? null,
                } as any,
            });
        } finally {
            setAddingEventId(null);
        }
    }, [addingEventId, createActivityStop]);

    return { addingEventId, addEventAsStop };
}
