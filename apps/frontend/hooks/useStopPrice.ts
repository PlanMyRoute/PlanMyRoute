import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';

export interface StopPriceInfo {
    price_level?: number;
    price_symbol?: string;
    estimated_price?: string;
    rating?: number;
    reviews_count?: number;
    place_id?: string;
}

export interface StopPriceResponse {
    stopId: string;
    name: string;
    priceInfo: StopPriceInfo | null;
}

/**
 * Hook para obtener el precio de una parada
 * Primero verifica si la parada ya tiene información de precio guardada
 * Si no, intenta obtenerla del endpoint de API
 * 
 * @param stopId ID de la parada
 * @param stopData Datos locales de la parada (pueden contener precio ya guardado)
 * @param enabled Si está habilitado (default: true)
 */
export function useStopPrice(
    stopId: string | number, 
    stopData?: any,
    enabled: boolean = true
) {
    const { token } = useAuth();

    // Extraer información de precio de los datos locales si existe
    const localPriceInfo = stopData ? {
        price_level: stopData.price_level,
        price_symbol: stopData.price_symbol,
        estimated_price: stopData.estimated_price,
        rating: stopData.place_rating,
        reviews_count: stopData.place_reviews_count,
        place_id: stopData.google_place_id,
    } : null;

    // Si ya tenemos precio guardado localmente, usarlo inmediatamente
    if (localPriceInfo && Object.values(localPriceInfo).some(v => v !== undefined && v !== null)) {
        return {
            priceInfo: localPriceInfo,
            isLoading: false,
            error: null,
            refetch: () => Promise.resolve(),
        };
    }

    // Si no tenemos precio local, intentar obtenerlo del API
    const query = useQuery<StopPriceResponse, Error>({
        queryKey: ['stopPrice', stopId],
        queryFn: async () => {
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/stop/${stopId}/price`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
            );

            if (!response.ok) {
                return {
                    stopId: String(stopId),
                    name: '',
                    priceInfo: null
                };
            }

            return await response.json();
        },
        enabled: !!stopId && enabled && !localPriceInfo,
        staleTime: 1000 * 60 * 60, // 1 hora
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
    });

    return {
        priceInfo: query.data?.priceInfo ?? null,
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: () => query.refetch(),
    };
}
