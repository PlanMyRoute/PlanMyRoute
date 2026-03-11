/**
 * Utilidad para buscar fotos de lugares usando Foursquare y Google Places API
 */

import { Coordinates } from '@planmyroute/types';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;

interface PlaceSearchResult {
    place_id: string;
    name: string;
    photos?: Array<{
        photo_reference: string;
        height: number;
        width: number;
    }>;
}

interface PlacesSearchResponse {
    results: PlaceSearchResult[];
    status: string;
}

/**
 * Busca un lugar por nombre y coordenadas usando Google Places API
 * @param name Nombre del lugar (ej: "Bar Manoli Teruel")
 * @param coordinates Coordenadas del lugar
 * @param radius Radio de búsqueda en metros (default: 50m)
 * @returns URL de la foto del lugar, o null si no se encuentra
 */
export async function searchPlacePhoto(
    name: string,
    coordinates: Coordinates,
    radius: number = 50
): Promise<string | null> {
    try {
        if (!GOOGLE_PLACES_API_KEY) {
            console.warn('GOOGLE_PLACES_API_KEY no está configurada');
            return null;
        }

        // 1. Buscar el lugar usando Text Search o Nearby Search
        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        searchUrl.searchParams.append('location', `${coordinates.latitude},${coordinates.longitude}`);
        searchUrl.searchParams.append('radius', radius.toString());
        searchUrl.searchParams.append('keyword', name);
        searchUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

        console.log(`Buscando foto para: "${name}" en (${coordinates.latitude}, ${coordinates.longitude})`);

        const searchResponse = await fetch(searchUrl.toString());
        const searchData: PlacesSearchResponse = await searchResponse.json();

        if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
            console.error(`Error en Places API: ${searchData.status}`);
            return null;
        }

        if (!searchData.results || searchData.results.length === 0) {
            console.log(`No se encontraron resultados para: "${name}"`);
            return null;
        }

        // 2. Obtener la primera foto del primer resultado
        const firstPlace = searchData.results[0];

        if (!firstPlace.photos || firstPlace.photos.length === 0) {
            console.log(`El lugar "${firstPlace.name}" no tiene fotos disponibles`);
            return null;
        }

        const photoReference = firstPlace.photos[0].photo_reference;

        // 3. Construir la URL de la foto
        const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
        photoUrl.searchParams.append('maxwidth', '800'); // Ancho máximo de la foto
        photoUrl.searchParams.append('photo_reference', photoReference);
        photoUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

        console.log(`✅ Foto encontrada para "${name}": ${firstPlace.name}`);
        return photoUrl.toString();

    } catch (error) {
        console.error('Error al buscar foto del lugar:', error);
        return null;
    }
}

/**
 * Busca un lugar usando Text Search (más flexible, busca por nombre completo)
 * @param query Consulta de búsqueda (ej: "Bar Manoli, Teruel")
 * @returns URL de la foto del lugar, o null si no se encuentra
 */
export async function searchPlacePhotoByQuery(query: string): Promise<string | null> {
    try {
        if (!GOOGLE_PLACES_API_KEY) {
            console.warn('GOOGLE_PLACES_API_KEY no está configurada');
            return null;
        }

        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
        searchUrl.searchParams.append('query', query);
        searchUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

        console.log(`Buscando foto por texto: "${query}"`);

        const searchResponse = await fetch(searchUrl.toString());
        const searchData: PlacesSearchResponse = await searchResponse.json();

        if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
            console.error(`Error en Places API: ${searchData.status}`);
            return null;
        }

        if (!searchData.results || searchData.results.length === 0) {
            console.log(`No se encontraron resultados para: "${query}"`);
            return null;
        }

        const firstPlace = searchData.results[0];

        if (!firstPlace.photos || firstPlace.photos.length === 0) {
            console.log(`El lugar "${firstPlace.name}" no tiene fotos disponibles`);
            return null;
        }

        const photoReference = firstPlace.photos[0].photo_reference;

        const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
        photoUrl.searchParams.append('maxwidth', '800');
        photoUrl.searchParams.append('photo_reference', photoReference);
        photoUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY);

        console.log(`✅ Foto encontrada para "${query}": ${firstPlace.name}`);
        return photoUrl.toString();

    } catch (error) {
        console.error('Error al buscar foto del lugar:', error);
        return null;
    }
}

// =============== FOURSQUARE API ===============

interface FoursquarePhoto {
    id: string;
    prefix: string;
    suffix: string;
    width: number;
    height: number;
}

interface FoursquarePlace {
    fsq_id: string;
    name: string;
    distance?: number;
    photos?: FoursquarePhoto[];
}

interface FoursquareSearchResponse {
    results: FoursquarePlace[];
}

interface FoursquarePlaceDetails {
    fsq_id: string;
    name: string;
    photos?: FoursquarePhoto[];
}

/**
 * Busca un lugar por nombre y coordenadas usando Foursquare Places API
 * @param name Nombre del lugar
 * @param coordinates Coordenadas del lugar
 * @param radius Radio de búsqueda en metros (default: 100m)
 * @returns URL de la foto del lugar, o null si no se encuentra
 */
export async function searchPlacePhotoFoursquare(
    name: string,
    coordinates: Coordinates,
    radius: number = 100
): Promise<string | null> {
    try {
        if (!FOURSQUARE_API_KEY) {
            console.warn('⚠️ FOURSQUARE_API_KEY no está configurada en .env');
            console.warn('📝 Configura FOURSQUARE_API_KEY=tu_api_key en el archivo .env');
            console.warn('🔗 Obtén tu API key en: https://location.foursquare.com/developer/');
            return null;
        }

        // 1. Buscar lugares cercanos
        const searchUrl = new URL('https://api.foursquare.com/v3/places/search');
        searchUrl.searchParams.append('ll', `${coordinates.latitude},${coordinates.longitude}`);
        searchUrl.searchParams.append('radius', radius.toString());
        searchUrl.searchParams.append('query', name);
        searchUrl.searchParams.append('limit', '1');
        searchUrl.searchParams.append('fields', 'fsq_id,name,distance');

        console.log(`🔍 Foursquare: Buscando "${name}" en (${coordinates.latitude}, ${coordinates.longitude})`);

        const searchResponse = await fetch(searchUrl.toString(), {
            headers: {
                'Authorization': FOURSQUARE_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            if (searchResponse.status === 401) {
                console.error(`❌ Foursquare API error 401: API Key inválida o no autorizada`);
                console.error(`📝 Verifica tu FOURSQUARE_API_KEY en el archivo .env`);
                console.error(`🔗 Regenera tu API key en: https://location.foursquare.com/developer/`);
            } else if (searchResponse.status === 410) {
                console.warn(`⚠️ Foursquare API error 410: Endpoint deprecado`);
                console.warn(`📚 Foursquare ha actualizado su API. Usando Google Places como alternativa.`);
            } else if (searchResponse.status === 429) {
                console.error(`⚠️ Foursquare API error 429: Límite de llamadas excedido`);
                console.error(`📊 Has superado las 50,000 llamadas/mes del plan gratuito`);
            } else {
                console.error(`❌ Foursquare API error: ${searchResponse.status}`);
            }
            return null;
        }

        const searchData: FoursquareSearchResponse = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            console.log(`Foursquare: No se encontraron resultados para "${name}"`);
            return null;
        }

        const place = searchData.results[0];

        // 2. Obtener fotos del lugar usando el endpoint de fotos
        const photosUrl = new URL(`https://api.foursquare.com/v3/places/${place.fsq_id}/photos`);
        photosUrl.searchParams.append('limit', '1');

        const photosResponse = await fetch(photosUrl.toString(), {
            headers: {
                'Authorization': FOURSQUARE_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!photosResponse.ok) {
            console.error(`Foursquare photos API error: ${photosResponse.status}`);
            return null;
        }

        const photosData: FoursquarePhoto[] = await photosResponse.json();

        if (!photosData || photosData.length === 0) {
            console.log(`Foursquare: "${place.name}" no tiene fotos`);
            return null;
        }

        // 3. Construir URL de la foto (usando tamaño 800x600)
        const photo = photosData[0];
        const photoUrl = `${photo.prefix}800x600${photo.suffix}`;

        console.log(`✅ Foursquare: Foto encontrada para "${name}": ${place.name}`);
        return photoUrl;

    } catch (error) {
        console.error('Error en Foursquare API:', error);
        return null;
    }
}

/**
 * Busca un lugar usando texto y coordenadas opcionales (Foursquare)
 * @param query Consulta de búsqueda
 * @param coordinates Coordenadas opcionales para mejor precisión
 * @returns URL de la foto del lugar, o null si no se encuentra
 */
export async function searchPlacePhotoByQueryFoursquare(
    query: string,
    coordinates?: Coordinates
): Promise<string | null> {
    try {
        if (!FOURSQUARE_API_KEY) {
            console.warn('⚠️ FOURSQUARE_API_KEY no está configurada');
            return null;
        }

        const searchUrl = new URL('https://api.foursquare.com/v3/places/search');
        searchUrl.searchParams.append('query', query);
        searchUrl.searchParams.append('limit', '1');
        searchUrl.searchParams.append('fields', 'fsq_id,name,distance');

        if (coordinates) {
            searchUrl.searchParams.append('ll', `${coordinates.latitude},${coordinates.longitude}`);
        }

        console.log(`🔍 Foursquare: Búsqueda por texto "${query}"`);

        const searchResponse = await fetch(searchUrl.toString(), {
            headers: {
                'Authorization': FOURSQUARE_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            if (searchResponse.status === 401) {
                console.error(`❌ Foursquare API Key inválida (error 401)`);
            } else if (searchResponse.status === 410) {
                console.warn(`⚠️ Foursquare endpoint deprecado (error 410)`);
            } else if (searchResponse.status === 429) {
                console.error(`⚠️ Límite de llamadas Foursquare excedido (error 429)`);
            } else {
                console.error(`❌ Foursquare API error: ${searchResponse.status}`);
            }
            return null;
        }

        const searchData: FoursquareSearchResponse = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            console.log(`Foursquare: No se encontraron resultados para "${query}"`);
            return null;
        }

        const place = searchData.results[0];

        // Obtener fotos usando el endpoint específico
        const photosUrl = new URL(`https://api.foursquare.com/v3/places/${place.fsq_id}/photos`);
        photosUrl.searchParams.append('limit', '1');

        const photosResponse = await fetch(photosUrl.toString(), {
            headers: {
                'Authorization': FOURSQUARE_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!photosResponse.ok) {
            console.error(`Foursquare photos API error: ${photosResponse.status}`);
            return null;
        }

        const photosData: FoursquarePhoto[] = await photosResponse.json();

        if (!photosData || photosData.length === 0) {
            console.log(`Foursquare: "${place.name}" no tiene fotos`);
            return null;
        }

        const photo = photosData[0];
        const photoUrl = `${photo.prefix}800x600${photo.suffix}`;

        console.log(`✅ Foursquare: Foto encontrada para "${query}": ${place.name}`);
        return photoUrl;

    } catch (error) {
        console.error('Error en Foursquare API:', error);
        return null;
    }
}

/**
 * Busca foto usando estrategia combinada: Foursquare primero, Google Places como fallback
 * @param name Nombre del lugar
 * @param coordinates Coordenadas del lugar
 * @param address Dirección del lugar (opcional)
 * @param radius Radio de búsqueda en metros
 * @returns URL de la foto, o null si no se encuentra
 */
export async function searchPlacePhotoSmart(
    name: string,
    coordinates: Coordinates,
    address?: string,
    radius: number = 100
): Promise<string | null> {
    console.log(`🎯 Búsqueda con Google Places para: "${name}"`);

    // Verificar si Google Places está configurado
    if (!GOOGLE_PLACES_API_KEY) {
        console.warn('⚠️ GOOGLE_PLACES_API_KEY no está configurada en .env');
        console.warn('📝 Configura GOOGLE_PLACES_API_KEY=tu_api_key en el archivo .env');
        console.warn('🔗 Obtén tu API key en: https://console.cloud.google.com/');
        return null;
    }

    let photoUrl: string | null = null;

    // 1. Intentar búsqueda por coordenadas
    photoUrl = await searchPlacePhoto(name, coordinates, radius);

    if (photoUrl) {
        console.log(`✅ Foto obtenida de Google Places (búsqueda por coordenadas)`);
        return photoUrl;
    }

    // 2. Intentar búsqueda por texto si hay dirección
    if (address) {
        const searchQuery = `${name}, ${address}`;
        photoUrl = await searchPlacePhotoByQuery(searchQuery);

        if (photoUrl) {
            console.log(`✅ Foto obtenida de Google Places (búsqueda por texto)`);
            return photoUrl;
        }
    }

    console.log(`❌ No se encontró foto para: "${name}"`);
    return null;
}
