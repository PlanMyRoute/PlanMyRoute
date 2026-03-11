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

export async function createTripFromAI(itineraryAI: any, userId: string, originalPayload: any) {
    // 1. Crear el viaje con los datos generados por la IA + los originales del usuario
    // Solo incluir campos que existen en la tabla trip
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
        type: originalPayload.type || [], // Array de intereses
        status: 'planning' as const,
        circular: originalPayload.circular || false
    };

    // 2. Crear el viaje con origen y destino
    const vehicleIds = originalPayload.vehicleIds || [];
    const tripWithItinerary = await TripService.createTripWithRelations(
        userId,
        vehicleIds,
        tripPayload,
        originalPayload.origin,
        originalPayload.destination
    );

    // 3. Crear las paradas intermedias
    // Tipo: accomodation
    if (itineraryAI.accomodationstop && Array.isArray(itineraryAI.accomodationstop)) {
        console.log(`Creando ${itineraryAI.accomodationstop.length} paradas de alojamiento...`);

        for (const stop of itineraryAI.accomodationstop) {
            try {
                const stopData: any = {
                    name: stop.name,
                    address: stop.address,
                    description: stop.description,
                    type: 'intermedia' as const,
                };

                // Añadir day y estimated_arrival si la IA los proporcionó
                if (stop.day !== undefined) {
                    stopData.day = stop.day;
                }
                if (stop.estimated_arrival) {
                    stopData.estimated_arrival = stop.estimated_arrival;
                }

                const accommodationData = {
                    nights: stop.nights,
                    url: stop.url,
                    contact: stop.contact,
                };

                await ItineraryService.createAccommodationStop(stopData, accommodationData, tripWithItinerary.trip.id!);
                console.log(`✓ Parada de alojamiento creada: ${stop.name} (Día ${stop.day || '?'}, ${stop.estimated_arrival || 'sin hora'})`);
            } catch (error) {
                console.error(`Error creando parada de alojamiento "${stop.name}":`, error);
                // Continuar con las demás paradas aunque una falle
            }
        }
    }

    // Tipo: activity
    if (itineraryAI.activitystop && Array.isArray(itineraryAI.activitystop)) {
        console.log(`Creando ${itineraryAI.activitystop.length} paradas de actividad...`);

        for (const stop of itineraryAI.activitystop) {
            try {
                const stopData: any = {
                    name: stop.name,
                    address: stop.address,
                    description: stop.description,
                    type: 'intermedia' as const,
                };

                // Añadir day y estimated_arrival si la IA los proporcionó
                if (stop.day !== undefined) {
                    stopData.day = stop.day;
                }
                if (stop.estimated_arrival) {
                    stopData.estimated_arrival = stop.estimated_arrival;
                }

                // Procesar entry_price: convertir strings a números o null
                let entry_price = null;
                if (stop.entry_price !== undefined && stop.entry_price !== null) {
                    if (typeof stop.entry_price === 'number') {
                        entry_price = stop.entry_price;
                    } else if (typeof stop.entry_price === 'string') {
                        // Intentar extraer número del string
                        const match = stop.entry_price.match(/\d+/);
                        if (match) {
                            entry_price = parseInt(match[0]);
                        } else if (stop.entry_price.toLowerCase().includes('gratis')) {
                            entry_price = 0;
                        }
                        // Si no se puede parsear, se queda como null
                    }
                }

                // Procesar estimated_duration_minutes: convertir a número entero
                let duration_minutes = null;
                if (stop.estimated_duration_minutes !== undefined && stop.estimated_duration_minutes !== null) {
                    if (typeof stop.estimated_duration_minutes === 'number') {
                        duration_minutes = Math.round(stop.estimated_duration_minutes);
                    } else if (typeof stop.estimated_duration_minutes === 'string') {
                        const num = parseFloat(stop.estimated_duration_minutes);
                        if (!isNaN(num)) {
                            duration_minutes = Math.round(num);
                        }
                    }
                } else if (stop.estimated_duration !== undefined) {
                    // Fallback al campo antiguo si existe
                    const num = typeof stop.estimated_duration === 'number'
                        ? stop.estimated_duration
                        : parseFloat(stop.estimated_duration);
                    if (!isNaN(num)) {
                        // Asumir que está en horas y convertir a minutos
                        duration_minutes = Math.round(num * 60);
                    }
                }

                const activityData = {
                    category: stop.category,
                    entry_price: entry_price,
                    booking_required: stop.booking_required,
                    estimated_duration_minutes: duration_minutes,
                    url: stop.url,
                };

                await ItineraryService.createActivityStop(stopData, activityData, tripWithItinerary.trip.id!);
                console.log(`✓ Parada de actividad creada: ${stop.name} (Día ${stop.day || '?'}, ${stop.estimated_arrival || 'sin hora'})`);
            } catch (error) {
                console.error(`Error creando parada de actividad "${stop.name}":`, error);
                // Continuar con las demás paradas aunque una falle
            }
        }
    }

    // 4. Retornar el itinerario completo actualizado
    return await ItineraryService.getTripItinerary(tripWithItinerary.trip.id!);
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



