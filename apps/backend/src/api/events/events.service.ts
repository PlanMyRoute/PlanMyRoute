import fetch from 'node-fetch';

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2';
const TM_KEY = process.env.TICKETMASTER_API_KEY!;

// Géneros musicales principales (Rock, Pop, Hip-Hop/Rap, R&B, Electronic, Latin, Country)
const MAJOR_MUSIC_GENRE_IDS = [
    'KnvZfZ7vAeA', // Rock
    'KnvZfZ7vAev', // Pop
    'KnvZfZ7vAvt', // Hip-Hop/Rap
    'KnvZfZ7vAee', // R&B
    'KnvZfZ7vAvF', // Electronic/Dance
    'KnvZfZ7vAe6', // Latin
    'KnvZfZ7vAv6', // Country
].join(',');

interface CacheEntry {
    data: unknown;
    expires: number;
}
const cache = new Map<string, CacheEntry>();

function fromCache<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data as T;
    return null;
}

function setCache(key: string, data: unknown, ttlMs = 60 * 60 * 1000) {
    cache.set(key, { data, expires: Date.now() + ttlMs });
}

function normalizeEvent(event: any) {
    if (!event) return null;
    const venue = event._embedded?.venues?.[0];
    const image =
        event.images?.find((img: any) => img.ratio === '16_9' && img.width >= 640) ||
        event.images?.[0];
    const priceRange = event.priceRanges?.[0];
    const classification = event.classifications?.[0];

    return {
        id: event.id as string,
        name: event.name as string,
        url: event.url as string | null,
        image: (image?.url as string) || null,
        date: event.dates?.start?.localDate as string | null,
        time: event.dates?.start?.localTime as string | null,
        status: (event.dates?.status?.code as string) || 'onsale',
        venue: venue
            ? {
                  name: (venue.name as string) || null,
                  city: (venue.city?.name as string) || null,
                  country: (venue.country?.name as string) || null,
                  countryCode: (venue.country?.countryCode as string) || null,
                  address: (venue.address?.line1 as string) || null,
                  coordinates:
                      venue.location
                          ? {
                                lat: parseFloat(venue.location.latitude as string),
                                lng: parseFloat(venue.location.longitude as string),
                            }
                          : null,
              }
            : null,
        artists: ((event._embedded?.attractions as any[]) || []).map((a: any) => ({
            id: a.id as string,
            name: a.name as string,
            image: (a.images?.[0]?.url as string) || null,
        })),
        segment: (classification?.segment?.name as string) || null,
        genre: (classification?.genre?.name as string) || null,
        priceMin: priceRange?.min != null ? Number(priceRange.min) : null,
        priceMax: priceRange?.max != null ? Number(priceRange.max) : null,
        currency: (priceRange?.currency as string) || null,
    };
}

async function fetchTM(url: URL) {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Ticketmaster API error: ${res.status}`);
    return res.json() as Promise<any>;
}

export interface GetEventsParams {
    page?: number;
    countryCode?: string;
    keyword?: string;
}

export const getMajorEvents = async (params: GetEventsParams = {}) => {
    const { page = 0, countryCode, keyword } = params;
    const cacheKey = `events_${page}_${countryCode}_${keyword}`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const buildBase = (size: number) => {
        const url = new URL(`${TM_BASE}/events.json`);
        url.searchParams.set('apikey', TM_KEY);
        url.searchParams.set('sort', 'relevance,desc');
        url.searchParams.set('size', String(size));
        url.searchParams.set('page', String(page));
        if (countryCode) url.searchParams.set('countryCode', countryCode);
        if (keyword) url.searchParams.set('keyword', keyword);
        return url;
    };

    const musicUrl = buildBase(15);
    musicUrl.searchParams.set('classificationSegmentId', 'KZFzniwnSyZfZ7v7nJ');
    musicUrl.searchParams.set('genreId', MAJOR_MUSIC_GENRE_IDS);

    const sportsUrl = buildBase(5);
    sportsUrl.searchParams.set('classificationSegmentId', 'KZFzniwnSyZfZ7v7nE');

    const [musicData, sportsData] = await Promise.all([
        fetchTM(musicUrl),
        fetchTM(sportsUrl),
    ]);

    const musicEvents: any[] = musicData?._embedded?.events || [];
    const sportsEvents: any[] = sportsData?._embedded?.events || [];

    const events = [...musicEvents, ...sportsEvents]
        .map(normalizeEvent)
        .filter(Boolean);

    const result = {
        events,
        page,
        totalPages: Math.max(
            musicData?.page?.totalPages ?? 0,
            sportsData?.page?.totalPages ?? 0,
        ),
    };

    setCache(cacheKey, result);
    return result;
};

export const getEventById = async (eventId: string) => {
    const cacheKey = `event_${eventId}`;
    const cached = fromCache<any>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${TM_BASE}/events/${eventId}.json`);
    url.searchParams.set('apikey', TM_KEY);

    const data = await fetchTM(url);
    const event = normalizeEvent(data);

    setCache(cacheKey, event, 30 * 60 * 1000); // 30 min
    return event;
};
