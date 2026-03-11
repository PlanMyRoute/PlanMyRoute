import { Request, Response } from 'express';
import * as svc from './automaticTrip.service.js';
import { requestItineraryToLLM, createTripFromAI } from "./automaticTrip.service.js";
import { getUserInterests } from '../users/users.service.js';
import * as VehicleService from '../vehicles/vehicles.service.js';
import * as UserUsageService from '../../services/userUsageService.js';

export interface UserPreferences {
    interests?: string[];
    travelStyle?: 'explorer' | 'balanced' | 'sedentary';
}

export async function validateTrip(req: Request, res: Response) {
    try {
        const body = req.body;
        // Esperamos origin, destination con coords, start_date, end_date
        const { origin, destination, start_date, end_date, n_adults, budget_total } = body;
        const result = svc.validateTripBasic({
            origin: origin?.coords || origin, // acepta { coords: {lat,lng} } o {lat,lng}
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
        const userId = req.params.userId;
        const tripInput = req.body;

        // Validar datos de entrada
        if (!tripInput.origin || !tripInput.destination) {
            return res.status(400).json({
                error: 'Se requieren origen y destino para generar el viaje'
            });
        }

        if (!tripInput.start_date || !tripInput.end_date) {
            return res.status(400).json({
                error: 'Se requieren fechas de inicio y fin para generar el viaje'
            });
        }

        // Verificar si el usuario puede crear un viaje con IA
        const usageCheck = await UserUsageService.canCreateAITrip(userId);
        if (!usageCheck.canCreate) {
            console.log(`⛔ Usuario ${userId} ha alcanzado el límite de viajes IA (${usageCheck.usedCount}/${usageCheck.maxCount})`);
            return res.status(403).json({
                error: usageCheck.reason,
                usedCount: usageCheck.usedCount,
                maxCount: usageCheck.maxCount,
                requiresPremium: true
            });
        }

        console.log(`\n🚀 Generando viaje automático para usuario ${userId}`);
        console.log(`   Origen: ${tripInput.origin}`);
        console.log(`   Destino: ${tripInput.destination}`);
        console.log(`   Fechas: ${tripInput.start_date} → ${tripInput.end_date}`);
        console.log(`   Adultos: ${tripInput.n_adults || 1}`);
        console.log(`   Presupuesto minimo: ${tripInput.estimated_price_min || 'No especificado'}€\n`);
        console.log(`   Presupuesto maximo: ${tripInput.estimated_price_max || 'No especificado'}€\n`);

        // TODO: Obtener preferencias del usuario desde la base de datos

        const userPreferences = { interests: await getUserInterests(userId), travelStyle: tripInput.travelStyle } as UserPreferences;

        // Obtener vehículos completos a partir de los IDs
        const vehicleIds = tripInput.vehicleIds || [];
        const vehicles = [];

        if (vehicleIds.length > 0) {
            for (const vehicleId of vehicleIds) {
                const vehicle = await VehicleService.getVehicleFromId(vehicleId);
                if (vehicle) {
                    vehicles.push(vehicle);
                }
            }
        }

        // 1. Llamar a la IA para generar el itinerario
        console.log('📝 Solicitando itinerario a la IA...');
        const itineraryAI = await requestItineraryToLLM(tripInput, userPreferences, vehicles);
        // 2. Crear viaje completo a partir de la respuesta de la IA
        console.log('💾 Creando viaje en la base de datos...');
        const finalTrip = await createTripFromAI(itineraryAI, userId, tripInput);

        // 3. Incrementar el contador de viajes IA generados
        await UserUsageService.incrementAITripsCount(userId);
        console.log(`📊 Contador de viajes IA incrementado para usuario ${userId}`);

        console.log(`✅ Viaje automático creado exitosamente: "${finalTrip.trip.name}"\n`);
        return res.status(201).json(finalTrip);

    } catch (error) {
        console.error("❌ Error creando viaje automático:", error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        return res.status(500).json({
            error: 'Error al generar el viaje automático',
            details: errorMessage
        });
    }
}

