/**
 * Utilidad para obtener información de precios de lugares usando Google Places API
 */

import { Coordinates } from '@planmyroute/types';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

interface PlaceDetailResult {
    place_id: string;
    name: string;
    formatted_address: string;
    types: string[];
    price_level?: number; // 0-4 (free, inexpensive, moderate, expensive, very expensive)
    rating?: number;
    user_ratings_total?: number;
    website?: string;
    formatted_phone_number?: string;
    opening_hours?: {
        open_now: boolean;
        weekday_text: string[];
    };
}

interface PlaceDetailsResponse {
    result?: PlaceDetailResult;
    status: string;
}

interface PlaceSearchResult {
    place_id: string;
    name: string;
    types?: string[];
    price_level?: number;
    rating?: number;
}

interface PlacesSearchResponse {
    results: PlaceSearchResult[];
    status: string;
}

/**
 * Obtiene el nivel de precio ($$$) de un lugar usando Google Places API
 * @param name Nombre del lugar
 * @param coordinates Coordenadas del lugar
 * @param address Dirección del lugar (opcional)
 * @returns Objeto con información de precio y detalles, o null si no se encuentra
 */
export async function getPlacePrice(
    name: string,
    coordinates: Coordinates,
    address?: string
): Promise<{
    price_level?: number;
    price_symbol?: string;
    estimated_price?: string;
    rating?: number;
    reviews_count?: number;
    place_id?: string;
} | null> {
    try {
        if (!GOOGLE_PLACES_API_KEY) {
            console.warn('⚠️ GOOGLE_PLACES_API_KEY no está configurada');
            return null;
        }

        // Intentar obtener el place_id primero con una búsqueda cercana
        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        searchUrl.searchParams.append('location', `${coordinates.latitude},${coordinates.longitude}`);
        searchUrl.searchParams.append('radius', '100'); // Buscar en un radio de 100m
        searchUrl.searchParams.append('keyword', name);
        searchUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

        console.log(`🔍 Buscando información de precio para: "${name}"`);

        const searchResponse = await fetch(searchUrl.toString());
        const searchData: PlacesSearchResponse = await searchResponse.json();

        if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
            console.warn(`⚠️ Error en Places API (search): ${searchData.status}`);
            return null;
        }

        if (!searchData.results || searchData.results.length === 0) {
            console.log(`⚠️ No se encontraron resultados para: "${name}"`);
            return null;
        }

        // Usar el primer resultado
        const place = searchData.results[0];
        const placeId = place.place_id;

        // Ahora obtener los detalles completos del lugar incluyendo precio
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.append('place_id', placeId);
        detailsUrl.searchParams.append('fields', 'price_level,rating,user_ratings_total,formatted_address,website,opening_hours');
        detailsUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

        const detailsResponse = await fetch(detailsUrl.toString());
        const detailsData: PlaceDetailsResponse = await detailsResponse.json();

        if (detailsData.status !== 'OK') {
            console.warn(`⚠️ Error en Places API (details): ${detailsData.status}`);
            // Retornar al menos lo que tenemos del búsqueda
            return {
                price_level: place.price_level,
                price_symbol: place.price_level ? getPriceSymbol(place.price_level) : undefined,
                rating: place.rating,
                reviews_count: undefined,
                place_id: placeId
            };
        }

        const details = detailsData.result;
        if (!details) {
            return null;
        }

        // Crear estimación de precio basada en el nivel
        const priceInfo = {
            price_level: details.price_level,
            price_symbol: details.price_level ? getPriceSymbol(details.price_level) : undefined,
            estimated_price: details.price_level ? getEstimatedPrice(details.price_level) : 'Precio desconocido',
            rating: details.rating,
            reviews_count: details.user_ratings_total,
            place_id: placeId
        };

        console.log(`✅ Información de precio obtenida:`, priceInfo);
        return priceInfo;

    } catch (error) {
        console.error('❌ Error al obtener información de precio del lugar:', error);
        return null;
    }
}

/**
 * Convierte el nivel de precio (0-4) a símbolo ($, $$, etc.)
 */
function getPriceSymbol(priceLevel: number): string {
    const symbols = ['Gratis', '$', '$$', '$$$', '$$$$'];
    return symbols[priceLevel] || 'Desconocido';
}

/**
 * Genera una estimación de precio en euros basada en el nivel de precio
 */
function getEstimatedPrice(priceLevel: number): string {
    const estimates: Record<string, string> = {
        '0': 'Gratis',
        '1': '0 - 15€',
        '2': '15 - 50€',
        '3': '50 - 150€',
        '4': '150€+'
    };
    return estimates[String(priceLevel)] || 'Precio desconocido';
}

/**
 * Obtiene información de precios para múltiples lugares
 * @param stops Array de paradas con nombre y coordenadas
 * @returns Array con información de precios para cada parada
 */
export async function getMultiplePlacesPrices(
    stops: Array<{
        id: string | number;
        name: string;
        coordinates: Coordinates;
        address?: string;
    }>
): Promise<
    Record<
        string | number,
        {
            price_level?: number;
            price_symbol?: string;
            estimated_price?: string;
            rating?: number;
            reviews_count?: number;
            place_id?: string;
        } | null
    >
> {
    const pricesMap: Record<string | number, any> = {};

    for (const stop of stops) {
        try {
            const price = await getPlacePrice(stop.name, stop.coordinates, stop.address);
            pricesMap[stop.id] = price;
            // Pequeño delay para no exceder rate limits de Google
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`Error obteniendo precio para parada ${stop.id}:`, error);
            pricesMap[stop.id] = null;
        }
    }

    return pricesMap;
}
