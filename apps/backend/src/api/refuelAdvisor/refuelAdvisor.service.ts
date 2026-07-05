import {
  getAllStopsInATrip,
  createRefuelStop,
  recalculateTripSegments,
  recalculateArrivalTimesFromRoute,
} from "../itinerary/itinerary.service.js";
import { getVehiclesInTrip } from "../trips/trips.service.js";
import { supabase } from "../../supabase.js";
import { haversineKm, ROAD_FACTOR } from "../../utils/geolocation.js";

const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

// Porcentaje de depósito que se reserva como mínimo de seguridad
const SAFETY_RESERVE_PCT = 0.15;
// Radios de búsqueda progresivos (metros): si el primero no da resultados se amplía
const SEARCH_RADII_M = [10_000, 25_000, 50_000];
// Número máximo de candidatos por punto de repostaje
const MAX_CANDIDATES = 5;
// Precios por defecto por tipo de combustible (€/L o €/kWh para eléctrico)
const DEFAULT_FUEL_PRICE: Record<string, number> = {
  gasoline: 1.75,
  diesel: 1.65,
  LPG: 0.92,
  electric: 0.28,
};

type FuelType = "diesel" | "gasoline" | "electric" | "LPG";

function extractCoords(coords: any): { lat: number; lng: number } {
  return {
    lat: coords?.latitude ?? coords?.lat ?? 0,
    lng: coords?.longitude ?? coords?.lng ?? 0,
  };
}

function interpolateCoords(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  fraction: number,
): { lat: number; lng: number } {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

function placeTypeForFuel(fuelType: FuelType): string {
  return fuelType === "electric"
    ? "electric_vehicle_charging_station"
    : "gas_station";
}

export interface GasStationCandidate {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  open_now?: boolean;
}

export interface RefuelSuggestion {
  /** ID de la parada tras la cual se debe insertar el repostaje */
  insertAfterStopId: number;
  insertAfterStopName: string;
  /** ID de la parada anterior al punto de inserción */
  insertBeforeStopId: number;
  insertBeforeStopName: string;
  /** Nivel de combustible (%) al inicio del segmento problemático */
  fuelLevelPctAtGap: number;
  /** Km de autonomía restante cuando se detecta el problema */
  remainingRangeKm: number;
  /** Coordenadas del punto óptimo de búsqueda en la ruta */
  searchLat: number;
  searchLng: number;
  /** Gasolineras / puntos de carga cercanos (ordenadas por rating) */
  candidates: GasStationCandidate[];
}

async function searchNearbyStations(
  lat: number,
  lng: number,
  fuelType: FuelType,
): Promise<GasStationCandidate[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn(
      "⚠️ GOOGLE_PLACES_API_KEY no configurada — no se puede buscar gasolineras",
    );
    return [];
  }

  for (const radius of SEARCH_RADII_M) {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    );
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("type", placeTypeForFuel(fuelType));
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok)
      throw new Error(`Error en Google Places Nearby Search: ${res.status}`);

    const data = (await res.json()) as any;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Estado inesperado de Google Places API: ${data.status}`);
    }

    const results: GasStationCandidate[] = ((data.results as any[]) || [])
      .slice(0, MAX_CANDIDATES)
      .map((r: any) => ({
        place_id: r.place_id as string,
        name: r.name as string,
        address: (r.vicinity as string) || "",
        lat: r.geometry.location.lat as number,
        lng: r.geometry.location.lng as number,
        rating: r.rating as number | undefined,
        open_now: r.opening_hours?.open_now as boolean | undefined,
      }))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    if (results.length > 0) {
      if (radius > SEARCH_RADII_M[0]) {
        console.log(
          `[RefuelAdvisor] Radio ampliado a ${radius / 1000} km — ${results.length} candidato(s) encontrado(s)`,
        );
      }
      return results;
    }

    if (radius < SEARCH_RADII_M[SEARCH_RADII_M.length - 1]) {
      console.log(
        `[RefuelAdvisor] Sin resultados en ${radius / 1000} km, ampliando a ${SEARCH_RADII_M[SEARCH_RADII_M.indexOf(radius) + 1] / 1000} km...`,
      );
    }
  }

  return [];
}

/** Devuelve el conjunto de IDs de paradas que ya son de repostaje en el viaje. */
async function getExistingRefuelStopIds(tripId: number): Promise<Set<number>> {
  const { data } = await supabase
    .from("stop")
    .select("id, refuel!inner(id)")
    .eq("trip_id", tripId);

  const ids = new Set<number>();
  for (const row of data ?? []) {
    ids.add(row.id as number);
  }
  return ids;
}

/**
 * Analiza el itinerario del viaje y devuelve los puntos donde el vehículo
 * podría quedarse sin combustible, junto con gasolineras cercanas ordenadas por rating.
 *
 * Asume que el viaje comienza con el depósito lleno.
 * Las paradas de tipo refuel existentes resetean el nivel al máximo.
 */
export async function suggestRefuelStops(
  tripId: number,
): Promise<RefuelSuggestion[]> {
  console.log(`\n⛽ [Trip ${tripId}] Iniciando asesor de repostaje...`);
  const stops = await getAllStopsInATrip(tripId);
  if (stops.length < 2) {
    console.log(
      `[RefuelAdvisor] Trip ${tripId} tiene menos de 2 paradas — sin análisis.`,
    );
    return [];
  }

  const vehicleRows = await getVehiclesInTrip(tripId);
  const vehicle = (vehicleRows[0] as any)?.vehicle;
  if (!vehicle) {
    console.log(
      `[RefuelAdvisor] Trip ${tripId} sin vehículo asignado — sin análisis.`,
    );
    return [];
  }

  const tankCapacity: number = vehicle.fuel_tank_capacity;
  const avgConsumption: number = vehicle.avg_consumption; // l/100km o kWh/100km
  const fuelType: FuelType = vehicle.type_fuel;

  if (!tankCapacity || !avgConsumption || !fuelType) return [];

  console.log(
    `⛽ [Trip ${tripId}] Vehículo: ${vehicle.brand ?? ""} ${vehicle.model ?? ""} · ${fuelType} · ${tankCapacity}L · ${avgConsumption}L/100km · simulando ${stops.length} paradas`,
  );

  const existingRefuelIds = await getExistingRefuelStopIds(tripId);
  const reserveUnits = tankCapacity * SAFETY_RESERVE_PCT;
  let currentFuel = tankCapacity;
  const suggestions: RefuelSuggestion[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i] as any;
    const toStop = stops[i + 1] as any;

    // Las paradas de repostaje existentes reponen el depósito
    if (existingRefuelIds.has(fromStop.id)) {
      currentFuel = tankCapacity;
      continue;
    }

    const fromCoords = extractCoords(fromStop.coordinates);
    const toCoords = extractCoords(toStop.coordinates);

    const straightKm = haversineKm(fromCoords, toCoords);
    const roadKm = straightKm * ROAD_FACTOR;
    const fuelNeeded = (roadKm / 100) * avgConsumption;

    const fuelAfterSegment = currentFuel - fuelNeeded;

    if (fuelAfterSegment < reserveUnits) {
      // Calcular cuántos km puede recorrer con el combustible disponible (sin la reserva)
      const usableFuel = Math.max(0, currentFuel - reserveUnits);
      const safeKm = (usableFuel / avgConsumption) * 100;

      // Punto de búsqueda: fracción del segmento donde se agota el combustible útil
      // Se toma el 85% de ese punto para tener margen de llegada a la gasolinera
      const fraction =
        roadKm > 0 ? Math.min(0.85, (safeKm / roadKm) * 0.85) : 0.4;

      const searchPoint = interpolateCoords(fromCoords, toCoords, fraction);

      let candidates: GasStationCandidate[] = [];
      try {
        candidates = await searchNearbyStations(
          searchPoint.lat,
          searchPoint.lng,
          fuelType,
        );
        const best = candidates[0];
        console.log(
          `⚠  [Trip ${tripId}] Gap: "${fromStop.name ?? `stop#${fromStop.id}`}" → "${toStop.name ?? `stop#${toStop.id}`}" · ${roadKm.toFixed(1)} km · queda ${currentFuel.toFixed(1)}L` +
            (best ? ` → "${best.name}" seleccionada (rating: ${best.rating ?? "N/A"})` : " → sin gasolinera encontrada"),
        );
      } catch (err) {
        console.error(
          `❌ Error buscando gasolineras en (${searchPoint.lat}, ${searchPoint.lng}):`,
          err,
        );
      }

      suggestions.push({
        insertAfterStopId: fromStop.id,
        insertAfterStopName: fromStop.name ?? "",
        insertBeforeStopId: toStop.id,
        insertBeforeStopName: toStop.name ?? "",
        fuelLevelPctAtGap: Math.round((currentFuel / tankCapacity) * 100),
        remainingRangeKm: Math.round(safeKm),
        searchLat: searchPoint.lat,
        searchLng: searchPoint.lng,
        candidates,
      });

      // Asumir repostaje completo antes de continuar la simulación
      currentFuel = tankCapacity;
    } else {
      currentFuel = fuelAfterSegment;
    }
  }

  return suggestions;
}

/**
 * Versión automática: analiza el viaje y crea las paradas de repostaje
 * eligiendo el candidato con mejor rating de cada sugerencia.
 * Seguro de llamar varias veces: omite tramos donde ya existe un repostaje.
 * Diseñado para uso no-bloqueante (fire-and-forget desde controllers).
 */
export async function autoInsertRefuelStops(tripId: number): Promise<void> {
  try {
    const suggestions = await suggestRefuelStops(tripId);
    if (suggestions.length === 0) {
      console.log(
        `⛽ [RefuelAdvisor] Sin tramos críticos — no se requieren paradas de repostaje para trip ${tripId}.`,
      );
      return;
    }

    const stops = await getAllStopsInATrip(tripId);
    const vehicleRows = await getVehiclesInTrip(tripId);
    const vehicle = (vehicleRows[0] as any)?.vehicle;
    const fuelType: string | null = vehicle?.type_fuel ?? null;
    const tankCapacity: number | null = vehicle?.fuel_tank_capacity ?? null;

    for (const suggestion of suggestions) {
      const best = suggestion.candidates[0];
      if (!best) {
        console.warn(
          `⚠️ [RefuelAdvisor] Sin candidatos entre stops ${suggestion.insertAfterStopId} → ${suggestion.insertBeforeStopId}`,
        );
        continue;
      }

      // Obtener día y posición del stop "insertAfter" para insertar justo después
      const afterStop = stops.find(
        (s: any) => s.id === suggestion.insertAfterStopId,
      ) as any;
      const day: number = afterStop?.day ?? 1;
      const position: number = (afterStop?.position ?? 1) + 1;

      const stopData: any = {
        name: best.name,
        address: best.address,
        coordinates: { latitude: best.lat, longitude: best.lng },
        type: "intermedia" as const,
        day,
        position,
        trip_id: tripId,
      };

      // Calcular litros necesarios para llenar el depósito desde el nivel actual
      const fuelAtGap = tankCapacity !== null
        ? tankCapacity * (suggestion.fuelLevelPctAtGap / 100)
        : null;
      const liters = tankCapacity !== null && fuelAtGap !== null
        ? Math.round((tankCapacity - fuelAtGap) * 10) / 10
        : null;
      const pricePerUnit = fuelType ? (DEFAULT_FUEL_PRICE[fuelType] ?? null) : null;

      const refuelData: any = {
        fuel_type: fuelType,
        ...(liters !== null && { liters }),
        ...(pricePerUnit !== null && { price_per_unit: pricePerUnit }),
      };

      await createRefuelStop(stopData, refuelData, tripId);
      console.log(
        `⛽ [Trip ${tripId}] "${best.name}" insertada (día ${day}, pos ${position})`,
      );
    }

    await recalculateTripSegments(tripId);
    await recalculateArrivalTimesFromRoute(tripId);
    console.log(`✅ [Trip ${tripId}] ${suggestions.length} parada(s) de repostaje insertadas automáticamente\n`);
  } catch (err) {
    // No-op: el repostaje automático nunca debe romper el flujo principal
    console.error(
      `❌ [RefuelAdvisor] Error en autoInsertRefuelStops(trip ${tripId}):`,
      err,
    );
  }
}
