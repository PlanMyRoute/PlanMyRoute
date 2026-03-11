import { stripe, STRIPE_CONFIG, getPriceIdByPlan, PlanType } from '../../config/stripe.config.js';
import { supabase } from '../../supabase.js';
import Stripe from 'stripe';

export class StripeService {

    /**
     * Crea una sesión de Stripe Checkout para suscripción
     */
    async createCheckoutSession(
        userId: string, 
        plan: PlanType, 
        platform: 'web' | 'mobile' = 'web',
        customSuccessUrl?: string,
        customCancelUrl?: string
    ): Promise<{ sessionId: string; url: string }> {
        
        // 1. Obtener datos del usuario
        const { data: user, error: userError } = await supabase
            .from('user')
            .select('email')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            throw new Error('Usuario no encontrado');
        }

        // 2. Buscar o crear cliente en Stripe
        let customerId = await this.getOrCreateStripeCustomer(userId, user.email);

        // 3. Obtener el Price ID según el plan
        const priceId = getPriceIdByPlan(plan);

        // 4. URLs de redirección según plataforma
        // Usar URLs personalizadas si se proporcionan (para desarrollo local)
        let successUrl: string;
        let cancelUrl: string;
        
        if (platform === 'mobile') {
            successUrl = STRIPE_CONFIG.MOBILE_SUCCESS_URL;
            cancelUrl = STRIPE_CONFIG.MOBILE_CANCEL_URL;
        } else if (customSuccessUrl && customCancelUrl) {
            // URLs proporcionadas por el frontend (desarrollo local)
            successUrl = `${customSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`;
            cancelUrl = customCancelUrl;
        } else {
            // URLs por defecto (producción)
            successUrl = `${STRIPE_CONFIG.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`;
            cancelUrl = STRIPE_CONFIG.CANCEL_URL;
        }

        // 5. Crear sesión de checkout
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: userId,
                plan: plan,
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                    plan: plan,
                },
            },
            // Opciones adicionales
            allow_promotion_codes: true, // Permite códigos de descuento de Stripe
            billing_address_collection: 'auto',
        });

        return {
            sessionId: session.id,
            url: session.url || '',
        };
    }

    /**
     * Crea un portal de cliente para gestionar suscripción
     */
    async createCustomerPortalSession(userId: string): Promise<{ url: string }> {
        const customerId = await this.getStripeCustomerId(userId);
        
        if (!customerId) {
            throw new Error('No se encontró cliente de Stripe para este usuario');
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: STRIPE_CONFIG.SUCCESS_URL.replace('/success', ''),
        });

        return { url: session.url };
    }

    /**
     * Maneja el webhook de Stripe para checkout completado
     */
    async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        if (!userId) {
            console.error('Checkout completado sin userId en metadata');
            return;
        }

        // Obtener detalles de la suscripción
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Actualizar la suscripción en nuestra base de datos
        await this.updateSubscriptionInDatabase(userId, subscription);
    }

    /**
     * Maneja el webhook cuando una suscripción se crea o actualiza
     */
    async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const userId = subscription.metadata?.userId;

        if (!userId) {
            // Intentar buscar por customer ID
            const customerId = subscription.customer as string;
            const foundUserId = await this.getUserIdByCustomerId(customerId);
            
            if (!foundUserId) {
                console.error('Suscripción actualizada sin userId asociado');
                return;
            }
            
            await this.updateSubscriptionInDatabase(foundUserId, subscription);
            return;
        }

        await this.updateSubscriptionInDatabase(userId, subscription);
    }

    /**
     * Maneja el webhook cuando una suscripción se cancela/elimina
     */
    async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const customerId = subscription.customer as string;
        const userId = await this.getUserIdByCustomerId(customerId);

        if (!userId) {
            console.error('Suscripción eliminada sin userId asociado');
            return;
        }

        // Revertir a plan Free
        await supabase
            .from('subscriptions')
            .update({
                status: 'canceled',
                tier: 'free',
                provider_subscription_id: null,
                cancel_at_period_end: false,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        console.log(`Suscripción cancelada para usuario ${userId}`);
    }

    /**
     * Maneja el webhook cuando un pago falla
     */
    async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        const customerId = invoice.customer as string;
        const userId = await this.getUserIdByCustomerId(customerId);

        if (!userId) return;

        // Actualizar estado a past_due
        await supabase
            .from('subscriptions')
            .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        // TODO: Enviar notificación al usuario sobre el pago fallido
        console.log(`Pago fallido para usuario ${userId}`);
    }

    // --- MÉTODOS AUXILIARES ---

    /**
     * Obtiene o crea un cliente en Stripe
     */
    private async getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
        // 1. Buscar si ya existe en nuestra BD
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('provider_subscription_id')
            .eq('user_id', userId)
            .single();

        // Si ya tiene una suscripción de Stripe, buscar el customer
        if (subscription?.provider_subscription_id) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(
                    subscription.provider_subscription_id
                );
                return stripeSubscription.customer as string;
            } catch {
                // La suscripción no existe en Stripe, continuar para crear cliente
            }
        }

        // 2. Buscar cliente existente en Stripe por email
        const existingCustomers = await stripe.customers.list({
            email: email,
            limit: 1,
        });

        if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0].id;
        }

        // 3. Crear nuevo cliente en Stripe
        const customer = await stripe.customers.create({
            email: email,
            metadata: {
                userId: userId,
            },
        });

        return customer.id;
    }

    /**
     * Obtiene el Stripe Customer ID de un usuario
     */
    private async getStripeCustomerId(userId: string): Promise<string | null> {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('provider_subscription_id')
            .eq('user_id', userId)
            .single();

        if (subscription?.provider_subscription_id) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(
                    subscription.provider_subscription_id
                );
                return stripeSubscription.customer as string;
            } catch {
                return null;
            }
        }

        return null;
    }

    /**
     * Busca el userId por Stripe Customer ID
     */
    private async getUserIdByCustomerId(customerId: string): Promise<string | null> {
        try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer.deleted) return null;
            return (customer as Stripe.Customer).metadata?.userId || null;
        } catch {
            return null;
        }
    }

    /**
     * Actualiza la suscripción en la base de datos
     */
    private async updateSubscriptionInDatabase(
        userId: string, 
        subscription: Stripe.Subscription
    ): Promise<void> {
        // Mapear estado de Stripe a nuestro estado
        const statusMap: Record<string, string> = {
            'active': 'active',
            'trialing': 'trialing',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'unpaid': 'past_due',
            'incomplete': 'incomplete',
            'incomplete_expired': 'canceled',
            'paused': 'paused',
        };

        const status = statusMap[subscription.status] || 'active';
        const plan = subscription.metadata?.plan || 'monthly';
        
        // Calcular fechas - usar 'as any' para acceder a propiedades que pueden variar según versión de API
        const subData = subscription as any;
        const currentPeriodStart = new Date(subData.current_period_start * 1000);
        const currentPeriodEnd = new Date(subData.current_period_end * 1000);
        const trialEnd = subData.trial_end 
            ? new Date(subData.trial_end * 1000) 
            : null;

        await supabase
            .from('subscriptions')
            .update({
                status: status,
                tier: 'premium',
                current_period_start: currentPeriodStart.toISOString(),
                current_period_end: currentPeriodEnd.toISOString(),
                is_trial: subscription.status === 'trialing',
                trial_end: trialEnd?.toISOString() || null,
                provider_subscription_id: subscription.id,
                cancel_at_period_end: subscription.cancel_at_period_end,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        console.log(`Suscripción actualizada para usuario ${userId}: ${status} (${plan})`);
    }

    /**
     * Cancela la suscripción al final del período
     */
    async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('provider_subscription_id, tier, status')
            .eq('user_id', userId)
            .single();

        if (!subscription) {
            throw new Error('No se encontró información de suscripción');
        }

        // Si tiene suscripción de Stripe, cancelar en Stripe
        if (subscription.provider_subscription_id) {
            try {
                // Cancelar al final del período (no inmediatamente)
                await stripe.subscriptions.update(subscription.provider_subscription_id, {
                    cancel_at_period_end: true,
                });

                // Actualizar en nuestra BD
                await supabase
                    .from('subscriptions')
                    .update({
                        cancel_at_period_end: true,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                return { 
                    success: true, 
                    message: 'Tu suscripción se cancelará al final del período actual.' 
                };
            } catch (error: any) {
                console.error('Error cancelando en Stripe:', error);
                throw new Error('Error al cancelar la suscripción en Stripe');
            }
        } else {
            // No tiene suscripción de Stripe (Premium por código/trial)
            // Simplemente marcamos que se va a cancelar
            await supabase
                .from('subscriptions')
                .update({
                    cancel_at_period_end: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            return { 
                success: true, 
                message: 'Tu acceso Premium se desactivará cuando expire el período actual.' 
            };
        }
    }

    /**
     * Reactiva una suscripción que iba a cancelarse
     */
    async reactivateSubscription(userId: string): Promise<{ success: boolean; message: string }> {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('provider_subscription_id')
            .eq('user_id', userId)
            .single();

        // Si tiene suscripción de Stripe, reactivar en Stripe
        if (subscription?.provider_subscription_id) {
            try {
                await stripe.subscriptions.update(subscription.provider_subscription_id, {
                    cancel_at_period_end: false,
                });
            } catch (error) {
                console.error('Error reactivando en Stripe:', error);
            }
        }

        // Actualizar en nuestra BD
        await supabase
            .from('subscriptions')
            .update({
                cancel_at_period_end: false,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        return { 
            success: true,
            message: 'Tu suscripción ha sido reactivada.'
        };
    }
}
