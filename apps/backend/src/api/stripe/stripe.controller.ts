import { Request, Response } from 'express';
import { StripeService } from './stripe.service.js';
import { stripe } from '../../config/stripe.config.js';
import Stripe from 'stripe';

const stripeService = new StripeService();

/**
 * POST /api/stripe/create-checkout-session
 * Crea una sesión de Stripe Checkout para suscripción
 */
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const { plan, platform, successUrl, cancelUrl } = req.body;

        if (!plan || !['monthly', 'yearly'].includes(plan)) {
            res.status(400).json({ error: 'Plan inválido. Usa "monthly" o "yearly"' });
            return;
        }

        const session = await stripeService.createCheckoutSession(
            userId, 
            plan, 
            platform || 'web',
            successUrl,
            cancelUrl
        );

        res.json(session);
    } catch (error: any) {
        console.error('Error creando checkout session:', error);
        res.status(500).json({ error: error.message || 'Error al crear sesión de pago' });
    }
};

/**
 * POST /api/stripe/create-portal-session
 * Crea una sesión del portal de cliente para gestionar suscripción
 */
export const createPortalSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const session = await stripeService.createCustomerPortalSession(userId);
        res.json(session);
    } catch (error: any) {
        console.error('Error creando portal session:', error);
        res.status(500).json({ error: error.message || 'Error al crear portal de gestión' });
    }
};

/**
 * POST /api/stripe/cancel
 * Cancela la suscripción al final del período
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const result = await stripeService.cancelSubscription(userId);
        res.json(result);
    } catch (error: any) {
        console.error('Error cancelando suscripción:', error);
        res.status(500).json({ error: error.message || 'Error al cancelar suscripción' });
    }
};

/**
 * POST /api/stripe/reactivate
 * Reactiva una suscripción que iba a cancelarse
 */
export const reactivateSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId;
        const result = await stripeService.reactivateSubscription(userId);
        res.json(result);
    } catch (error: any) {
        console.error('Error reactivando suscripción:', error);
        res.status(500).json({ error: error.message || 'Error al reactivar suscripción' });
    }
};

/**
 * POST /api/stripe/webhook
 * Webhook de Stripe para recibir eventos
 * IMPORTANTE: Este endpoint NO debe usar el middleware de autenticación
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET no configurado');
        res.status(500).json({ error: 'Webhook secret no configurado' });
        return;
    }

    let event: Stripe.Event;

    try {
        // Verificar la firma del webhook
        event = stripe.webhooks.constructEvent(
            req.body, // Debe ser el raw body
            sig,
            webhookSecret
        );
    } catch (err: any) {
        console.error('Error verificando webhook:', err.message);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
    }

    // Manejar los diferentes tipos de eventos
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await stripeService.handleCheckoutCompleted(
                    event.data.object as Stripe.Checkout.Session
                );
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await stripeService.handleSubscriptionUpdated(
                    event.data.object as Stripe.Subscription
                );
                break;

            case 'customer.subscription.deleted':
                await stripeService.handleSubscriptionDeleted(
                    event.data.object as Stripe.Subscription
                );
                break;

            case 'invoice.payment_failed':
                await stripeService.handlePaymentFailed(
                    event.data.object as Stripe.Invoice
                );
                break;

            case 'invoice.paid':
                // Pago exitoso - la suscripción ya se actualiza con subscription.updated
                console.log('Pago exitoso:', event.data.object);
                break;

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Error procesando evento' });
    }
};
