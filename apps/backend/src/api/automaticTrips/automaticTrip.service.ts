import { Accommodation } from "@planmyroute/types";
import * as TripService from "../trips/trips.service.js";
import * as ItineraryService from "../itinerary/itinerary.service.js";
import genAI from "../../utils/gemini.js";
import {
  buildItineraryPrompt,
  validateItineraryResponse,
  ITINERARY_GENERATOR_MODEL,
} from "./prompts/itineraryGenerator.js";
import {
  logAiGeneration,
  AiGenerationOutcome,
} from "../../services/aiGenerationLogger.js";
import {
  haversineKm,
  estimateRoadDistanceKm,
  ROAD_FACTOR,
} from "../../utils/geolocation.js";

type Coord = { lat: number; lng: number };

const AVG_SPEED_KMH = 90;
const MAX_CONTINUOUS_HOURS = 8;
const DEFAULT_FUEL_PRICE = 1.8; // €/L
const DEFAULT_CONSUMPTION_L_PER_100 = 8; // l/100km
const MS_PER_DAY = 86_400_000;

/** Coste estimado de alojamiento por noche y persona (€) */
const ACCOMMODATION_PER_NIGHT_PERSON = 40;
/** Coste estimado de comida por día y persona (€) */
const FOOD_PER_DAY_PERSON = 20;
/** Coste estimado de actividades por día y persona (€) */
const ACTIVITIES_PER_DAY_PERSON = 10;
/** Multiplicador para obtener el presupuesto máximo a partir del mínimo */
const BUDGET_MAX_MULTIPLIER = 1.8;
/** Ratio por debajo del cual el presupuesto se considera insuficiente */
const INSUFFICIENT_BUDGET_RATIO = 0.6;
/** Horas de conducción por día que generan un aviso serio */
const DRIVING_HOURS_PER_DAY_HARD_LIMIT = 12;
/** Horas de conducción por día que generan un aviso de fatiga */
const DRIVING_HOURS_PER_DAY_SOFT_LIMIT = 8;

/**
 * Estima las horas de conducción en base a la distancia
 * @param distanceKm - Distancia en kilómetros
 * @returns Horas estimadas de conducción
 */
export function estimateDrivingHours(distanceKm: number): number {
  return distanceKm / AVG_SPEED_KMH;
}

/**
 * Estima el presupuesto total de un viaje (combustible, alojamiento, comida y actividades)
 * @param params - Parámetros del viaje: distancia, días, adultos y consumo/precio de combustible opcionales
 * @returns Objeto con estimación mínima y máxima, litros de combustible y coste de combustible
 */
export function estimateBudget(params: {
  distance_km: number;
  days: number;
  n_adults: number;
  vehicle_consumption_l_per_100?: number;
  fuel_price_per_l?: number;
}) {
  const {
    distance_km,
    days,
    n_adults,
    vehicle_consumption_l_per_100,
    fuel_price_per_l,
  } = params;
  const nights = Math.max(0, days - 1);

  const alojamiento =
    ACCOMMODATION_PER_NIGHT_PERSON * nights * Math.max(1, n_adults);
  const comida = FOOD_PER_DAY_PERSON * days * Math.max(1, n_adults);
  const activities = ACTIVITIES_PER_DAY_PERSON * days * Math.max(1, n_adults);

  const consumption =
    vehicle_consumption_l_per_100 ?? DEFAULT_CONSUMPTION_L_PER_100;
  const fuel_price = fuel_price_per_l ?? DEFAULT_FUEL_PRICE;
  const fuel_l = (distance_km / 100) * consumption;
  const fuel_cost = fuel_l * fuel_price;

  const estimate_min = Math.round(
    alojamiento + comida + activities + fuel_cost,
  );
  const estimate_max = Math.round(estimate_min * BUDGET_MAX_MULTIPLIER);

  return {
    estimate_min,
    estimate_max,
    fuel_l: Number(fuel_l.toFixed(2)),
    fuel_cost: Number(fuel_cost.toFixed(2)),
  };
}

/**
 * Valida los datos básicos de un viaje: coordenadas, fechas, horas de conducción y presupuesto
 * @param params - Datos del viaje: origen, destino, fechas, número de adultos y presupuesto opcional
 * @returns Resultado de la validación con distancia, horas de conducción, días y avisos
 */
export function validateTripBasic(params: {
  origin?: Coord | null;
  destination?: Coord | null;
  start_date: string;
  end_date: string;
  n_adults?: number;
  budget_total?: number;
}) {
  const warnings: string[] = [];
  if (!params.origin || !params.destination) {
    return {
      ok: false,
      code: "missing_coords",
      message: "Faltan coordenadas de origen o destino.",
    };
  }
  const distance_km = estimateRoadDistanceKm(params.origin, params.destination);
  const driving_hours = estimateDrivingHours(distance_km);
  const sd = new Date(params.start_date);
  const ed = new Date(params.end_date);
  const days = Math.max(
    1,
    Math.round((ed.getTime() - sd.getTime()) / MS_PER_DAY) + 1,
  );

  const min_days_by_drive = Math.ceil(driving_hours / MAX_CONTINUOUS_HOURS);
  const min_recommended_days = Math.max(min_days_by_drive, 1);

  if (driving_hours > days * DRIVING_HOURS_PER_DAY_HARD_LIMIT) {
    warnings.push(
      `Con las fechas seleccionadas se necesitan ~${Math.round(driving_hours)} h de conducción; considera aumentar días.`,
    );
  } else if (driving_hours > days * DRIVING_HOURS_PER_DAY_SOFT_LIMIT) {
    warnings.push(
      `El itinerario requiere ~${Math.round(driving_hours)} h conducción; puede resultar agotador.`,
    );
  }

  // Budget: estimation using defaults
  const budgetEst = estimateBudget({
    distance_km,
    days,
    n_adults: params.n_adults ?? 1,
  });

  if (
    params.budget_total &&
    params.budget_total < budgetEst.estimate_min * INSUFFICIENT_BUDGET_RATIO
  ) {
    warnings.push(
      "El presupuesto proporcionado es claramente insuficiente comparado con una estimación mínima.",
    );
  }

  return {
    ok: warnings.length === 0,
    distance_km: Math.round(distance_km),
    driving_hours: Number(driving_hours.toFixed(1)),
    days,
    min_recommended_days,
    budgetEst,
    warnings,
  };
}

function parseEntryPrice(raw: any): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const m = raw.match(/\d+/);
    if (m) return parseInt(m[0]);
    if (raw.toLowerCase().includes("gratis")) return 0;
  }
  return null;
}

function parseDurationMinutes(stop: any): number | null {
  if (
    stop.estimated_duration_minutes !== undefined &&
    stop.estimated_duration_minutes !== null
  ) {
    if (typeof stop.estimated_duration_minutes === "number")
      return Math.round(stop.estimated_duration_minutes);
    const n = parseFloat(stop.estimated_duration_minutes);
    if (!isNaN(n)) return Math.round(n);
  }
  if (stop.estimated_duration !== undefined) {
    const n =
      typeof stop.estimated_duration === "number"
        ? stop.estimated_duration
        : parseFloat(stop.estimated_duration);
    if (!isNaN(n)) return Math.round(n * 60);
  }
  return null;
}

/**
 * Crea las paradas de un día concreto para un viaje.
 * Creación secuencial (no paralela) para evitar race conditions en posiciones.
 * Si `maxDay` se proporciona y `day > maxDay`, salta sin crear nada (defensa contra
 * itinerarios de IA que generan días más allá de la duración real del viaje).
 */
export async function createStopsForDay(
  itineraryAI: any,
  tripId: number,
  day: number,
  maxDay?: number,
): Promise<void> {
  if (maxDay !== undefined && day > maxDay) {
    console.log(`⏭️  Saltando día ${day} (excede totalDays=${maxDay})`);
    return;
  }
  const accommodationStops = (itineraryAI.accomodationstop || []).filter(
    (s: any) => s.day === day,
  );
  const activityStops = (itineraryAI.activitystop || []).filter(
    (s: any) => s.day === day,
  );

  for (const stop of accommodationStops) {
    try {
      const stopData: any = {
        name: stop.name,
        address: stop.address,
        description: stop.description,
        type: "intermedia" as const,
        day: stop.day,
        estimated_arrival: stop.estimated_arrival || null,
      };
      const accommodationData = {
        nights: stop.nights,
        price_per_night: stop.price_per_night ?? null,
        url: stop.url,
        contact: stop.contact,
      };
      await ItineraryService.createAccommodationStop(
        stopData,
        accommodationData,
        tripId,
      );
      console.log(`✓ Alojamiento día ${day}: ${stop.name}`);
    } catch (err) {
      console.error(`Error alojamiento día ${day} "${stop.name}":`, err);
    }
  }

  for (const stop of activityStops) {
    try {
      const stopData: any = {
        name: stop.name,
        address: stop.address,
        description: stop.description,
        type: "intermedia" as const,
        day: stop.day,
        estimated_arrival: stop.estimated_arrival || null,
      };
      const activityData = {
        category: stop.category,
        entry_price: parseEntryPrice(stop.entry_price),
        booking_required: stop.booking_required,
        estimated_duration_minutes: parseDurationMinutes(stop),
        url: stop.url,
      };
      await ItineraryService.createActivityStop(stopData, activityData, tripId);
      console.log(`✓ Actividad día ${day}: ${stop.name}`);
    } catch (err) {
      console.error(`Error actividad día ${day} "${stop.name}":`, err);
    }
  }
}

/** Devuelve todos los días únicos presentes en la respuesta de la IA, ordenados. */
export function getUniqueDaysFromAI(itineraryAI: any): number[] {
  const days = new Set<number>();
  for (const s of itineraryAI.accomodationstop || [])
    if (s.day) days.add(s.day);
  for (const s of itineraryAI.activitystop || []) if (s.day) days.add(s.day);
  return Array.from(days).sort((a, b) => a - b);
}

/**
 * Crea TODAS las paradas intermedias de la IA para un viaje (flujo legacy/síncrono).
 */
export async function createIntermediateStopsFromAI(
  itineraryAI: any,
  tripId: number,
): Promise<void> {
  const days = getUniqueDaysFromAI(itineraryAI);
  for (const day of days) {
    await createStopsForDay(itineraryAI, tripId, day);
  }
}

// =============== FAST PATH (Phase 2 "A mejorada") ===============

interface AiStopRaw {
  name: string;
  address: string;
  description: string;
  day: number;
  estimated_arrival?: string | null;
  kind: "accommodation" | "activity";
  // Accommodation fields
  nights?: number;
  price_per_night?: number | null;
  url?: string;
  contact?: string;
  // Activity fields
  category?: string;
  entry_price?: any;
  booking_required?: boolean;
  estimated_duration_minutes?: any;
  estimated_duration?: any;
}

function parseArrivalForSort(arrival: string | null | undefined): number {
  if (!arrival) return Infinity;
  const match = arrival.match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
  return Infinity;
}

/**
 * Fast-path day creation: deterministic positions, no photo/price lookup.
 * Returns created stop IDs for background enrichment.
 */
export async function createStopsForDayFast(
  itineraryAI: any,
  tripId: number,
  day: number,
  maxDay?: number,
): Promise<number[]> {
  if (maxDay !== undefined && day > maxDay) return [];

  const raw: AiStopRaw[] = [];
  for (const s of (itineraryAI.accomodationstop || []).filter(
    (s: any) => s.day === day,
  )) {
    raw.push({ ...s, kind: "accommodation" });
  }
  for (const s of (itineraryAI.activitystop || []).filter(
    (s: any) => s.day === day,
  )) {
    raw.push({ ...s, kind: "activity" });
  }

  raw.sort(
    (a, b) =>
      parseArrivalForSort(a.estimated_arrival) -
      parseArrivalForSort(b.estimated_arrival),
  );

  const stopIds: number[] = [];

  for (let i = 0; i < raw.length; i++) {
    const stop = raw[i];
    const position = i + 1;
    const order = day * 10000 + position * 100;

    const stopData: any = {
      name: stop.name,
      address: stop.address,
      description: stop.description,
      type: "intermedia" as const,
      day: stop.day,
      estimated_arrival: stop.estimated_arrival || null,
      position,
      order,
    };

    try {
      if (stop.kind === "accommodation") {
        const result = await ItineraryService.createAccommodationStopFast(
          stopData,
          {
            nights: stop.nights,
            price_per_night: stop.price_per_night ?? null,
            url: stop.url,
            contact: stop.contact,
          },
          tripId,
        );
        stopIds.push(result.stop.id);
        console.log(`⚡ Alojamiento día ${day}: ${stop.name}`);
      } else {
        const result = await ItineraryService.createActivityStopFast(
          stopData,
          {
            category: stop.category,
            entry_price: parseEntryPrice(stop.entry_price),
            booking_required: stop.booking_required,
            estimated_duration_minutes: parseDurationMinutes(stop),
            url: stop.url,
          },
          tripId,
        );
        stopIds.push(result.stop.id);
        console.log(`⚡ Actividad día ${day}: ${stop.name}`);
      }
    } catch (err) {
      console.error(`Error fast-insert día ${day} "${stop.name}":`, err);
    }
  }

  return stopIds;
}

const ENRICH_CONCURRENCY = 4;

/**
 * Enrich all stops in batches (photo + price lookup), then rebuild routes.
 */
export async function enrichStopsForTrip(
  stopIds: number[],
  tripId: number,
): Promise<void> {
  for (let i = 0; i < stopIds.length; i += ENRICH_CONCURRENCY) {
    const batch = stopIds.slice(i, i + ENRICH_CONCURRENCY);
    await Promise.allSettled(
      batch.map((id) => ItineraryService.enrichStop(id)),
    );
  }
  await ItineraryService.recalculateTripSegments(tripId);
}

/**
 * Crea un viaje completo a partir del itinerario generado por la IA (flujo legacy/síncrono)
 * @param itineraryAI - Itinerario devuelto por el modelo de IA
 * @param userId - ID del usuario propietario del viaje
 * @param originalPayload - Datos originales enviados por el cliente (nombre, fechas, viajeros, etc.)
 * @returns Itinerario completo del viaje creado con todas sus paradas
 */
export async function createTripFromAI(
  itineraryAI: any,
  userId: string,
  originalPayload: any,
) {
  const tripPayload = {
    name: originalPayload.name,
    description: itineraryAI.description,
    start_date: originalPayload.start_date,
    end_date: originalPayload.end_date,
    n_adults: originalPayload.n_adults || 1,
    n_children: originalPayload.n_children || 0,
    n_babies: originalPayload.n_babies || 0,
    n_elders: originalPayload.n_elders || 0,
    n_pets: originalPayload.n_pets || 0,
    estimated_price_min: originalPayload.estimated_price_min || 0,
    estimated_price_max: originalPayload.estimated_price_max || 0,
    type: originalPayload.type || [],
    status: "planning" as const,
    circular: originalPayload.circular || false,
  };

  const vehicleIds = originalPayload.vehicleIds || [];
  const tripWithItinerary = await TripService.createTripWithRelations(
    userId,
    vehicleIds,
    tripPayload,
    originalPayload.origin,
    originalPayload.destination,
  );
  const tripId = tripWithItinerary.trip.id!;

  await createIntermediateStopsFromAI(itineraryAI, tripId);

  return await ItineraryService.getTripItinerary(tripId);
}

/**
 * Solicita al LLM (Gemini) la generación de un itinerario y valida la respuesta
 * @param tripInput - Datos del viaje para construir el prompt
 * @param userPreferences - Preferencias del usuario (intereses, estilo de viaje)
 * @param vehicles - Lista de vehículos del usuario
 * @param telemetry - Datos opcionales de telemetría (tripId, userId, totalDays) para registro
 * @returns Itinerario parseado y validado devuelto por la IA
 */
export async function requestItineraryToLLM(
  tripInput: any,
  userPreferences: any,
  vehicles: any[],
  telemetry?: { tripId?: number; userId?: string; totalDays?: number },
) {
  const model = genAI.getGenerativeModel({ model: ITINERARY_GENERATOR_MODEL });
  const prompt = buildItineraryPrompt(tripInput, userPreferences, vehicles);

  // Telemetría para el Cap. 6 del TFG (latencia, coste por tokens, tasa
  // y tipología de respuestas inválidas/"alucinadas"). Fire-and-forget:
  // nunca debe alterar el resultado de la generación si falla el registro.
  const startedAt = Date.now();
  let usage:
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined;
  const recordOutcome = (
    outcome: AiGenerationOutcome,
    extra?: { errorMessage?: string; qualityFlags?: Record<string, unknown> },
  ) => {
    logAiGeneration({
      tripId: telemetry?.tripId,
      userId: telemetry?.userId,
      model: ITINERARY_GENERATOR_MODEL,
      latencyMs: Date.now() - startedAt,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      outcome,
      qualityFlags: extra?.qualityFlags ?? null,
      errorMessage: extra?.errorMessage ?? null,
    }).catch(() => {});
  };

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    usage = result.response.usageMetadata;
    raw = result.response.text();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordOutcome("api_error", { errorMessage });
    console.error("Error llamando a Gemini:", err);
    throw new Error(
      "No se pudo obtener un itinerario válido de la IA. Por favor, intenta de nuevo.",
    );
  }

  try {
    // Limpiar posibles marcadores de código markdown
    let cleanedRaw = raw.trim();
    if (cleanedRaw.startsWith("```json")) {
      cleanedRaw = cleanedRaw.substring(7);
    } else if (cleanedRaw.startsWith("```")) {
      cleanedRaw = cleanedRaw.substring(3);
    }
    if (cleanedRaw.endsWith("```")) {
      cleanedRaw = cleanedRaw.substring(0, cleanedRaw.length - 3);
    }
    cleanedRaw = cleanedRaw.trim();

    // Extraer JSON
    const start = cleanedRaw.indexOf("{");
    const end = cleanedRaw.lastIndexOf("}");

    if (start === -1 || end === -1) {
      recordOutcome("json_parse_error", {
        errorMessage:
          "La respuesta no contiene ningún objeto JSON delimitado por { }",
      });
      throw new Error("La IA no devolvió un JSON válido");
    }

    const jsonStr = cleanedRaw.substring(start, end + 1);
    let itinerary: any;
    try {
      itinerary = JSON.parse(jsonStr);
    } catch (parseErr) {
      recordOutcome("json_parse_error", {
        errorMessage:
          parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      throw new Error("La IA no devolvió un JSON válido");
    }

    console.log("\n📑 Respuesta de la IA (JSON parseado):");
    console.log(JSON.stringify(itinerary, null, 2));

    // Validar estructura usando la función del prompt
    if (!validateItineraryResponse(itinerary)) {
      console.error(
        "❌ Validación fallida. Campos recibidos:",
        Object.keys(itinerary),
      );
      console.error(
        "Estructura esperada: name, description, accomodationstop[], activitystop[]",
      );
      recordOutcome("validation_failed", {
        errorMessage: `Campos recibidos: ${Object.keys(itinerary).join(", ")}`,
      });
      throw new Error(
        "La respuesta de la IA no contiene todos los campos requeridos o tiene un formato inválido",
      );
    }

    // La respuesta pasa la validación estructural, pero puede contener
    // anomalías de contenido (p. ej. días que no existen en el viaje).
    // Se registran como quality_flags: son "alucinaciones" de datos, no
    // de formato, y alimentan el análisis de la sección 6.3.
    let qualityFlags: Record<string, unknown> | undefined;
    if (telemetry?.totalDays !== undefined) {
      const droppedDays = getUniqueDaysFromAI(itinerary).filter(
        (d) => d > telemetry.totalDays!,
      );
      if (droppedDays.length > 0) {
        qualityFlags = { days_out_of_range: droppedDays };
      }
    }

    recordOutcome("success", { qualityFlags });
    return itinerary;
  } catch (err) {
    console.error("Error llamando a Gemini:", err);
    throw new Error(
      "No se pudo obtener un itinerario válido de la IA. Por favor, intenta de nuevo.",
    );
  }
}
