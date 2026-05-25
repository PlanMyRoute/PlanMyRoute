import { Accommodation } from '@planmyroute/types';
import * as TripService from "../trips/trips.service.js";
import * as ItineraryService from "../itinerary/itinerary.service.js";
import genAI from "../../utils/gemini.js";
import {
    buildItineraryPrompt,
    validateItineraryResponse,
    ITINERARY_GENERATOR_MODEL
} from "./prompts/itineraryGenerator.js";

type Coord = { lat: number; lng: number };

const ROAD_FACTOR = 1.25;
const AVG_SPEED_KMH = 90;
const MAX_CONTINUOUS_HOURS = 8;
const DEFAULT_FUEL_PRICE = 1.8; // €/L
const DEFAULT_CONSUMPTION_L_PER_100 = 8; // l/100km

// Haversine (km)
export function haversineKm(a: Coord, b: Coord): number {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const A = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
    return R * C;
}

export function estimateRoadDistanceKm(a: Coord, b: Coord): number {
    const flat = haversineKm(a, b);
    return flat * ROAD_FACTOR;
}

export function estimateDrivingHours(distanceKm: number): number {
    return distanceKm / AVG_SPEED_KMH;
}

export function estimateBudget(params: {
    distance_km: number,
    days: number,
    n_adults: number,
    vehicle_consumption_l_per_100?: number,
    fuel_price_per_l?: number
}) {
    const { distance_km, days, n_adults, vehicle_consumption_l_per_100, fuel_price_per_l } = params;
    const nights = Math.max(0, days - 1);
    const aloj_per_noche_person = 40;
    const comida_per_day_person = 20;
    const activities_per_day_person = 10;

    const alojamiento = aloj_per_noche_person * nights * Math.max(1, n_adults);
    const comida = comida_per_day_person * days * Math.max(1, n_adults);
    const activities = activities_per_day_person * days * Math.max(1, n_adults);

    const consumption = vehicle_consumption_l_per_100 ?? DEFAULT_CONSUMPTION_L_PER_100;
    const fuel_price = fuel_price_per_l ?? DEFAULT_FUEL_PRICE;
    const fuel_l = (distance_km / 100) * consumption;
    const fuel_cost = fuel_l * fuel_price;

    const estimate_min = Math.round(alojamiento + comida + activities + fuel_cost);
    const estimate_max = Math.round(estimate_min * 1.8);

    return {
        estimate_min,
        estimate_max,
        fuel_l: Number(fuel_l.toFixed(2)),
        fuel_cost: Number(fuel_cost.toFixed(2))
    };
}

export function validateTripBasic(params: {
    origin?: Coord | null,
    destination?: Coord | null,
    start_date: string,
    end_date: string,
    n_adults?: number,
    budget_total?: number
}) {
    const warnings: string[] = [];
    if (!params.origin || !params.destination) {
        return {
            ok: false,
            code: 'missing_coords',
            message: 'Faltan coordenadas de origen o destino.'
        };
    }
    const distance_km = estimateRoadDistanceKm(params.origin, params.destination);
    const driving_hours = estimateDrivingHours(distance_km);
    const sd = new Date(params.start_date);
    const ed = new Date(params.end_date);
    const msPerDay = 24 * 3600 * 1000;
    const days = Math.max(1, Math.round((ed.getTime() - sd.getTime()) / msPerDay) + 1);

    const min_days_by_drive = Math.ceil(driving_hours / MAX_CONTINUOUS_HOURS);
    const min_recommended_days = Math.max(min_days_by_drive + 0, 1); // +0 para keep minimal

    if (driving_hours > days * 12) { // margen: si requiere >12h/día total -> warning serio
        warnings.push(`Con las fechas seleccionadas se necesitan ~${Math.round(driving_hours)} h de conducción; considera aumentar días.`);
    } else if (driving_hours > days * 8) {
        warnings.push(`El itinerario requiere ~${Math.round(driving_hours)} h conducción; puede resultar agotador.`);
    }

    // Budget: estimation using defaults
    const budgetEst = estimateBudget({
        distance_km,
        days,
        n_adults: params.n_adults ?? 1
    });

    if (params.budget_total && params.budget_total < budgetEst.estimate_min * 0.6) {
        warnings.push('El presupuesto proporcionado es claramente insuficiente comparado con una estimación mínima.');
    }

    return {
        ok: warnings.length === 0,
        distance_km: Math.round(distance_km),
        driving_hours: Number(driving_hours.toFixed(1)),
        days,
        min_recommended_days,
        budgetEst,
        warnings
    };
}

function parseEntryPrice(raw: any): number | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const m = raw.match(/\d+/);
        if (m) return parseInt(m[0]);
        if (raw.toLowerCase().includes('gratis')) return 0;
    }
    return null;
}

function parseDurationMinutes(stop: any): number | null {
    if (stop.estimated_duration_minutes !== undefined && stop.estimated_duration_minutes !== null) {
        if (typeof stop.estimated_duration_minutes === 'number') return Math.round(stop.estimated_duration_minutes);
        const n = parseFloat(stop.estimated_duration_minutes);
        if (!isNaN(n)) return Math.round(n);
    }
    if (stop.estimated_duration !== undefined) {
        const n = typeof stop.estimated_duration === 'number'
            ? stop.estimated_duration
            : parseFloat(stop.estimated_duration);
        if (!isNaN(n)) return Math.round(n * 60);
    }
    return null;
}

/**
 * Crea las paradas de un día concreto para un viaje.
 * Creación secuencial (no paralela) para evitar race conditions en posiciones.
 */
export async function createStopsForDay(itineraryAI: any, tripId: number, day: number): Promise<void> {
    const accommodationStops = (itineraryAI.accomodationstop || []).filter((s: any) => s.day === day);
    const activityStops = (itineraryAI.activitystop || []).filter((s: any) => s.day === day);

    for (const stop of accommodationStops) {
        try {
            const stopData: any = {
                name: stop.name,
                address: stop.address,
                description: stop.description,
                type: 'intermedia' as const,
                day: stop.day,
                estimated_arrival: stop.estimated_arrival || null,
            };
            const accommodationData = {
                nights: stop.nights,
                price_per_night: stop.price_per_night ?? null,
                url: stop.url,
                contact: stop.contact,
            };
            await ItineraryService.createAccommodationStop(stopData, accommodationData, tripId);
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
                type: 'intermedia' as const,
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
    for (const s of (itineraryAI.accomodationstop || [])) if (s.day) days.add(s.day);
    for (const s of (itineraryAI.activitystop || [])) if (s.day) days.add(s.day);
    return Array.from(days).sort((a, b) => a - b);
}

/**
 * Crea TODAS las paradas intermedias de la IA para un viaje (flujo legacy/síncrono).
 */
export async function createIntermediateStopsFromAI(itineraryAI: any, tripId: number): Promise<void> {
    const days = getUniqueDaysFromAI(itineraryAI);
    for (const day of days) {
        await createStopsForDay(itineraryAI, tripId, day);
    }
}

export async function createTripFromAI(itineraryAI: any, userId: string, originalPayload: any) {
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
        status: 'planning' as const,
        circular: originalPayload.circular || false,
    };

    const vehicleIds = originalPayload.vehicleIds || [];
    const tripWithItinerary = await TripService.createTripWithRelations(
        userId, vehicleIds, tripPayload, originalPayload.origin, originalPayload.destination
    );
    const tripId = tripWithItinerary.trip.id!;

    await createIntermediateStopsFromAI(itineraryAI, tripId);

    return await ItineraryService.getTripItinerary(tripId);
}

export async function requestItineraryToLLM(tripInput: any, userPreferences: any, vehicles: any[]) {
    const model = genAI.getGenerativeModel({ model: ITINERARY_GENERATOR_MODEL });
    const prompt = buildItineraryPrompt(tripInput, userPreferences, vehicles);

    try {
        const result = await model.generateContent(prompt);
        const raw = result.response.text();

        // Limpiar posibles marcadores de código markdown
        let cleanedRaw = raw.trim();
        if (cleanedRaw.startsWith('```json')) {
            cleanedRaw = cleanedRaw.substring(7);
        } else if (cleanedRaw.startsWith('```')) {
            cleanedRaw = cleanedRaw.substring(3);
        }
        if (cleanedRaw.endsWith('```')) {
            cleanedRaw = cleanedRaw.substring(0, cleanedRaw.length - 3);
        }
        cleanedRaw = cleanedRaw.trim();

        // Extraer JSON
        const start = cleanedRaw.indexOf("{");
        const end = cleanedRaw.lastIndexOf("}");

        if (start === -1 || end === -1) {
            throw new Error("La IA no devolvió un JSON válido");
        }

        const jsonStr = cleanedRaw.substring(start, end + 1);
        const itinerary = JSON.parse(jsonStr);

        console.log('\n📑 Respuesta de la IA (JSON parseado):');
        console.log(JSON.stringify(itinerary, null, 2));

        // Validar estructura usando la función del prompt
        if (!validateItineraryResponse(itinerary)) {
            console.error('❌ Validación fallida. Campos recibidos:', Object.keys(itinerary));
            console.error('Estructura esperada: name, description, accomodationstop[], activitystop[]');
            throw new Error("La respuesta de la IA no contiene todos los campos requeridos o tiene un formato inválido");
        }

        return itinerary;

    } catch (err) {
        console.error("Error llamando a Gemini:", err);
        throw new Error("No se pudo obtener un itinerario válido de la IA. Por favor, intenta de nuevo.");
    }
}



