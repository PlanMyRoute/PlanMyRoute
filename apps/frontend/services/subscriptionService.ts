import { Subscription } from '../context/SubscriptionContext';

// Definimos la URL base igual que en tu UserService (ojo al _UR)
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class SubscriptionService {

    /**
     * Obtiene la suscripción del usuario actual
     */
    static async getMySubscription(token: string): Promise<Subscription> {
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!res.ok) {
                // Si es 404, significa que no tiene fila en la BD aún, lanzamos error controlado
                if (res.status === 404) throw new Error('NO_SUBSCRIPTION');
                throw new Error(`Error fetching subscription: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('SubscriptionService.getMySubscription error', error);
            throw error;
        }
    }

    /**
     * Activa el periodo de prueba (Trial)
     */
    static async startTrial(token: string): Promise<{ success: boolean; newEndDate: string }> {
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/trial`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Error starting trial: ${res.status}`);
            }

            return await res.json();
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
            const res = await fetch(`${API_URL}/api/subscriptions/redeem`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, type })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Error redeeming code: ${res.status}`);
            }

            return await res.json();
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

            const res = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Error creating checkout session: ${res.status}`);
            }

            return await res.json();
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
            const res = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Error creating portal session: ${res.status}`);
            }

            return await res.json();
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
            const res = await fetch(`${API_URL}/api/stripe/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Error canceling subscription: ${res.status}`);
            }

            return await res.json();
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
            const res = await fetch(`${API_URL}/api/stripe/reactivate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Error reactivating subscription: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('SubscriptionService.reactivateSubscription error', error);
            throw error;
        }
    }
}