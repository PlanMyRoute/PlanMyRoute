import * as EventsService from "./events.service.js";
import {
  BadRequestError,
  NotFoundError,
  asyncHandler,
} from "../../utils/errors.js";

/**
 * Controlador para obtener eventos principales con filtros opcionales
 */
export const getEvents = asyncHandler(async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
  const countryCode = req.query.countryCode as string | undefined;
  const keyword = req.query.keyword as string | undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

  const result = await EventsService.getMajorEvents({
    page,
    countryCode,
    keyword,
    lat,
    lng,
  });
  res.json(result);
});

/**
 * Controlador para obtener un evento específico por su ID
 */
export const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const event = await EventsService.getEventById(id);
  if (!event) {
    throw new NotFoundError("Evento no encontrado");
  }
  res.json(event);
});

/**
 * Controlador para obtener eventos cercanos a las paradas de un viaje
 */
export const getNearStops = asyncHandler(async (req, res) => {
  const stopsParam = req.query.stops as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  if (!stopsParam) {
    res.json([]);
    return;
  }

  let stops: EventsService.NearStopInput[];
  try {
    stops = JSON.parse(stopsParam) as EventsService.NearStopInput[];
  } catch {
    throw new BadRequestError("stops debe ser un JSON válido");
  }
  if (!Array.isArray(stops)) {
    throw new BadRequestError("stops debe ser un array JSON");
  }

  const events = await EventsService.getEventsNearStops(stops, limit);
  res.json(events);
});
