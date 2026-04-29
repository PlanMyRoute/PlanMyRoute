import { Request, Response } from 'express';
import * as EventChatService from './eventChat.service.js';

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
        const messages = await EventChatService.getMessages(eventId, page);
        res.json(messages);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = (req as any).userId as string;
        const { message } = req.body as { message: string };

        if (!message) return res.status(400).json({ error: 'El campo message es obligatorio' });

        const saved = await EventChatService.sendMessage(eventId, userId, message);
        res.status(201).json(saved);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('vacío') || err.message.includes('largo')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};
