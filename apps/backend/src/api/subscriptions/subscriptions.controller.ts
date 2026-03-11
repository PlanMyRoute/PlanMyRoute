import { Request, Response } from 'express';
import { SubscriptionService } from './subscriptions.service.js';

const subscriptionService = new SubscriptionService();

export const getMySubscription = async (req: Request, res: Response) => {
    try {
        // CORRECCIÓN: Usamos req.userId directamente.
        // Tu middleware asegura que si llegamos aquí, userId existe.
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no identificado' });
        }

        const sub = await subscriptionService.getSubscription(userId);
        res.json(sub);
    } catch (error: any) {
        // Si da error porque no existe suscripción, devolvemos un objeto "vacío" o default
        // para que el frontend sepa que es usuario Free.
        if (error.message.includes('No se pudo obtener')) {
            return res.json({ tier: 'free', status: 'active' });
        }
        res.status(500).json({ error: error.message });
    }
};

export const startTrial = async (req: Request, res: Response) => {
    try {
        const userId = req.userId; // Usamos req.userId
        if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

        const result = await subscriptionService.activateTrial(userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const redeemCode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId; // Usamos req.userId
        if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

        const { code, type } = req.body;

        if (!code) return res.status(400).json({ error: 'Falta el código' });

        let result;
        if (type === 'referral') {
            result = await subscriptionService.redeemReferral(userId, code);
        } else {
            result = await subscriptionService.redeemPromoCode(userId, code);
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};