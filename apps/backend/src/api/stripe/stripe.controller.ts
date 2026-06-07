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
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }

        const { platform, successUrl, cancelUrl } = req.body;

        // Solo queda el plan anual.
        const session = await stripeService.createCheckoutSession(
            userId,
            'yearly',
            platform || 'web',
            successUrl,
            cancelUrl
        );

        res.json(session);
    } catch (error: unknown) {
        console.error('Error creando checkout session:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al crear sesión de pago' });
    }
};

/**
 * POST /api/stripe/create-token-checkout-session
 * Crea una sesión de Stripe Checkout para comprar un paquete de tokens (pago único)
 */
export const createTokenCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }

        const { packageId, platform, successUrl, cancelUrl } = req.body;

        if (!packageId) {
            res.status(400).json({ error: 'Falta packageId del paquete de tokens' });
            return;
        }

        const session = await stripeService.createTokenCheckoutSession(
            userId,
            packageId,
            platform || 'web',
            successUrl,
            cancelUrl
        );

        res.json(session);
    } catch (error: unknown) {
        console.error('Error creando token checkout session:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al crear sesión de pago de tokens' });
    }
};

/**
 * POST /api/stripe/create-portal-session
 * Crea una sesión del portal de cliente para gestionar suscripción
 */
export const createPortalSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }
        const session = await stripeService.createCustomerPortalSession(userId);
        res.json(session);
    } catch (error: unknown) {
        console.error('Error creando portal session:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al crear portal de gestión' });
    }
};

/**
 * POST /api/stripe/cancel
 * Cancela la suscripción al final del período
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }
        const result = await stripeService.cancelSubscription(userId);
        res.json(result);
    } catch (error: unknown) {
        console.error('Error cancelando suscripción:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al cancelar suscripción' });
    }
};

/**
 * POST /api/stripe/reactivate
 * Reactiva una suscripción que iba a cancelarse
 */
export const reactivateSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }
        const result = await stripeService.reactivateSubscription(userId);
        res.json(result);
    } catch (error: unknown) {
        console.error('Error reactivando suscripción:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error al reactivar suscripción' });
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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Firma inválida';
        console.error('Error verificando webhook:', message);
        res.status(400).json({ error: `Webhook Error: ${message}` });
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
                // Concede el grant anual de tokens (idempotente por invoice.id).
                await stripeService.handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: unknown) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Error procesando evento' });
    }
};
