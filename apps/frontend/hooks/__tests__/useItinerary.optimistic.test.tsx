import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Stop } from '@planmyroute/types';
import { useDeleteStop, useUpdateStop } from '../useItinerary';
import { ItineraryService } from '../../services/itineraryService';

jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ token: 'test-token' }),
}));

jest.mock('../../services/itineraryService', () => ({
    ItineraryService: {
        deleteStop: jest.fn(),
        updateStop: jest.fn(),
    },
    GeocodingService: {},
}));

const mockedService = ItineraryService as jest.Mocked<typeof ItineraryService>;

const TRIP_ID = '42';

function makeStop(id: number, name: string): Stop {
    return { id, name } as unknown as Stop;
}

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
}

describe('useItinerary optimistic mutations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('useDeleteStop elimina la parada de la caché al instante (optimista)', async () => {
        const { queryClient, wrapper } = createWrapper();
        queryClient.setQueryData<Stop[]>(['stops', TRIP_ID], [makeStop(1, 'A'), makeStop(2, 'B')]);

        // La petición nunca resuelve durante la comprobación optimista.
        let resolveDelete: (v?: unknown) => void = () => {};
        mockedService.deleteStop.mockReturnValue(new Promise<any>((r) => (resolveDelete = r)));

        const { result } = renderHook(() => useDeleteStop(TRIP_ID), { wrapper });

        act(() => {
            result.current.mutate('1');
        });

        // Antes de que la promesa resuelva, la parada ya no está en la caché.
        await waitFor(() => {
            expect(queryClient.getQueryData<Stop[]>(['stops', TRIP_ID])).toEqual([makeStop(2, 'B')]);
        });

        resolveDelete(undefined);
    });

    it('useDeleteStop restaura la caché si la petición falla (rollback)', async () => {
        const { queryClient, wrapper } = createWrapper();
        const initial = [makeStop(1, 'A'), makeStop(2, 'B')];
        queryClient.setQueryData<Stop[]>(['stops', TRIP_ID], initial);

        mockedService.deleteStop.mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useDeleteStop(TRIP_ID), { wrapper });

        act(() => {
            result.current.mutate('1');
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(queryClient.getQueryData<Stop[]>(['stops', TRIP_ID])).toEqual(initial);
    });

    it('useUpdateStop aplica el patch a la caché al instante (optimista)', async () => {
        const { queryClient, wrapper } = createWrapper();
        queryClient.setQueryData<Stop[]>(['stops', TRIP_ID], [makeStop(1, 'Viejo'), makeStop(2, 'B')]);

        let resolveUpdate: (v?: unknown) => void = () => {};
        mockedService.updateStop.mockReturnValue(new Promise<any>((r) => (resolveUpdate = r)));

        const { result } = renderHook(() => useUpdateStop(TRIP_ID), { wrapper });

        act(() => {
            result.current.mutate({ stopId: '1', stopData: { name: 'Nuevo' } });
        });

        await waitFor(() => {
            const stops = queryClient.getQueryData<Stop[]>(['stops', TRIP_ID]);
            expect(stops?.find((s) => s.id === 1)?.name).toBe('Nuevo');
        });

        resolveUpdate(undefined);
    });
});
