import { Request, Response } from 'express';
import * as svc from './automaticTrip.service.js';
import {
    requestItineraryToLLM,
    createStopsForDay,
    getUniqueDaysFromAI,
} from "./automaticTrip.service.js";
import { getUserInterests } from '../users/users.service.js';
import * as VehicleService from '../vehicles/vehicles.service.js';
import * as UserUsageService from '../../services/userUsageService.js';
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
        return res.json(result);
    } catch (err) {
        console.error('validateTrip error', err);
        return res.status(500).json({ ok: false, error: String(err) });
    }
}

export async function generateAutomaticTrip(req: Request, res: Response) {
    try {
        const userId = req.params.userId as string;
        const tripInput = req.body;

        if (!tripInput.origin || !tripInput.destination) {
            return res.status(400).json({ error: 'Se requieren origen y destino para generar el viaje' });
        }
        if (!tripInput.start_date || !tripInput.end_date) {
            return res.status(400).json({ error: 'Se requieren fechas de inicio y fin para generar el viaje' });
        }

        const usageCheck = await UserUsageService.canCreateAITrip(userId);
        if (!usageCheck.canCreate) {
            return res.status(403).json({
                error: usageCheck.reason,
                usedCount: usageCheck.usedCount,
                maxCount: usageCheck.maxCount,
                requiresPremium: true
            });
        }

        console.log(`\n🚀 Generando viaje IA para usuario ${userId}: ${tripInput.origin} → ${tripInput.destination}`);

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

        const tripWithItinerary = await TripService.createTripWithRelations(
            userId, vehicleIds, baseTripPayload, tripInput.origin, tripInput.destination
        );
        const tripId = tripWithItinerary.trip.id!;

        // 2. Responder inmediatamente — el frontend navega al viaje sin esperar a la IA
        res.status(202).json({ ...tripWithItinerary, generation_status: 'generating' });

        // 3. Llamar a la IA y crear todas las paradas en background
        generateItineraryInBackground(tripId, userId, tripInputForLLM, userPreferences, vehicles, totalDays)
            .catch(async (err) => {
                console.error(`❌ [Background] Error generando itinerario para trip ${tripId}:`, err);
                await TripService.update(String(tripId), { generation_status: 'failed' } as any).catch(() => {});
            });

    } catch (error) {
        console.error("❌ Error creando viaje automático:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
            error: 'Error al generar el viaje automático',
            details: errorMessage
        });
    }
}

async function generateItineraryInBackground(
    tripId: number,
    userId: string,
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
    await UserUsageService.incrementAITripsCount(userId);
    console.log(`✅ [Background] Generación completa para trip ${tripId}`);
}
