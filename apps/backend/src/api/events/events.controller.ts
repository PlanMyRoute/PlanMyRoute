import { Request, Response } from 'express';
import * as EventsService from './events.service.js';

export const getEvents = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
        const countryCode = req.query.countryCode as string | undefined;
        const keyword = req.query.keyword as string | undefined;
        const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
        const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

        const result = await EventsService.getMajorEvents({ page, countryCode, keyword, lat, lng });
        res.json(result);
    } catch (error) {
        const err = error as Error;
        console.error('❌ [EventsController.getEvents]', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const event = await EventsService.getEventById(id);
        if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
        res.json(event);
    } catch (error) {
        const err = error as Error;
        console.error('❌ [EventsController.getEventById]', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getNearStops = async (req: Request, res: Response): Promise<void> => {
    try {
        const stopsParam = req.query.stops as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

        if (!stopsParam) { res.json([]); return; }

        const stops = JSON.parse(stopsParam) as EventsService.NearStopInput[];
        if (!Array.isArray(stops)) { res.status(400).json({ error: 'stops debe ser un array JSON' }); return; }

        const events = await EventsService.getEventsNearStops(stops, limit);
        res.json(events);
    } catch (error) {
        const err = error as Error;
        console.error('❌ [EventsController.getNearStops]', err.message);
        res.status(500).json({ error: err.message });
    }
};
