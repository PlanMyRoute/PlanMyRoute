import { Response } from "express";
import * as ItineraryService from "./itinerary.service.js";
import { autoInsertRefuelStops } from "../refuelAdvisor/refuelAdvisor.service.js";
import { getPlacePrice } from "../../utils/placePrices.js";
import { BadRequestError, asyncHandler } from "../../utils/errors.js";

/** Tamaño máximo de archivo para subida de adjuntos (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Verifica que la parada `stopId` pertenece realmente al viaje `tripId`.
 * Los permisos de la ruta se validan contra `:tripId`, pero sin esta comprobación
 * un editor de su propio viaje podría modificar paradas de otro viaje (IDOR)
 * pasando su tripId + un stopId ajeno.
 *
 * Si no coincide, responde 404 y devuelve `false` (el llamador debe abortar).
 */
async function ensureStopBelongsToTrip(
  stopId: string,
  tripId: string,
  res: Response,
): Promise<boolean> {
  const tripIdNum = Number(tripId);
  if (!Number.isInteger(tripIdNum) || tripIdNum <= 0) {
    res.status(400).json({ error: "ID de viaje inválido" });
    return false;
  }

  try {
    const stop = await ItineraryService.getStopById(stopId);
    if (!stop || (stop as { trip_id: number }).trip_id !== tripIdNum) {
      res.status(404).json({ error: "No se encontró la parada en este viaje" });
      return false;
    }
    return true;
  } catch {
    res.status(404).json({ error: "No se encontró la parada en este viaje" });
    return false;
  }
}

// =============== STOP CONTROLLERS ===============

/**
 * Obtiene una parada por su ID
 */
export const getStopById = asyncHandler(async (req, res) => {
  const { stopId } = req.params as Record<string, string>;
  const stop = await ItineraryService.getStopById(stopId);
  res.json(stop);
});

/**
 * Obtiene el precio de una parada específica
 * GET /api/stop/:stopId/price
 */
export const getStopPrice = asyncHandler(async (req, res) => {
  const { stopId } = req.params as Record<string, string>;
  const stop = await ItineraryService.getStopById(stopId);

  if (!stop.coordinates || typeof stop.coordinates !== "object") {
    res.status(400).json({
      error: "La parada no tiene coordenadas válidas",
      priceInfo: null,
    });
    return;
  }

  const priceInfo = await getPlacePrice(
    stop.name,
    stop.coordinates,
    stop.address,
  );

  res.json({ stopId, name: stop.name, priceInfo });
});

/**
 * Crea una nueva parada en el itinerario de un viaje
 */
export const createStop = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);

  const newStop = await ItineraryService.createStop(req.body, tripIdNum);
  res.status(201).json(newStop);

  // Cuando se añade el destino el itinerario está completo: analizar repostaje
  if (req.body?.type === "destino") {
    autoInsertRefuelStops(tripIdNum).catch(() => {});
  }
});

/**
 * Crea una parada de tipo actividad con sus datos específicos
 */
export const createActivityStop = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const { stopData, activityData } = req.body;

  const result = await ItineraryService.createActivityStop(
    stopData,
    activityData,
    tripIdNum,
  );
  res.status(201).json(result);
});

/**
 * Crea una parada de tipo alojamiento con sus datos específicos
 */
export const createAccommodationStop = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const { stopData, accommodationData } = req.body;

  const result = await ItineraryService.createAccommodationStop(
    stopData,
    accommodationData,
    tripIdNum,
  );
  res.status(201).json(result);
});

/**
 * Crea una parada de tipo repostaje con sus datos específicos
 */
export const createRefuelStop = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const { stopData, refuelData } = req.body;

  const result = await ItineraryService.createRefuelStop(
    stopData,
    refuelData,
    tripIdNum,
  );
  res.status(201).json(result);
});

/**
 * Obtiene los datos completos de una parada de tipo repostaje
 */
export const getRefuelStop = asyncHandler(async (req, res) => {
  const { stopId } = req.params as Record<string, string>;
  const result = await ItineraryService.getRefuelStop(stopId);
  res.json(result);
});

/**
 * Actualiza una parada existente con validaciones de posición y tipo
 */
export const updateStop = asyncHandler(async (req, res) => {
  const { stopId, tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);

  if (!(await ensureStopBelongsToTrip(stopId, tripId, res))) return;

  const stopData = req.body;

  // ⚠️ NO CAMBIAR EL TIPO AQUÍ - El type ya viene correcto del frontend
  // El type es la propiedad fundamental que define origen/destino/intermedia
  // NO se debe cambiar basándose en order

  const updatedStop = await ItineraryService.updateStop(
    stopId,
    stopData,
    tripIdNum,
  );
  res.json(updatedStop);
});

/**
 * Actualiza una parada de tipo actividad y sus datos específicos
 */
export const updateActivityStop = asyncHandler(async (req, res) => {
  const { stopId, tripId } = req.params as Record<string, string>;
  const { stopData, activityData } = req.body;

  if (!(await ensureStopBelongsToTrip(stopId, tripId, res))) return;

  const result = await ItineraryService.updateActivityStop(
    stopId,
    stopData || {},
    activityData || {},
  );
  res.json(result);
});

/**
 * Actualiza una parada de tipo alojamiento y sus datos específicos
 */
export const updateAccommodationStop = asyncHandler(async (req, res) => {
  const { stopId, tripId } = req.params as Record<string, string>;
  const { stopData, accommodationData } = req.body;

  if (!(await ensureStopBelongsToTrip(stopId, tripId, res))) return;

  const result = await ItineraryService.updateAccommodationStop(
    stopId,
    stopData || {},
    accommodationData || {},
  );
  res.json(result);
});

/**
 * Actualiza una parada de tipo repostaje y sus datos específicos
 */
export const updateRefuelStop = asyncHandler(async (req, res) => {
  const { stopId, tripId } = req.params as Record<string, string>;
  const { stopData, refuelData } = req.body;

  if (!(await ensureStopBelongsToTrip(stopId, tripId, res))) return;

  const result = await ItineraryService.updateRefuelStop(
    stopId,
    stopData || {},
    refuelData || {},
  );
  res.json(result);
});

/**
 * Elimina una parada y fusiona las rutas adyacentes si es necesario
 */
export const deleteStop = asyncHandler(async (req, res) => {
  const { stopId, tripId } = req.params as Record<string, string>;

  if (!(await ensureStopBelongsToTrip(stopId, tripId, res))) return;

  const result = await ItineraryService.deleteStop(stopId);
  if (result && typeof result === "object" && (result as any).id) {
    res.status(200).json({
      message: `Parada borrada y rutas fusionadas.`,
      mergedRoute: result,
    });
    return;
  }

  res
    .status(200)
    .json({ message: `Parada con id ${stopId} borrada correctamente` });
});

// =============== COMBINED CONTROLLERS ===============

/**
 * Obtiene todas las paradas de un viaje ordenadas por día y posición
 */
export const getAllStopsInATrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const uniqueStops = await ItineraryService.getAllStopsInATrip(tripIdNum);
  res.json(uniqueStops);
});

/**
 * Obtiene el itinerario completo de un viaje con todas sus rutas y paradas
 */
export const getTripItinerary = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const itinerary = await ItineraryService.getTripItinerary(tripIdNum);
  res.json(itinerary);
});

/**
 * Obtiene el costo total de repostaje de todos los viajes de un usuario
 */
export const getTotalRefuelCostByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const result = await ItineraryService.getTotalRefuelCostByUser(userId);
  res.json(result);
});

/**
 * Obtiene el costo total de repostaje de un viaje específico
 */
export const getTotalRefuelCostByTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const result = await ItineraryService.getTotalRefuelCostByTrip(tripIdNum);
  res.json(result);
});

/**
 * Obtiene el costo total de alojamiento de un viaje específico
 */
export const getTotalAccommodationCostByTrip = asyncHandler(
  async (req, res) => {
    const { tripId } = req.params as Record<string, string>;
    const tripIdNum = Number(tripId);
    const result =
      await ItineraryService.getTotalAccommodationCostByTrip(tripIdNum);
    res.json(result);
  },
);

/**
 * Obtiene el costo total de actividades de un viaje específico
 */
export const getTotalActivityCostByTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const result = await ItineraryService.getTotalActivityCostByTrip(tripIdNum);
  res.json(result);
});

// =============== ATTACHMENT CONTROLLERS ===============

/**
 * POST /api/stops/:stopId/attachments
 */
export const uploadAttachment = asyncHandler(async (req, res) => {
  const formidable = (await import("formidable")).default;
  const { stopId } = req.params as Record<string, string>;
  const userId = req.userId!;
  // Token ya validado por verifyToken; se pasa al servicio para firmar URLs de Storage
  const token = req.headers.authorization!.substring(7);

  // Parsear el archivo con formidable
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE_BYTES,
    allowEmptyFiles: false,
  });

  const [, files] = await form.parse(req);
  const file = files.file?.[0];

  if (!file) {
    throw new BadRequestError("No se proporcionó ningún archivo");
  }

  const result = await ItineraryService.uploadReservationAttachment(
    stopId,
    userId,
    {
      filepath: file.filepath,
      originalFilename: file.originalFilename || "archivo",
      mimetype: file.mimetype || "application/octet-stream",
      size: file.size,
    },
    token,
  );

  res.status(201).json({ success: true, data: result });
});

/**
 * GET /api/stops/:stopId/attachments
 */
export const getAttachments = asyncHandler(async (req, res) => {
  const { stopId } = req.params as Record<string, string>;
  const userId = req.userId!;
  // Token ya validado por verifyToken; se pasa al servicio para firmar URLs de Storage
  const token = req.headers.authorization!.substring(7);

  const attachments = await ItineraryService.getStopAttachments(
    stopId,
    userId,
    token,
  );

  res.json({ success: true, data: attachments });
});

/**
 * DELETE /api/attachments/:attachmentId
 */
export const deleteAttachmentHandler = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params as Record<string, string>;
  const userId = req.userId!;

  await ItineraryService.deleteAttachment(attachmentId, userId);

  res.json({ success: true, message: "Adjunto eliminado correctamente" });
});

/**
 * Actualiza la foto de una parada específica buscando en servicios externos
 */
export const refreshStopPhoto = asyncHandler(async (req, res) => {
  const { stopId } = req.params as Record<string, string>;
  const updatedStop = await ItineraryService.refreshStopPhoto(stopId);
  res.json({
    success: true,
    message: "Foto de la parada actualizada",
    stop: updatedStop,
  });
});

/**
 * Actualiza las fotos de todas las paradas de un viaje
 */
export const refreshTripStopsPhotos = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const result = await ItineraryService.refreshTripStopsPhotos(tripIdNum);
  res.json({
    success: true,
    message: `Fotos actualizadas para ${result.updated} de ${result.total} paradas`,
    ...result,
  });
});
