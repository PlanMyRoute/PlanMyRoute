// Nominatim usage policy caps external clients at 1 request/second per IP.
// Centralizing every outbound call here lets us serialize requests through
// a single throttled queue and cache results, instead of each route handler
// hitting Nominatim independently and risking 403/429 responses under load.

const NOMINATIM_USER_AGENT = 'PlanMyRoute/1.0 (dev.planmyroute@gmail.com)';
const MIN_REQUEST_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type QueueTask = {
    run: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
};

const queue: QueueTask[] = [];
let lastRequestAt = 0;
let processing = false;

async function processQueue(): Promise<void> {
    if (processing) return;
    processing = true;
    try {
        while (queue.length > 0) {
            const task = queue.shift();
            if (!task) continue;
            const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
            if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
            lastRequestAt = Date.now();
            try {
                task.resolve(await task.run());
            } catch (error) {
                task.reject(error);
            }
        }
    } finally {
        processing = false;
    }
}

function enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        queue.push({ run, resolve: resolve as (value: unknown) => void, reject });
        void processQueue();
    });
}

type CacheEntry = { value: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return entry.value as T;
}

function setCached(key: string, value: unknown): void {
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchFromNominatim(url: string, extraHeaders?: Record<string, string>): Promise<Response> {
    const response = await fetch(url, {
        headers: { 'User-Agent': NOMINATIM_USER_AGENT, ...extraHeaders },
    });
    if (!response.ok) {
        console.error(`Nominatim request failed (${response.status} ${response.statusText}): ${url}`);
    }
    return response;
}

export type NominatimSearchResult = {
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
};

export type NominatimReverseResult = {
    display_name: string;
};

/**
 * Búsqueda directa (autocomplete/geocoding) en Nominatim, con caché por
 * query+idioma y paso por la cola con limitación de tasa.
 */
export async function searchPlaces(query: string, language: string): Promise<NominatimSearchResult[]> {
    const cacheKey = `search:${language}:${query.trim().toLowerCase()}`;
    const cached = getCached<NominatimSearchResult[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '6',
        'accept-language': language,
    });

    const results = await enqueue(async () => {
        const response = await fetchFromNominatim(
            `https://nominatim.openstreetmap.org/search?${params}`,
            { 'Accept-Language': language }
        );
        if (!response.ok) return [] as NominatimSearchResult[];
        return (await response.json()) as NominatimSearchResult[];
    });

    setCached(cacheKey, results);
    return results;
}

/**
 * Geocodificación inversa en Nominatim, con caché por coordenadas redondeadas
 * a ~4 decimales (~11m de precisión) y paso por la cola con limitación de tasa.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<NominatimReverseResult | null> {
    const roundedLat = lat.toFixed(4);
    const roundedLng = lng.toFixed(4);
    const cacheKey = `reverse:${roundedLat}:${roundedLng}`;
    const cached = getCached<NominatimReverseResult | null>(cacheKey);
    if (cached !== undefined) return cached;

    const params = new URLSearchParams({
        lat: roundedLat,
        lon: roundedLng,
        format: 'json',
        'accept-language': 'es',
    });

    const result = await enqueue(async () => {
        const response = await fetchFromNominatim(`https://nominatim.openstreetmap.org/reverse?${params}`);
        if (!response.ok) return null;
        const data = (await response.json()) as NominatimReverseResult;
        return data ?? null;
    });

    setCached(cacheKey, result);
    return result;
}
