import { Request, Response } from 'express';
import { suggestRefuelStops } from './refuelAdvisor.service.js';
import * as ItineraryService from '../itinerary/itinerary.service.js';
import * as TokenWalletService from '../../services/tokenWalletService.js';
import { InsufficientTokensError } from '../../services/tokenWalletService.js';
import { getIsPremium } from '../subscriptions/subscriptions.service.js';

/**
 * POST /api/trips/:tripId/suggest-refuel
 *
 * Analiza el itinerario y devuelve sugerencias de paradas de repostaje.
 * Cobra ADDON_REFUEL tokens (gratis para premium).
 */
export async function suggestRefuel(req: Request, res: Response) {
    try {
        const tripId = parseInt(req.params.tripId, 10);
        const userId = (req as any).userId as string;

        if (isNaN(tripId)) {
            return res.status(400).json({ error: 'tripId inválido' });
        }

        // Cobrar tokens antes de llamar a la API externa
        const isPremium = await getIsPremium(userId);
        try {
            await TokenWalletService.spend(userId, 'ADDON_REFUEL', isPremium, {
                trip_id: tripId,
            });
        } catch (err) {
            if (err instanceof InsufficientTokensError) {
                return res.status(402).json({
                    error: 'No tienes tokens suficientes para usar el asistente de repostaje.',
                    code: 'INSUFFICIENT_TOKENS',
                    required: err.required,
                    balance: err.balance,
                });
            }
            throw err;
        }

        const suggestions = await suggestRefuelStops(tripId);

        if (suggestions.length === 0) {
            return res.json({
                suggestions: [],
                message: 'El vehículo llega a todas las paradas sin necesidad de repostar.',
            });
        }

        return res.json({ suggestions });
    } catch (error) {
        console.error('❌ Error en suggestRefuel:', error);
        return res.status(500).json({ error: 'Error al calcular paradas de repostaje' });
    }
}

interface ApplySelection {
    insertAfterStopId: number;
    day: number;
    position: number;
    station: {
        place_id: string;
        name: string;
        address: string;
        lat: number;
        lng: number;
    };
    fuelType?: string;
}

/**
 * POST /api/trips/:tripId/apply-refuel
 *
 * Crea las paradas de repostaje seleccionadas por el usuario a partir de
 * las sugerencias devueltas por suggest-refuel.
 *
 * Body: { selections: ApplySelection[] }
 */
export async function applyRefuelSuggestions(req: Request, res: Response) {
    try {
        const tripId = parseInt(req.params.tripId, 10);

        if (isNaN(tripId)) {
            return res.status(400).json({ error: 'tripId inválido' });
        }

        const { selections } = req.body as { selections: ApplySelection[] };

        if (!Array.isArray(selections) || selections.length === 0) {
            return res.status(400).json({ error: 'No hay selecciones para aplicar' });
        }

        const created = [];

        for (const sel of selections) {
            const stopData: any = {
                name: sel.station.name,
                address: sel.station.address,
                coordinates: { latitude: sel.station.lat, longitude: sel.station.lng },
                type: 'intermedia' as const,
                day: sel.day,
                position: sel.position,
                trip_id: tripId,
            };

            const refuelData: any = {
                fuel_type: sel.fuelType ?? null,
                // liters, price_per_unit y station_brand los rellena el usuario después
            };

            const { stop, refuel } = await ItineraryService.createRefuelStop(
                stopData,
                refuelData,
                tripId
            );

            created.push({ stop, refuel });
        }

        return res.status(201).json({ created });
    } catch (error) {
        console.error('❌ Error en applyRefuelSuggestions:', error);
        return res.status(500).json({ error: 'Error al crear las paradas de repostaje' });
    }
}
