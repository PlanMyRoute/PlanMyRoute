import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

export const isPremium = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

        const { data: sub } = await supabase
            .from('subscriptions')
            .select('tier, status, current_period_end')
            .eq('user_id', userId)
            .single();

        if (!sub) {
            return res.status(403).json({ error: 'Suscripción no encontrada', isPremium: false });
        }

        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const isTierPremium = sub.tier === 'premium';

        // Verificar fecha (importante por si no se actualizó el status a 'expired' automáticamente)
        const now = new Date();
        const endDate = sub.current_period_end ? new Date(sub.current_period_end) : null;
        const notExpired = endDate ? endDate > now : false; // Si es null (free) no es premium por fecha

        if (isActive && isTierPremium && notExpired) {
            return next();
        } else {
            return res.status(403).json({
                error: 'Esta funcionalidad es exclusiva para usuarios Premium.',
                code: 'PREMIUM_REQUIRED'
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error verificando suscripción' });
    }
};