import { ApiError, apiFetch } from '@/constants/api';
import { Subscription } from '../context/SubscriptionContext';


export class SubscriptionService {

    /**
     * Obtiene la suscripción del usuario actual
     */
    static async getMySubscription(token: string): Promise<Subscription> {
        try {
            return await apiFetch<Subscription>('/api/subscriptions/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                token,
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                throw new Error('NO_SUBSCRIPTION');
            }
            console.error('SubscriptionService.getMySubscription error', error);
            throw error;
        }
    }

    /**
     * Activa el periodo de prueba (Trial)
     */
    static async startTrial(token: string): Promise<{ success: boolean; newEndDate: string }> {
        try {
            return await apiFetch<{ success: boolean; newEndDate: string }>('/api/subscriptions/trial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                token,
            });
        } catch (error) {
            console.error('SubscriptionService.startTrial error', error);
            throw error;
        }
    }

    /**
     * Canjea un código (Referido o Promo)
     */
    static async redeemCode(code: string, type: 'referral' | 'promo', token: string): Promise<{ success: boolean; message: string }> {
        try {
            return await apiFetch<{ success: boolean; message: string }>('/api/subscriptions/redeem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                token,
                body: JSON.stringify({ code, type })
            });
        } catch (error) {
            console.error('SubscriptionService.redeemCode error', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS DE STRIPE
    // ==========================================

    /**
     * Crea una sesión de checkout de Stripe
     * @param plan - 'monthly' o 'yearly'
     * @param platform - 'web' o 'mobile'
     * @returns sessionId y url para redirigir al usuario
     */
    static async createCheckoutSession(
        token: string,
        plan: 'monthly' | 'yearly',
        platform: 'web' | 'mobile' = 'web'
    ): Promise<{ sessionId: string; url: string }> {
        try {
            // Para web, construir las URLs de éxito/cancelación basadas en el origen actual
            let successUrl: string | undefined;
            let cancelUrl: string | undefined;

            if (platform === 'web' && typeof window !== 'undefined') {
                const origin = window.location.origin;
                successUrl = `${origin}/subscription/success`;
                cancelUrl = `${origin}/subscription/cancel`;
                console.log('URLs para Stripe:', { origin, successUrl, cancelUrl });
            }

            const body = { plan, platform, successUrl, cancelUrl };
            console.log('Body enviado a backend:', body);

            return await apiFetch<{ sessionId: string; url: string }>('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                token,
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error('SubscriptionService.createCheckoutSession error', error);
            throw error;
        }
    }

    /**
     * Crea una sesión del portal de cliente de Stripe
     * para gestionar la suscripción (cambiar plan, cancelar, etc.)
     */
    static async createPortalSession(token: string): Promise<{ url: string }> {
        try {
            return await apiFetch<{ url: string }>('/api/stripe/create-portal-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                token,
            });
        } catch (error) {
            console.error('SubscriptionService.createPortalSession error', error);
            throw error;
        }
    }

    /**
     * Cancela la suscripción (al final del período actual)
     */
    static async cancelSubscription(token: string): Promise<{ success: boolean; message?: string }> {
        try {
            return await apiFetch<{ success: boolean; message?: string }>('/api/stripe/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                token,
            });
        } catch (error) {
            console.error('SubscriptionService.cancelSubscription error', error);
            throw error;
        }
    }

    /**
     * Reactiva una suscripción que iba a cancelarse
     */
    static async reactivateSubscription(token: string): Promise<{ success: boolean; message?: string }> {
        try {
            return await apiFetch<{ success: boolean; message?: string }>('/api/stripe/reactivate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                token,
            });
        } catch (error) {
            console.error('SubscriptionService.reactivateSubscription error', error);
            throw error;
        }
    }
}
