const CARQUERY_BASE = "https://www.carqueryapi.com/api/0.3/";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type CacheEntry<T> = { data: T; ts: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

async function carqueryFetch(params: Record<string, string>): Promise<unknown> {
  const url = new URL(CARQUERY_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "PlanMyRoute/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`CarQuery HTTP ${res.status}`);
    const text = await res.text();
    // CarQuery may wrap in JSONP callback — strip it
    const json = text.replace(/^[^({]*\(/, "").replace(/\);?\s*$/, "");
    return JSON.parse(json);
  } finally {
    clearTimeout(timeout);
  }
}

export interface CarMake {
  make_id: string;
  make_display: string;
  make_country: string;
}

export interface CarModel {
  model_name: string;
  model_year: string;
}

export interface CarTrim {
  model_name: string;
  model_year: string;
  model_trim: string;
  model_engine_fuel: string;
  model_lkm_mixed: string | null;
  model_fuel_cap_l: string | null;
  model_engine_cc: string | null;
  model_engine_power_ps: string | null;
}

export async function getMakes(): Promise<CarMake[]> {
  const cacheKey = "makes";
  const cached = getCached<CarMake[]>(cacheKey);
  if (cached) return cached;

  const data = (await carqueryFetch({ cmd: "getMakes" })) as {
    Makes: CarMake[];
  };
  const makes = data.Makes || [];
  setCache(cacheKey, makes);
  return makes;
}

export async function getModels(
  make: string,
  year?: string,
): Promise<CarModel[]> {
  const cacheKey = `models:${make}:${year || "all"}`;
  const cached = getCached<CarModel[]>(cacheKey);
  if (cached) return cached;

  const params: Record<string, string> = { cmd: "getModels", make };
  if (year) params.year = year;
  const data = (await carqueryFetch(params)) as { Models: CarModel[] };
  const models = data.Models || [];
  setCache(cacheKey, models);
  return models;
}

export async function getTrims(
  make: string,
  model: string,
  year?: string,
): Promise<CarTrim[]> {
  const cacheKey = `trims:${make}:${model}:${year || "all"}`;
  const cached = getCached<CarTrim[]>(cacheKey);
  if (cached) return cached;

  const params: Record<string, string> = { cmd: "getTrims", make, model };
  if (year) params.year = year;
  const data = (await carqueryFetch(params)) as { Trims: CarTrim[] };
  const trims = data.Trims || [];
  setCache(cacheKey, trims);
  return trims;
}

export function pickBestSpecs(trims: CarTrim[]): {
  avgConsumption: number | null;
  fuelTankCapacity: number | null;
} | null {
  if (trims.length === 0) return null;

  const consumptions = trims
    .map((t) => parseFloat(t.model_lkm_mixed || ""))
    .filter((n) => !isNaN(n) && n > 0);
  const tanks = trims
    .map((t) => parseFloat(t.model_fuel_cap_l || ""))
    .filter((n) => !isNaN(n) && n > 0);

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  return {
    avgConsumption: avg(consumptions),
    fuelTankCapacity: avg(tanks) !== null ? Math.round(avg(tanks)!) : null,
  };
}
