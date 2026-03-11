import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Stripe con la clave secreta
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Configuración de precios de Stripe
export const STRIPE_CONFIG = {
    // Price IDs de Stripe (Test mode)
    PRICES: {
        MONTHLY: process.env.STRIPE_PRICE_MONTHLY || 'price_1Sf6mZ1ajWQDqxuQFw810iyk',
        YEARLY: process.env.STRIPE_PRICE_YEARLY || 'price_1Sf6o61ajWQDqxuQ6t5qakpt',
    },
    
    // URLs de redirección después del pago
    SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || 'https://www.planmyroute.es/subscription/success',
    CANCEL_URL: process.env.STRIPE_CANCEL_URL || 'https://www.planmyroute.es/subscription/cancel',
    
    // Para móvil usamos deep links
    MOBILE_SUCCESS_URL: 'planmyroute://subscription/success',
    MOBILE_CANCEL_URL: 'planmyroute://subscription/cancel',
    
    // Precios en euros (para mostrar en frontend)
    DISPLAY_PRICES: {
        MONTHLY: 4.99,
        YEARLY: 49.99,
    }
};

// Tipos de planes
export type PlanType = 'monthly' | 'yearly';

// Helper para obtener el Price ID según el plan
export const getPriceIdByPlan = (plan: PlanType): string => {
    return plan === 'monthly' ? STRIPE_CONFIG.PRICES.MONTHLY : STRIPE_CONFIG.PRICES.YEARLY;
};
