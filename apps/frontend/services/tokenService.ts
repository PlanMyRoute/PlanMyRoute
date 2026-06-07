import { apiFetch } from '@/constants/api';
import { TokenTransaction } from '@planmyroute/types';

export interface TokenBalanceResponse {
    balance: number;
}

export interface TokenHistoryResponse {
    history: TokenTransaction[];
}

export class TokenService {
    /**
     * Saldo de tokens del usuario actual.
     */
    static async getBalance(token: string): Promise<number> {
        const data = await apiFetch<TokenBalanceResponse>('/api/tokens/balance', { token });
        return data.balance;
    }

    /**
     * Historial de movimientos de tokens del usuario actual.
     */
    static async getHistory(token: string, limit = 50, offset = 0): Promise<TokenTransaction[]> {
        const data = await apiFetch<TokenHistoryResponse>(
            `/api/tokens/history?limit=${limit}&offset=${offset}`,
            { token }
        );
        return data.history;
    }

    /**
     * Crea una sesión de Stripe Checkout para comprar un paquete de tokens (pago único).
     */
    static async createTokenCheckoutSession(
        token: string,
        packageId: string,
        platform: 'web' | 'mobile' = 'web'
    ): Promise<{ sessionId: string; url: string }> {
        let successUrl: string | undefined;
        let cancelUrl: string | undefined;

        if (platform === 'web' && typeof window !== 'undefined') {
            const origin = window.location.origin;
            successUrl = `${origin}/subscription/success`;
            cancelUrl = `${origin}/subscription/cancel`;
        }

        return apiFetch<{ sessionId: string; url: string }>(
            '/api/stripe/create-token-checkout-session',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                token,
                body: JSON.stringify({ packageId, platform, successUrl, cancelUrl }),
            }
        );
    }
}
