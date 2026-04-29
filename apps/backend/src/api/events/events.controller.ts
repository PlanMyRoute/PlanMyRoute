import { Request, Response } from 'express';
import * as EventsService from './events.service.js';

export const getEvents = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
        const countryCode = req.query.countryCode as string | undefined;
        const keyword = req.query.keyword as string | undefined;

        const result = await EventsService.getMajorEvents({ page, countryCode, keyword });
        res.json(result);
    } catch (error) {
        const err = error as Error;
        console.error('❌ [EventsController.getEvents]', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getEventById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const event = await EventsService.getEventById(id);
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json(event);
    } catch (error) {
        const err = error as Error;
        console.error('❌ [EventsController.getEventById]', err.message);
        res.status(500).json({ error: err.message });
    }
};
