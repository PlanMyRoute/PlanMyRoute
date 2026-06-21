import { Request, Response } from "express";
import * as EventsService from "./events.service.js";

/**
 * Controlador para obtener eventos principales con filtros opcionales
 * @param req - Petición Express con query params: page, countryCode, keyword, lat, lng
 * @param res - Respuesta Express
 * @returns void
 */
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("Solo el creador")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe") ||
      err.message.includes("Ya estás")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controlador para obtener un evento específico por su ID
 * @param req - Petición Express con el parámetro de ruta id
 * @param res - Respuesta Express
 * @returns void
 */
export const getEventById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params as Record<string, string>;
    const event = await EventsService.getEventById(id);
    if (!event) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    res.json(event);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("Solo el creador")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe") ||
      err.message.includes("Ya estás")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controlador para obtener eventos cercanos a las paradas de un viaje
 * @param req - Petición Express con query params: stops (JSON stringificado), limit
 * @param res - Respuesta Express
 * @returns void
 */
export const getNearStops = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const stopsParam = req.query.stops as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 10;

    if (!stopsParam) {
      res.json([]);
      return;
    }

    const stops = JSON.parse(stopsParam) as EventsService.NearStopInput[];
    if (!Array.isArray(stops)) {
      res.status(400).json({ error: "stops debe ser un array JSON" });
      return;
    }

    const events = await EventsService.getEventsNearStops(stops, limit);
    res.json(events);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("Solo el creador")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe") ||
      err.message.includes("Ya estás")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};
