import { Request, Response } from "express";
import * as ItineraryService from "./itinerary.service.js";
import { autoInsertRefuelStops } from "../refuelAdvisor/refuelAdvisor.service.js";
import { getPlacePrice } from "../../utils/placePrices.js";

/** Tamaño máximo de archivo para subida de adjuntos (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// =============== STOP CONTROLLERS ===============

/**
 * Obtiene una parada por su ID
 * @param req - Objeto de solicitud con el parámetro stopId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con los datos de la parada en formato JSON
 */
export const getStopById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;

  try {
    const stop = await ItineraryService.getStopById(stopId);
    res.json(stop);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el precio de una parada específica
 * GET /api/stop/:stopId/price
 */
export const getStopPrice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;

  try {
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

    res.json({
      stopId,
      name: stop.name,
      priceInfo,
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea una nueva parada en el itinerario de un viaje
 * @param req - Objeto de solicitud con el parámetro tripId y datos de la parada en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada creada en formato JSON (201)
 */
export const createStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);

  try {
    const newStop = await ItineraryService.createStop(req.body, tripIdNum);
    res.status(201).json(newStop);

    // Cuando se añade el destino el itinerario está completo: analizar repostaje
    if (req.body?.type === "destino") {
      autoInsertRefuelStops(tripIdNum).catch(() => {});
    }
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea una parada de tipo actividad con sus datos específicos
 * @param req - Objeto de solicitud con el parámetro tripId y stopData/activityData en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada y la actividad creadas en formato JSON (201)
 */
export const createActivityStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const { stopData, activityData } = req.body;

  try {
    const result = await ItineraryService.createActivityStop(
      stopData,
      activityData,
      tripIdNum,
    );
    res.status(201).json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea una parada de tipo alojamiento con sus datos específicos
 * @param req - Objeto de solicitud con el parámetro tripId y stopData/accommodationData en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada y el alojamiento creados en formato JSON (201)
 */
export const createAccommodationStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const { stopData, accommodationData } = req.body;

  try {
    const result = await ItineraryService.createAccommodationStop(
      stopData,
      accommodationData,
      tripIdNum,
    );
    res.status(201).json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea una parada de tipo repostaje con sus datos específicos
 * @param req - Objeto de solicitud con el parámetro tripId y stopData/refuelData en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada y el repostaje creados en formato JSON (201)
 */
export const createRefuelStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const { stopData, refuelData } = req.body;

  try {
    const result = await ItineraryService.createRefuelStop(
      stopData,
      refuelData,
      tripIdNum,
    );
    res.status(201).json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene los datos completos de una parada de tipo repostaje
 * @param req - Objeto de solicitud con el parámetro stopId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada base y los detalles del repostaje en formato JSON
 */
export const getRefuelStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;

  try {
    const result = await ItineraryService.getRefuelStop(stopId);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza una parada existente con validaciones de posición y tipo
 * @param req - Objeto de solicitud con los parámetros stopId y tripId, y datos en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada actualizada en formato JSON
 */
export const updateStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId, tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);

  console.log(`🔧 updateStop - Parámetros recibidos:`, {
    stopId,
    tripIdParam: tripId,
    tripIdNum,
    isValidTripId: !isNaN(tripIdNum) && tripIdNum > 0,
  });

  const stopData = req.body;

  // Convertir hora simple a timestamp si es necesario
  if (
    stopData.estimated_arrival &&
    typeof stopData.estimated_arrival === "string"
  ) {
    // Si es solo hora (HH:mm), la función de servicio la convertirá
    // No hacemos nada aquí, dejamos que el servicio lo maneje
  }

  // ⚠️ NO CAMBIAR EL TIPO AQUÍ - El type ya viene correcto del frontend
  // El type es la propiedad fundamental que define origen/destino/intermedia
  // NO se debe cambiar basándose en order

  try {
    const updatedStop = await ItineraryService.updateStop(
      stopId,
      stopData,
      tripIdNum,
    );
    res.json(updatedStop);
  } catch (error) {
    const err = error as Error;
    // Errores de validación de origen/destino/intermedia - devolver sin loguear
    if (
      err.message.includes("Origen") ||
      err.message.includes("Destino") ||
      err.message.includes("intermedia")
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza una parada de tipo actividad y sus datos específicos
 * @param req - Objeto de solicitud con el parámetro stopId y stopData/activityData en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada y la actividad actualizadas en formato JSON
 */
export const updateActivityStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;
  const { stopData, activityData } = req.body;

  try {
    const result = await ItineraryService.updateActivityStop(
      stopId,
      stopData || {},
      activityData || {},
    );
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza una parada de tipo alojamiento y sus datos específicos
 * @param req - Objeto de solicitud con el parámetro stopId y stopData/accommodationData en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada y el alojamiento actualizados en formato JSON
 */
export const updateAccommodationStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;
  const { stopData, accommodationData } = req.body;

  try {
    const result = await ItineraryService.updateAccommodationStop(
      stopId,
      stopData || {},
      accommodationData || {},
    );
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza una parada de tipo repostaje y sus datos específicos
 * @param req - Objeto de solicitud con el parámetro stopId y stopData/refuelData en el body
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada y el repostaje actualizados en formato JSON
 */
export const updateRefuelStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;
  const { stopData, refuelData } = req.body;

  try {
    const result = await ItineraryService.updateRefuelStop(
      stopId,
      stopData || {},
      refuelData || {},
    );
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Elimina una parada y fusiona las rutas adyacentes si es necesario
 * @param req - Objeto de solicitud con el parámetro stopId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con mensaje de confirmación y ruta fusionada si aplica
 */
export const deleteStop = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;
  try {
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
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== COMBINED CONTROLLERS ===============

/**
 * Obtiene todas las paradas de un viaje ordenadas por día y posición
 * @param req - Objeto de solicitud con el parámetro tripId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la lista de paradas del viaje en formato JSON
 */
export const getAllStopsInATrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  try {
    const uniqueStops = await ItineraryService.getAllStopsInATrip(tripIdNum);
    res.json(uniqueStops);
    return;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el itinerario completo de un viaje con todas sus rutas y paradas
 * @param req - Objeto de solicitud con el parámetro tripId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con el itinerario del viaje en formato JSON
 */
export const getTripItinerary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  try {
    const itinerary = await ItineraryService.getTripItinerary(tripIdNum);
    res.json(itinerary);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el costo total de repostaje de todos los viajes de un usuario
 * @param req - Objeto de solicitud con el parámetro userId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con el total de gasto en repostajes y cantidad de repostajes
 */
export const getTotalRefuelCostByUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params as Record<string, string>;
  try {
    const result = await ItineraryService.getTotalRefuelCostByUser(userId);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el costo total de repostaje de un viaje específico
 * @param req - Objeto de solicitud con el parámetro tripId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con el total de gasto en repostajes del viaje
 */
export const getTotalRefuelCostByTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  try {
    const result = await ItineraryService.getTotalRefuelCostByTrip(tripIdNum);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el costo total de alojamiento de un viaje específico
 * @param req - Objeto de solicitud con el parámetro tripId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con el total de gasto en alojamientos del viaje
 */
export const getTotalAccommodationCostByTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  try {
    const result =
      await ItineraryService.getTotalAccommodationCostByTrip(tripIdNum);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el costo total de actividades de un viaje específico
 * @param req - Objeto de solicitud con el parámetro tripId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con el total de gasto en actividades del viaje
 */
export const getTotalActivityCostByTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  try {
    const result = await ItineraryService.getTotalActivityCostByTrip(tripIdNum);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== ATTACHMENT CONTROLLERS ===============

/**
 * POST /api/stops/:stopId/attachments
 */
export const uploadAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
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

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      res.status(400).json({ error: "No se proporcionó ningún archivo" });
      return;
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

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes("No se encontró"))
      return void res.status(404).json({ error: err.message });
    if (err.message.includes("no tiene permiso"))
      return void res.status(403).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/stops/:stopId/attachments
 */
export const getAttachments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { stopId } = req.params as Record<string, string>;
    const userId = req.userId!;
    // Token ya validado por verifyToken; se pasa al servicio para firmar URLs de Storage
    const token = req.headers.authorization!.substring(7);

    const attachments = await ItineraryService.getStopAttachments(
      stopId,
      userId,
      token,
    );

    res.json({
      success: true,
      data: attachments,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes("No se encontró"))
      return void res.status(404).json({ error: err.message });
    if (err.message.includes("no tiene permiso"))
      return void res.status(403).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/attachments/:attachmentId
 */
export const deleteAttachmentHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { attachmentId } = req.params as Record<string, string>;
    const userId = req.userId!;

    await ItineraryService.deleteAttachment(attachmentId, userId);

    res.json({
      success: true,
      message: "Adjunto eliminado correctamente",
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes("No se encontró"))
      return void res.status(404).json({ error: err.message });
    if (err.message.includes("no tiene permiso"))
      return void res.status(403).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza la foto de una parada específica buscando en servicios externos
 * @param req - Objeto de solicitud con el parámetro stopId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con la parada actualizada y mensaje de confirmación
 */
export const refreshStopPhoto = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { stopId } = req.params as Record<string, string>;

  try {
    const updatedStop = await ItineraryService.refreshStopPhoto(stopId);
    res.json({
      success: true,
      message: "Foto de la parada actualizada",
      stop: updatedStop,
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza las fotos de todas las paradas de un viaje
 * @param req - Objeto de solicitud con el parámetro tripId
 * @param res - Objeto de respuesta HTTP
 * @returns Responde con el resumen de paradas actualizadas y fallidas
 */
export const refreshTripStopsPhotos = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);

  try {
    const result = await ItineraryService.refreshTripStopsPhotos(tripIdNum);
    res.json({
      success: true,
      message: `Fotos actualizadas para ${result.updated} de ${result.total} paradas`,
      ...result,
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};
