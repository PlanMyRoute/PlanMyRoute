import { supabase } from '../supabase.js';
import {
    AiAction,
    TokenTransaction,
    TokenTransactionType,
    getActionCost,
} from '@planmyroute/types';

/**
 * Error tipado para saldo insuficiente. El controlador lo traduce a 402.
 */
export class InsufficientTokensError extends Error {
    readonly code = 'INSUFFICIENT_TOKENS' as const;
    readonly required: number;
    readonly balance: number;

    constructor(required: number, balance: number) {
        super('Saldo de tokens insuficiente');
        this.name = 'InsufficientTokensError';
        this.required = required;
        this.balance = balance;
    }
}

export type TokenReference = Record<string, unknown> | null;

/**
 * Devuelve el saldo actual de tokens del usuario (0 si no tiene wallet).
 */
export async function getBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('token_wallet')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw new Error(`Error obteniendo saldo de tokens: ${error.message}`);
    return (data?.balance as number | undefined) ?? 0;
}

/**
 * Descuenta tokens de forma ATÓMICA por una acción de IA (RPC spend_tokens).
 * Aplica el coste tier-aware (premium puede tener acciones gratuitas).
 * Lanza InsufficientTokensError si no hay saldo suficiente.
 * Devuelve el nuevo saldo.
 */
export async function spend(
    userId: string,
    action: AiAction,
    isPremium: boolean,
    reference: TokenReference = null
): Promise<number> {
    const amount = getActionCost(action, isPremium);

    // Acción gratuita para este usuario (p.ej. ADDON_REFUEL premium): no toca el saldo.
    if (amount <= 0) {
        return getBalance(userId);
    }

    const { data, error } = await supabase.rpc('spend_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_type: action,
        p_reference: reference,
    });

    if (error) {
        if (error.message?.includes('INSUFFICIENT_TOKENS')) {
            const balance = await getBalance(userId);
            throw new InsufficientTokensError(amount, balance);
        }
        throw new Error(`Error descontando tokens: ${error.message}`);
    }

    return data as number;
}

/**
 * Concede tokens de forma ATÓMICA (RPC grant_tokens). Idempotente por (type, reference).
 * Devuelve el nuevo saldo.
 */
export async function grant(
    userId: string,
    type: TokenTransactionType,
    amount: number,
    reference: TokenReference = null
): Promise<number> {
    const { data, error } = await supabase.rpc('grant_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_reference: reference,
    });

    if (error) throw new Error(`Error concediendo tokens: ${error.message}`);
    return data as number;
}

/**
 * Cobra la generación de un viaje como una unidad: GENERATE_TRIP (+ ADDON_ROUNDTRIP si es circular).
 * Hace una comprobación previa de saldo (para no dejar cargos parciales) y, si el cobro del
 * addon fallara tras cobrar la base, reembolsa la base. Devuelve el total cobrado y el saldo.
 * Lanza InsufficientTokensError si no hay saldo para el total.
 */
export async function chargeGeneration(
    userId: string,
    isPremium: boolean,
    circular: boolean,
    reference: TokenReference = null
): Promise<{ balance: number; charged: number }> {
    const base = getActionCost('GENERATE_TRIP', isPremium);
    const addon = circular ? getActionCost('ADDON_ROUNDTRIP', isPremium) : 0;
    const total = base + addon;

    const balance = await getBalance(userId);
    if (balance < total) {
        throw new InsufficientTokensError(total, balance);
    }

    let newBalance = await spend(userId, 'GENERATE_TRIP', isPremium, reference);

    if (addon > 0) {
        try {
            newBalance = await spend(userId, 'ADDON_ROUNDTRIP', isPremium, reference);
        } catch (err) {
            // Rollback de la base si el addon no se pudo cobrar (carrera concurrente).
            await grant(userId, 'REFUND', base, { ...(reference ?? {}), reason: 'roundtrip_charge_failed' }).catch(() => {});
            throw err;
        }
    }

    return { balance: newBalance, charged: total };
}

/**
 * Reembolsa tokens previamente cobrados (p.ej. si la generación falla en background).
 * No-op si charged <= 0.
 */
export async function refund(
    userId: string,
    charged: number,
    reference: TokenReference = null
): Promise<void> {
    if (charged <= 0) return;
    await grant(userId, 'REFUND', charged, reference);
}

/**
 * Historial de movimientos del usuario, más recientes primero.
 */
export async function getHistory(
    userId: string,
    limit = 50,
    offset = 0
): Promise<TokenTransaction[]> {
    const { data, error } = await supabase
        .from('token_transaction')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw new Error(`Error obteniendo historial de tokens: ${error.message}`);
    return (data ?? []) as TokenTransaction[];
}
