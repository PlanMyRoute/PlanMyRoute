import { Request, Response } from 'express';
import * as svc from './automaticTrip.service.js';
import {
    requestItineraryToLLM,
    createStopsForDay,
    getUniqueDaysFromAI,
} from "./automaticTrip.service.js";
import { getUserInterests } from '../users/users.service.js';
import * as VehicleService from '../vehicles/vehicles.service.js';
import * as TokenWalletService from '../../services/tokenWalletService.js';
import { InsufficientTokensError } from '../../services/tokenWalletService.js';
import { getIsPremium } from '../subscriptions/subscriptions.service.js';
import * as TripService from '../trips/trips.service.js';
import * as ItineraryService from '../itinerary/itinerary.service.js';

export interface UserPreferences {
    interests?: string[];
    travelStyle?: 'explorer' | 'balanced' | 'sedentary';
}

export async function validateTrip(req: Request, res: Response) {
    try {
        const body = req.body;
        const { origin, destination, start_date, end_date, n_adults, budget_total } = body;
        const result = svc.validateTripBasic({
            origin: origin?.coords || origin,
            destination: destination?.coords || destination,
            start_date,
            end_date,
            n_adults,
            budget_total
        });
        res.json(result); return;
    } catch (err) {
        console.error('validateTrip error', err);
        res.status(500).json({ ok: false, error: String(err) }); return;
    }
}

export async function generateAutomaticTrip(req: Request, res: Response) {
    try {
        const userId = req.params.userId as string;
        const tripInput = req.body;

        if (!tripInput.origin || !tripInput.destination) {
            res.status(400).json({ error: 'Se requieren origen y destino para generar el viaje' }); return;
        }
        if (!tripInput.start_date || !tripInput.end_date) {
            res.status(400).json({ error: 'Se requieren fechas de inicio y fin para generar el viaje' }); return;
        }

        // Cobro de tokens ANTES de generar: GENERATE_TRIP (+ ADDON_ROUNDTRIP si es circular).
        // El cobro es atómico (RPC) y previene doble gasto en peticiones concurrentes.
        const isPremium = await getIsPremium(userId);
        let charged = 0;
        try {
            const result = await TokenWalletService.chargeGeneration(
                userId,
                isPremium,
                !!tripInput.circular,
                { action: 'generate_trip' }
            );
            charged = result.charged;
        } catch (err) {
            if (err instanceof InsufficientTokensError) {
                res.status(402).json({
                    error: 'No tienes tokens suficientes para generar este viaje.',
                    code: 'INSUFFICIENT_TOKENS',
                    required: err.required,
                    balance: err.balance,
                }); return;
            }
            throw err;
        }

        console.log(`\n🚀 Generando viaje IA para usuario ${userId}: ${tripInput.origin} → ${tripInput.destination} (cobrados ${charged} tokens)`);

        const userPreferences: UserPreferences = {
            interests: await getUserInterests(userId),
            travelStyle: tripInput.travelStyle
        };

        const vehicleIds = tripInput.vehicleIds || [];
        const vehicles: any[] = [];
        for (const vehicleId of vehicleIds) {
            const vehicle = await VehicleService.getVehicleFromId(vehicleId);
            if (vehicle) vehicles.push(vehicle);
        }

        const tripInputForLLM = {
            ...tripInput,
            n_infants: tripInput.n_babies ?? 0,
            n_elderly: tripInput.n_elders ?? 0,
        };

        const startDate = new Date(tripInput.start_date);
        const endDate = new Date(tripInput.end_date);
        const totalDays = Math.max(
            1,
            Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
        );

        // 1. Crear el viaje inmediatamente, antes de llamar a la IA
        const baseTripPayload = {
            name: tripInput.name,
            description: `Viaje de ${tripInput.origin} a ${tripInput.destination}`,
            start_date: tripInput.start_date,
            end_date: tripInput.end_date,
            start_time: tripInput.start_time || null,
            end_time: tripInput.end_time || null,
            n_adults: tripInput.n_adults || 1,
            n_children: tripInput.n_children || 0,
            n_babies: tripInput.n_babies || 0,
            n_elders: tripInput.n_elders || 0,
            n_pets: tripInput.n_pets || 0,
            estimated_price_min: tripInput.estimated_price_min || 0,
            estimated_price_max: tripInput.estimated_price_max || 0,
            type: tripInput.type || [],
            status: 'planning' as const,
            circular: tripInput.circular || false,
            generation_status: 'generating',
        };

        let tripWithItinerary;
        try {
            tripWithItinerary = await TripService.createTripWithRelations(
                userId, vehicleIds, baseTripPayload, tripInput.origin, tripInput.destination
            );
        } catch (err) {
            // Si no se pudo ni crear el viaje, reembolsamos los tokens cobrados.
            await TokenWalletService.refund(userId, charged, { reason: 'trip_creation_failed' }).catch(() => {});
            throw err;
        }
        const tripId = tripWithItinerary.trip.id!;

        // 2. Responder inmediatamente — el frontend navega al viaje sin esperar a la IA
        res.status(202).json({ ...tripWithItinerary, generation_status: 'generating' });

        // 3. Llamar a la IA y crear todas las paradas en background
        generateItineraryInBackground(tripId, tripInputForLLM, userPreferences, vehicles, totalDays)
            .catch(async (err) => {
                console.error(`❌ [Background] Error generando itinerario para trip ${tripId}:`, err);
                await TripService.update(String(tripId), { generation_status: 'failed' } as any).catch(() => {});
                // La generación falló: devolvemos los tokens cobrados.
                await TokenWalletService.refund(userId, charged, { trip_id: tripId, reason: 'generation_failed' }).catch(() => {});
            });

    } catch (error) {
        console.error("❌ Error creando viaje automático:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
            error: 'Error al generar el viaje automático',
            details: errorMessage
        }); return;
    }
}

async function generateItineraryInBackground(
    tripId: number,
    tripInputForLLM: any,
    userPreferences: UserPreferences,
    vehicles: any[],
    totalDays: number
) {
    console.log(`📝 [Background] Solicitando itinerario a la IA para trip ${tripId}...`);
    const itineraryAI = await requestItineraryToLLM(tripInputForLLM, userPreferences, vehicles);

    if (itineraryAI.description) {
        await TripService.update(String(tripId), { description: itineraryAI.description } as any);
    }

    const allDays = getUniqueDaysFromAI(itineraryAI).filter(d => d >= 1 && d <= totalDays);
    const droppedDays = getUniqueDaysFromAI(itineraryAI).filter(d => d > totalDays);
    if (droppedDays.length > 0) {
        console.warn(`⚠️ La IA generó días fuera de rango (totalDays=${totalDays}): ${droppedDays.join(', ')} — ignorados.`);
    }

    for (const day of allDays) {
        console.log(`📅 [Background] Creando paradas del día ${day} para trip ${tripId}...`);
        await createStopsForDay(itineraryAI, tripId, day, totalDays);
        await ItineraryService.rebuildRoutesForTrip(tripId);
    }

    await TripService.update(String(tripId), { generation_status: 'ready' } as any);
    console.log(`✅ [Background] Generación completa para trip ${tripId}`);
}
