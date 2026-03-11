import { Request, Response } from 'express';
import * as NotificationService from './notifications.service.js';
import * as TripService from '../trips/trips.service.js';

export const getNotificationsByReceiver = async (req: Request, res: Response) => {
    const { userId } = req.params; // receiver user id
    try {
        const notifications = await NotificationService.getByReceiverId(userId);
        res.json(notifications);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getNotificationById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const notification = await NotificationService.getById(id);
        res.json(notification);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const createNotification = async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        if (!payload || !payload.user_receiver_id || !payload.content) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: user_receiver_id y content' });
        }

        const newNotification = await NotificationService.create(payload);
        res.status(201).json(newNotification);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const updateNotification = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const updated = await NotificationService.update(id, req.body);
        res.json(updated);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await NotificationService.deleteNotification(id);
        res.status(200).json({ message: `Notificación con id ${id} borrada correctamente` });
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const updated = await NotificationService.markAsRead(id);
        res.json(updated);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const acceptInvitation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
        // 1. Obtener la notificación actual
        const notification = await NotificationService.getById(id);

        // 2. Validar que es una invitación pendiente
        if (notification.action_status !== 'pending') {
            return res.status(400).json({
                error: `La invitación ya ha sido ${notification.action_status === 'accepted' ? 'aceptada' : 'rechazada'} previamente`
            });
        }

        // 3. Validar que tiene los campos necesarios
        if (!notification.related_trip_id) {
            return res.status(400).json({ error: 'La notificación no tiene un viaje asociado' });
        }

        if (!notification.user_receiver_id) {
            return res.status(400).json({ error: 'La notificación no tiene un usuario receptor' });
        }

        if (!role) {
            return res.status(400).json({ error: 'Falta el campo "role" en el body' });
        }

        // 4. Verificar que el viaje existe
        try {
            await TripService.getById(notification.related_trip_id);
        } catch (err) {
            return res.status(404).json({ error: 'El viaje asociado no existe' });
        }

        // 5. Añadir usuario al viaje
        try {
            await TripService.createUserTripRelation(
                notification.user_receiver_id,
                notification.related_trip_id,
                role
            );
        } catch (err) {
            const error = err as Error;
            // Si es un error de duplicate key (usuario ya en el viaje)
            if (error.message.includes('duplicate') || error.message.includes('unique')) {
                return res.status(409).json({ error: 'El usuario ya pertenece a este viaje' });
            }
            throw err; // Re-throw si es otro tipo de error
        }

        // 6. Actualizar la notificación
        const notificationUpdated = await NotificationService.acceptInvitation(id);

        res.json(notificationUpdated);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const declineInvitation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Obtener la notificación actual
        const notification = await NotificationService.getById(id);

        // 2. Validar que es una invitación pendiente
        if (notification.action_status !== 'pending') {
            return res.status(400).json({
                error: `La invitación ya ha sido ${notification.action_status === 'accepted' ? 'aceptada' : 'rechazada'} previamente`
            });
        }

        // 3. Actualizar la notificación
        const notificationUpdated = await NotificationService.declineInvitation(id);

        res.json(notificationUpdated);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const getNotificationsByTrip = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    try {
        const notifications = await NotificationService.getByTripId(tripId);
        res.json(notifications);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};
