import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

/**
 * Middleware that only applies the premium check when `circular === true` in the request body.
 * Non-circular trips pass through without any DB lookup.
 */
export const requirePremiumForCircular = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body?.circular) return next();

    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const { data: sub } = await supabase
            .from('subscriptions')
            .select('tier, status, current_period_end')
            .eq('user_id', userId)
            .single();

        if (!sub) {
            return res.status(403).json({
                error: 'La opción de ida y vuelta es exclusiva para usuarios Premium.',
                requiresPremium: true,
                code: 'PREMIUM_REQUIRED',
            });
        }

        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const isTierPremium = sub.tier === 'premium';
        const endDate = sub.current_period_end ? new Date(sub.current_period_end) : null;
        const notExpired = endDate ? endDate > new Date() : false;

        if (isActive && isTierPremium && notExpired) {
            return next();
        }

        return res.status(403).json({
            error: 'La opción de ida y vuelta es exclusiva para usuarios Premium.',
            requiresPremium: true,
            code: 'PREMIUM_REQUIRED',
        });
    } catch (error) {
        console.error('[requirePremiumForCircular]', error);
        return res.status(500).json({ error: 'Error verificando suscripción' });
    }
};
