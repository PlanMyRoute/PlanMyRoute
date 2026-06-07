import Stripe from 'stripe';
import dotenv from 'dotenv';
import { TOKEN_PACKAGES, TokenPackage } from '@planmyroute/types';

dotenv.config();

// Inicializar Stripe con la clave secreta
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Configuración de precios de Stripe
export const STRIPE_CONFIG = {
    // Price IDs de suscripción (Test mode). El plan mensual fue retirado.
    PRICES: {
        YEARLY: process.env.STRIPE_PRICE_YEARLY || 'price_1Sf6o61ajWQDqxuQ6t5qakpt',
    },

    // URLs de redirección después del pago
    SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || 'https://www.planmyroute.es/subscription/success',
    CANCEL_URL: process.env.STRIPE_CANCEL_URL || 'https://www.planmyroute.es/subscription/cancel',

    // Para móvil usamos deep links
    MOBILE_SUCCESS_URL: 'planmyroute://subscription/success',
    MOBILE_CANCEL_URL: 'planmyroute://subscription/cancel',

    // Precio en euros (para mostrar en frontend)
    DISPLAY_PRICES: {
        YEARLY: 49.99,
    },
};

// Solo queda la suscripción anual.
export type PlanType = 'yearly';

// Helper para obtener el Price ID de la suscripción
export const getPriceIdByPlan = (_plan: PlanType): string => {
    return STRIPE_CONFIG.PRICES.YEARLY;
};

/**
 * Devuelve el price id one-time de Stripe para un paquete de tokens,
 * leyendo la env var declarada en el paquete (TOKEN_PACKAGES).
 */
export const getTokenPriceId = (pkg: TokenPackage): string => {
    const priceId = process.env[pkg.stripePriceEnvKey];
    if (!priceId) {
        throw new Error(`Falta la variable de entorno ${pkg.stripePriceEnvKey} con el price id del paquete de tokens "${pkg.id}"`);
    }
    return priceId;
};

/**
 * Mapea un price id one-time de Stripe a su paquete de tokens (para el webhook).
 */
export const getTokenPackageByPriceId = (priceId: string): TokenPackage | undefined => {
    return TOKEN_PACKAGES.find((pkg) => {
        const envPriceId = process.env[pkg.stripePriceEnvKey];
        return envPriceId && envPriceId === priceId;
    });
};
