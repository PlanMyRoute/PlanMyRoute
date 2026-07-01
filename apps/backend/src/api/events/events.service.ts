const TM_BASE = "https://app.ticketmaster.com/discovery/v2";
const TM_KEY = process.env.TICKETMASTER_API_KEY!;

/** ID del segmento de música en Ticketmaster */
const TM_SEGMENT_MUSIC = "KZFzniwnSyZfZ7v7nJ";
/** ID del segmento de deportes en Ticketmaster */
const TM_SEGMENT_SPORTS = "KZFzniwnSyZfZ7v7nE";
/** Tamaño de página para eventos musicales */
const MUSIC_PAGE_SIZE = 15;
/** Tamaño de página para eventos deportivos */
const SPORTS_PAGE_SIZE = 5;
/** Radio de búsqueda geográfica (km) */
const GEO_SEARCH_RADIUS = "300";
/** Tamaño de página para eventos cercanos a paradas */
const NEAR_STOP_PAGE_SIZE = "3";

// Géneros musicales principales (Rock, Pop, Hip-Hop/Rap, R&B, Electronic, Latin, Country)
const MAJOR_MUSIC_GENRE_IDS = [
  "KnvZfZ7vAeA", // Rock
  "KnvZfZ7vAev", // Pop
  "KnvZfZ7vAvt", // Hip-Hop/Rap
  "KnvZfZ7vAee", // R&B
  "KnvZfZ7vAvF", // Electronic/Dance
  "KnvZfZ7vAe6", // Latin
  "KnvZfZ7vAv6", // Country
].join(",");

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
    event.images?.find(
      (img: any) => img.ratio === "16_9" && img.width >= 640,
    ) || event.images?.[0];
  const priceRange = event.priceRanges?.[0];
  const classification = event.classifications?.[0];
  const localDate = event.dates?.start?.localDate as string | null;

  return {
    id: event.id as string,
    name: event.name as string,
    url: event.url as string | null,
    image: (image?.url as string) || null,
    date: localDate,
    dates: localDate ? [localDate] : [],
    time: event.dates?.start?.localTime as string | null,
    status: (event.dates?.status?.code as string) || "onsale",
    venue: venue
      ? {
          name: (venue.name as string) || null,
          city: (venue.city?.name as string) || null,
          country: (venue.country?.name as string) || null,
          countryCode: (venue.country?.countryCode as string) || null,
          address: (venue.address?.line1 as string) || null,
          coordinates: venue.location
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

function groupMultiDayEvents(
  events: NonNullable<ReturnType<typeof normalizeEvent>>[],
) {
  const grouped = new Map<
    string,
    NonNullable<ReturnType<typeof normalizeEvent>>
  >();

  for (const event of events) {
    const venueName = event.venue?.name ?? "";
    const venueCity = event.venue?.city ?? "";
    const key = `${event.name.toLowerCase()}|${venueName}|${venueCity}`;

    const existing = grouped.get(key);
    if (existing) {
      if (event.date && !existing.dates.includes(event.date)) {
        existing.dates.push(event.date);
        existing.dates.sort();
        existing.date = existing.dates[0];
      }
    } else {
      grouped.set(key, { ...event });
    }
  }

  return Array.from(grouped.values());
}

async function fetchTM(url: URL) {
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Error en Ticketmaster API: ${res.status}`);
  return res.json() as Promise<any>;
}

export interface GetEventsParams {
  page?: number;
  countryCode?: string;
  keyword?: string;
  lat?: number;
  lng?: number;
}

/**
 * Obtiene los eventos principales de música y deportes desde Ticketmaster
 * @param params - Parámetros de búsqueda (página, código de país, palabra clave, coordenadas)
 * @returns Objeto con la lista de eventos, la página actual y el total de páginas
 */
export const getMajorEvents = async (params: GetEventsParams = {}) => {
  const { page = 0, countryCode, keyword, lat, lng } = params;
  const cacheKey = `events_${page}_${countryCode}_${keyword}_${lat}_${lng}`;
  const cached = fromCache<any>(cacheKey);
  if (cached) return cached;

  const buildBase = (size: number) => {
    const url = new URL(`${TM_BASE}/events.json`);
    url.searchParams.set("apikey", TM_KEY);
    url.searchParams.set("sort", "relevance,desc");
    url.searchParams.set("size", String(size));
    url.searchParams.set("page", String(page));
    if (countryCode) {
      url.searchParams.set("countryCode", countryCode);
    } else if (lat != null && lng != null) {
      // No country filter: use geo-coordinates so Ticketmaster returns nearby events
      url.searchParams.set("latlong", `${lat},${lng}`);
      url.searchParams.set("radius", GEO_SEARCH_RADIUS);
      url.searchParams.set("unit", "km");
    }
    if (keyword) url.searchParams.set("keyword", keyword);
    return url;
  };

  const musicUrl = buildBase(MUSIC_PAGE_SIZE);
  musicUrl.searchParams.set("classificationSegmentId", TM_SEGMENT_MUSIC);
  musicUrl.searchParams.set("genreId", MAJOR_MUSIC_GENRE_IDS);

  const sportsUrl = buildBase(SPORTS_PAGE_SIZE);
  sportsUrl.searchParams.set("classificationSegmentId", TM_SEGMENT_SPORTS);

  const [musicData, sportsData] = await Promise.all([
    fetchTM(musicUrl),
    fetchTM(sportsUrl),
  ]);

  const musicEvents: any[] = musicData?._embedded?.events || [];
  const sportsEvents: any[] = sportsData?._embedded?.events || [];

  const events = groupMultiDayEvents(
    [...musicEvents, ...sportsEvents]
      .map(normalizeEvent)
      .filter(Boolean) as NonNullable<ReturnType<typeof normalizeEvent>>[],
  );

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

export interface NearStopInput {
  city: string;
  date: string;
  countryCode?: string;
}

/**
 * Obtiene eventos cercanos a las paradas de un viaje, sin duplicados
 * @param stops - Lista de paradas con ciudad, fecha y código de país opcional
 * @param limit - Número máximo de eventos a retornar (por defecto 10)
 * @returns Lista de eventos únicos cercanos a las paradas
 */
export const getEventsNearStops = async (
  stops: NearStopInput[],
  limit = 10,
) => {
  if (!stops.length) return [];

  const unique = stops.filter(
    (s, i, arr) =>
      s.city &&
      s.date &&
      arr.findIndex((x) => x.city === s.city && x.date === s.date) === i,
  );

  const resultsPerStop = await Promise.all(
    unique.map(async (stop) => {
      const cacheKey = `near_${stop.city}_${stop.date}`;
      const cached = fromCache<any[]>(cacheKey);
      if (cached) return cached;

      const url = new URL(`${TM_BASE}/events.json`);
      url.searchParams.set("apikey", TM_KEY);
      url.searchParams.set("city", stop.city);
      url.searchParams.set("startDateTime", `${stop.date}T00:00:00Z`);
      url.searchParams.set("endDateTime", `${stop.date}T23:59:59Z`);
      url.searchParams.set("size", NEAR_STOP_PAGE_SIZE);
      url.searchParams.set("sort", "relevance,desc");
      if (stop.countryCode)
        url.searchParams.set("countryCode", stop.countryCode);

      try {
        const data = await fetchTM(url);
        const events = ((data?._embedded?.events as any[]) || [])
          .map(normalizeEvent)
          .filter(Boolean) as NonNullable<ReturnType<typeof normalizeEvent>>[];
        setCache(cacheKey, events, 2 * 60 * 60 * 1000);
        return events;
      } catch {
        return [];
      }
    }),
  );

  const seen = new Set<string>();
  const all: NonNullable<ReturnType<typeof normalizeEvent>>[] = [];
  for (const batch of resultsPerStop) {
    for (const ev of batch) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        all.push(ev);
      }
    }
  }
  return all.slice(0, limit);
};

/**
 * Obtiene un evento específico por su ID desde Ticketmaster
 * @param eventId - ID del evento en Ticketmaster
 * @returns El evento normalizado o null si no existe
 */
export const getEventById = async (eventId: string) => {
  const cacheKey = `event_${eventId}`;
  const cached = fromCache<any>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${TM_BASE}/events/${eventId}.json`);
  url.searchParams.set("apikey", TM_KEY);

  const data = await fetchTM(url);
  const event = normalizeEvent(data);

  setCache(cacheKey, event, 30 * 60 * 1000); // 30 min
  return event;
};
