import { Request, Response } from "express";
import { autoInsertRefuelStops } from "../refuelAdvisor/refuelAdvisor.service.js";
import * as svc from "./automaticTrip.service.js";
import {
  requestItineraryToLLM,
  createStopsForDay,
  getUniqueDaysFromAI,
  createStopsForDayFast,
  enrichStopsForTrip,
} from "./automaticTrip.service.js";
import { getUserInterests } from "../users/users.service.js";
import * as VehicleService from "../vehicles/vehicles.service.js";
import * as TokenWalletService from "../../services/tokenWalletService.js";
import { InsufficientTokensError } from "../../services/tokenWalletService.js";
import { getIsPremium } from "../subscriptions/subscriptions.service.js";
import * as TripService from "../trips/trips.service.js";
import * as ItineraryService from "../itinerary/itinerary.service.js";

export interface UserPreferences {
  interests?: string[];
  travelStyle?: "explorer" | "balanced" | "sedentary";
  travelSpendingLevel?: "saver" | "balanced" | "luxury";
}

/**
 * Controlador para validar los datos básicos de un viaje antes de generarlo
 * @param req - Petición HTTP con origen, destino, fechas, adultos y presupuesto en body
 * @param res - Respuesta HTTP con el resultado de la validación
 */
export async function validateTrip(req: Request, res: Response) {
  try {
    const body = req.body;
    const {
      origin,
      destination,
      start_date,
      end_date,
      n_adults,
      budget_total,
    } = body;
    const result = svc.validateTripBasic({
      origin: origin?.coords || origin,
      destination: destination?.coords || destination,
      start_date,
      end_date,
      n_adults,
      budget_total,
    });
    res.json(result);
    return;
  } catch (err) {
    console.error("validateTrip error", err);
    res.status(500).json({ ok: false, error: String(err) });
    return;
  }
}

/**
 * Controlador para generar un viaje automático con itinerario de IA
 * @param req - Petición HTTP con userId en params y datos del viaje en body
 * @param res - Respuesta HTTP 202 con el viaje creado; la generación del itinerario continúa en background
 */
export async function generateAutomaticTrip(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;
    const tripInput = req.body;

    if (!tripInput.origin || !tripInput.destination) {
      res
        .status(400)
        .json({ error: "Se requieren origen y destino para generar el viaje" });
      return;
    }
    if (
      typeof tripInput.origin !== "string" ||
      tripInput.origin.length > 500 ||
      typeof tripInput.destination !== "string" ||
      tripInput.destination.length > 500
    ) {
      res
        .status(400)
        .json({ error: "Origen o destino inválidos (máx. 500 caracteres)" });
      return;
    }
    if (!tripInput.start_date || !tripInput.end_date) {
      res.status(400).json({
        error: "Se requieren fechas de inicio y fin para generar el viaje",
      });
      return;
    }
    const startDate = new Date(tripInput.start_date);
    const endDate = new Date(tripInput.end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ error: "Fechas de inicio o fin inválidas" });
      return;
    }
    if (endDate < startDate) {
      res.status(400).json({
        error: "La fecha de fin no puede ser anterior a la de inicio",
      });
      return;
    }
    if (
      tripInput.estimated_price_min != null &&
      (typeof tripInput.estimated_price_min !== "number" ||
        tripInput.estimated_price_min < 0)
    ) {
      res.status(400).json({ error: "Presupuesto mínimo inválido" });
      return;
    }
    if (
      tripInput.estimated_price_max != null &&
      (typeof tripInput.estimated_price_max !== "number" ||
        tripInput.estimated_price_max < 0)
    ) {
      res.status(400).json({ error: "Presupuesto máximo inválido" });
      return;
    }
    if (
      tripInput.n_adults != null &&
      (typeof tripInput.n_adults !== "number" || tripInput.n_adults < 1)
    ) {
      res
        .status(400)
        .json({ error: "Debe haber al menos 1 adulto en el viaje" });
      return;
    }

    // Cobro de tokens ANTES de generar: GENERATE_TRIP (+ ADDON_ROUNDTRIP si es circular, + ADDON_REFUEL si opt-in).
    // El cobro es atómico (RPC) y previene doble gasto en peticiones concurrentes.
    const isPremium = await getIsPremium(userId);
    const enableAutoRefuel = !!tripInput.enableAutoRefuel;
    let charged = 0;
    try {
      const result = await TokenWalletService.chargeGeneration(
        userId,
        isPremium,
        !!tripInput.circular,
        { action: "generate_trip" },
        enableAutoRefuel,
      );
      charged = result.charged;
    } catch (err) {
      if (err instanceof InsufficientTokensError) {
        res.status(402).json({
          error: "No tienes tokens suficientes para generar este viaje.",
          code: "INSUFFICIENT_TOKENS",
          required: err.required,
          balance: err.balance,
        });
        return;
      }
      throw err;
    }

    console.log(
      `\n🚀 Generando viaje IA para usuario ${userId}: ${tripInput.origin} → ${tripInput.destination} (cobrados ${charged} tokens)`,
    );

    const dbInterests = await getUserInterests(userId);
    const tripInterests: string[] = tripInput.type || [];
    const promptKeywords: string[] = tripInput.promptKeywords || [];
    const allInterests = [
      ...new Set([...dbInterests, ...tripInterests, ...promptKeywords]),
    ];

    const userPreferences: UserPreferences = {
      interests: allInterests,
      travelStyle: tripInput.travelStyle,
      travelSpendingLevel: tripInput.travelSpendingLevel,
    };

    const vehicleIds = tripInput.vehicleIds || [];
    const vehicles: any[] = [];
    for (const vehicleId of vehicleIds) {
      try {
        const vehicle = await VehicleService.getVehicleFromId(vehicleId);
        if (vehicle.user_id !== userId) {
          res.status(403).json({
            error: `El vehículo ${vehicleId} no pertenece al usuario`,
          });
          return;
        }
        vehicles.push(vehicle);
      } catch {
        // Si el vehículo no existe, se omite silenciosamente
      }
    }

    const tripInputForLLM = {
      ...tripInput,
      n_infants: tripInput.n_babies ?? 0,
      n_elderly: tripInput.n_elders ?? 0,
    };

    const totalDays = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
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
      status: "planning" as const,
      circular: tripInput.circular || false,
      generation_status: "generating",
    };

    let tripWithItinerary;
    try {
      tripWithItinerary = await TripService.createTripWithRelations(
        userId,
        vehicleIds,
        baseTripPayload,
        tripInput.origin,
        tripInput.destination,
      );
    } catch (err) {
      // Si no se pudo ni crear el viaje, reembolsamos los tokens cobrados.
      await TokenWalletService.refund(userId, charged, {
        reason: "trip_creation_failed",
      }).catch(() => {});
      throw err;
    }
    const tripId = tripWithItinerary.trip.id!;
    console.log(`✅ Viaje creado (id ${tripId}) — generando itinerario...`);

    // 2. Responder inmediatamente — el frontend navega al viaje sin esperar a la IA
    res
      .status(202)
      .json({ ...tripWithItinerary, generation_status: "generating" });

    // 3. Llamar a la IA y crear todas las paradas en background
    generateItineraryInBackground(
      tripId,
      userId,
      tripInputForLLM,
      userPreferences,
      vehicles,
      totalDays,
      enableAutoRefuel,
    ).catch(async (err) => {
      console.error(
        `❌ [Background] Error generando itinerario para trip ${tripId}:`,
        err,
      );
      await TripService.update(String(tripId), {
        generation_status: "failed",
      } as any).catch(() => {});
      // La generación falló: devolvemos los tokens cobrados.
      await TokenWalletService.refund(userId, charged, {
        trip_id: tripId,
        reason: "generation_failed",
      }).catch(() => {});
    });
  } catch (error) {
    console.error("❌ Error creando viaje automático:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Error al generar el viaje automático",
      details: errorMessage,
    });
    return;
  }
}

async function generateItineraryInBackground(
  tripId: number,
  userId: string,
  tripInputForLLM: any,
  userPreferences: UserPreferences,
  vehicles: any[],
  totalDays: number,
  enableAutoRefuel: boolean,
) {
  console.log(
    `📝 [Background] Solicitando itinerario a la IA para trip ${tripId}...`,
  );
  const itineraryAI = await requestItineraryToLLM(
    tripInputForLLM,
    userPreferences,
    vehicles,
    { tripId, userId, totalDays },
  );

  if (itineraryAI.description) {
    await TripService.update(String(tripId), {
      description: itineraryAI.description,
    } as any);
  }

  const allDays = getUniqueDaysFromAI(itineraryAI).filter(
    (d) => d >= 1 && d <= totalDays,
  );
  const droppedDays = getUniqueDaysFromAI(itineraryAI).filter(
    (d) => d > totalDays,
  );
  if (droppedDays.length > 0) {
    console.warn(
      `⚠️ La IA generó días fuera de rango (totalDays=${totalDays}): ${droppedDays.join(", ")} — ignorados.`,
    );
  }

  // Phase 1: fast inserts — text + geocoding only, no photos/prices.
  // Stops appear immediately in the frontend via polling.
  const allStopIds: number[] = [];
  for (const day of allDays) {
    console.log(
      `⚡ [Background] Fast-insert paradas del día ${day} para trip ${tripId}...`,
    );
    const ids = await createStopsForDayFast(itineraryAI, tripId, day, totalDays);
    allStopIds.push(...ids);
  }
  console.log(
    `⚡ [Background] ${allStopIds.length} paradas insertadas (sin fotos/precios) para trip ${tripId}`,
  );

  // Corregir colisiones de posición: origin/destination y AI fast-inserts
  // compiten por position=1 dentro del mismo día. Reorganizar antes de que
  // el advisor de repostaje calcule la posición de inserción.
  await ItineraryService.reorganizePositions(tripId);
  console.log(`🔧 [Background] Posiciones reorganizadas para trip ${tripId}`);

  // Phase 2: background enrichment — photos + prices in parallel batches, then rebuild routes.
  console.log(
    `⚙️ [Background] Iniciando enriquecimiento de ${allStopIds.length} paradas para trip ${tripId}...`,
  );
  await enrichStopsForTrip(allStopIds, tripId);
  console.log(
    `✨ [Background] Enriquecimiento (fotos + precios) completado para trip ${tripId}`,
  );

  await TripService.update(String(tripId), {
    generation_status: "ready",
  } as any);
  console.log(`✅ [Background] Generación completa para trip ${tripId}`);

  if (enableAutoRefuel) {
    autoInsertRefuelStops(tripId).catch(() => {});
  }
}
