import { Request, Response } from 'express';
import * as TokenWalletService from '../../services/tokenWalletService.js';

/**
 * GET /api/tokens/balance
 * Devuelve el saldo de tokens del usuario autenticado.
 */
export const getBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }

        const balance = await TokenWalletService.getBalance(userId);
        res.json({ balance });
    } catch (error: unknown) {
        console.error('Error obteniendo saldo de tokens:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al obtener saldo' });
    }
};

/**
 * GET /api/tokens/history?limit=&offset=
 * Devuelve el historial de movimientos de tokens del usuario.
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }

        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const history = await TokenWalletService.getHistory(userId, limit, offset);
        res.json({ history });
    } catch (error: unknown) {
        console.error('Error obteniendo historial de tokens:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al obtener historial' });
    }
};
