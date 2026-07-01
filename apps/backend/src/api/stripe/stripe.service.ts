import {
  getStripe,
  STRIPE_CONFIG,
  getPriceIdByPlan,
  getTokenPriceId,
  getTokenPackageByPriceId,
  PlanType,
} from "../../config/stripe.config.js";
import { supabase } from "../../supabase.js";
import * as TokenWalletService from "../../services/tokenWalletService.js";
import * as NotificationService from "../notifications/notifications.service.js";
import { getTokenPackage, TOKEN_GRANTS } from "@planmyroute/types";
import Stripe from "stripe";

// --- FUNCIONES AUXILIARES (no exportadas) ---

/**
 * Obtiene o crea un cliente en Stripe
 */
const getOrCreateStripeCustomer = async (
  userId: string,
  email: string,
): Promise<string> => {
  // 1. Buscar si ya existe en nuestra BD
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  // Si ya tiene una suscripción de Stripe, buscar el customer
  if (subscription?.provider_subscription_id) {
    try {
      const stripeSubscription = await getStripe().subscriptions.retrieve(
        subscription.provider_subscription_id,
      );
      return stripeSubscription.customer as string;
    } catch {
      // La suscripción no existe en Stripe, continuar para crear cliente
    }
  }

  // 2. Buscar cliente existente en Stripe por email
  const existingCustomers = await getStripe().customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // 3. Crear nuevo cliente en Stripe
  const customer = await getStripe().customers.create({
    email: email,
    metadata: {
      userId: userId,
    },
  });

  return customer.id;
};

/**
 * Obtiene el Stripe Customer ID de un usuario
 */
const getStripeCustomerId = async (userId: string): Promise<string | null> => {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscription?.provider_subscription_id) {
    try {
      const stripeSubscription = await getStripe().subscriptions.retrieve(
        subscription.provider_subscription_id,
      );
      return stripeSubscription.customer as string;
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Busca el userId por Stripe Customer ID
 */
const getUserIdByCustomerId = async (
  customerId: string,
): Promise<string | null> => {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).metadata?.userId || null;
  } catch {
    return null;
  }
};

/**
 * Actualiza la suscripción en la base de datos
 */
const updateSubscriptionInDatabase = async (
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> => {
  // Mapear estado de Stripe a nuestro estado
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "paused",
  };

  const status = statusMap[subscription.status] || "active";
  const plan = subscription.metadata?.plan || "yearly";

  // Calcular fechas - usar 'as any' para acceder a propiedades que pueden variar según versión de API
  const subData = subscription as any;
  const currentPeriodStart = new Date(subData.current_period_start * 1000);
  const currentPeriodEnd = new Date(subData.current_period_end * 1000);
  const trialEnd = subData.trial_end
    ? new Date(subData.trial_end * 1000)
    : null;

  await supabase
    .from("subscriptions")
    .update({
      status: status,
      tier: "premium",
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      is_trial: subscription.status === "trialing",
      trial_end: trialEnd?.toISOString() || null,
      provider_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  console.log(
    `Suscripción actualizada para usuario ${userId}: ${status} (${plan})`,
  );
};

// --- FUNCIONES EXPORTADAS ---

/**
 * Construye las URLs de redirección para las sesiones de checkout de Stripe
 * @param platform Plataforma de origen ('web' o 'mobile')
 * @param customSuccessUrl URL de éxito personalizada (opcional, para desarrollo local)
 * @param customCancelUrl URL de cancelación personalizada (opcional, para desarrollo local)
 * @returns Objeto con las URLs de éxito y cancelación
 */
function buildCheckoutUrls(
  platform: "web" | "mobile",
  customSuccessUrl?: string,
  customCancelUrl?: string,
): { successUrl: string; cancelUrl: string } {
  if (platform === "mobile") {
    return {
      successUrl: STRIPE_CONFIG.MOBILE_SUCCESS_URL,
      cancelUrl: STRIPE_CONFIG.MOBILE_CANCEL_URL,
    };
  }
  if (customSuccessUrl && customCancelUrl) {
    return {
      successUrl: `${customSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: customCancelUrl,
    };
  }
  return {
    successUrl: `${STRIPE_CONFIG.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: STRIPE_CONFIG.CANCEL_URL,
  };
}

/**
 * Crea una sesión de Stripe Checkout para suscripción
 */
export const createCheckoutSession = async (
  userId: string,
  plan: PlanType,
  platform: "web" | "mobile" = "web",
  customSuccessUrl?: string,
  customCancelUrl?: string,
): Promise<{ sessionId: string; url: string }> => {
  // 1. Obtener datos del usuario
  const { data: user, error: userError } = await supabase
    .from("user")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) {
    throw new Error("Usuario no encontrado");
  }

  // 2. Buscar o crear cliente en Stripe
  let customerId = await getOrCreateStripeCustomer(userId, user.email);

  // 3. Obtener el Price ID según el plan
  const priceId = getPriceIdByPlan(plan);

  // 4. URLs de redirección según plataforma
  const { successUrl, cancelUrl } = buildCheckoutUrls(
    platform,
    customSuccessUrl,
    customCancelUrl,
  );

  // 5. Crear sesión de checkout
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
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
    billing_address_collection: "auto",
  });

  return {
    sessionId: session.id,
    url: session.url || "",
  };
};

/**
 * Crea una sesión de Stripe Checkout para COMPRA ÚNICA de un paquete de tokens.
 */
export const createTokenCheckoutSession = async (
  userId: string,
  packageId: string,
  platform: "web" | "mobile" = "web",
  customSuccessUrl?: string,
  customCancelUrl?: string,
): Promise<{ sessionId: string; url: string }> => {
  const pkg = getTokenPackage(packageId);
  if (!pkg) {
    throw new Error(`Paquete de tokens inválido: ${packageId}`);
  }

  const { data: user, error: userError } = await supabase
    .from("user")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) {
    throw new Error("Usuario no encontrado");
  }

  const customerId = await getOrCreateStripeCustomer(userId, user.email);
  const priceId = getTokenPriceId(pkg);

  const { successUrl, cancelUrl } = buildCheckoutUrls(
    platform,
    customSuccessUrl,
    customCancelUrl,
  );

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "payment", // compra única (no suscripción)
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tokenPackage: pkg.id,
    },
    payment_intent_data: {
      metadata: {
        userId,
        tokenPackage: pkg.id,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return { sessionId: session.id, url: session.url || "" };
};

/**
 * Crea un portal de cliente para gestionar suscripción
 */
export const createCustomerPortalSession = async (
  userId: string,
): Promise<{ url: string }> => {
  const customerId = await getStripeCustomerId(userId);

  if (!customerId) {
    throw new Error("No se encontró cliente de Stripe para este usuario");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: STRIPE_CONFIG.SUCCESS_URL.replace("/success", ""),
  });

  return { url: session.url };
};

/**
 * Maneja el webhook de Stripe para checkout completado.
 * Distingue compra única de tokens (mode: payment) de suscripción (mode: subscription).
 */
export const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("Checkout completado sin userId en metadata");
    return;
  }

  // Compra única de tokens
  if (session.mode === "payment") {
    const packageId = session.metadata?.tokenPackage;
    const pkg = packageId ? getTokenPackage(packageId) : undefined;
    if (!pkg) {
      console.error(
        "Checkout de pago sin tokenPackage válido en metadata:",
        packageId,
      );
      return;
    }
    // Idempotente por payment_intent.
    const reference = {
      payment_intent: String(session.payment_intent ?? session.id),
    };
    await TokenWalletService.grant(userId, pkg.type, pkg.tokens, reference);
    console.log(
      `Concedidos ${pkg.tokens} tokens (${pkg.id}) al usuario ${userId}`,
    );
    return;
  }

  // Suscripción
  const subscriptionId = session.subscription as string;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await updateSubscriptionInDatabase(userId, subscription);
};

/**
 * Maneja `invoice.paid`. Para la suscripción anual concede el grant de 1000 tokens
 * de forma idempotente por invoice.id (cubre alta inicial y renovaciones anuales).
 */
export const handleInvoicePaid = async (
  invoice: Stripe.Invoice,
): Promise<void> => {
  // Solo nos interesan facturas del precio anual.
  const yearlyPriceId = STRIPE_CONFIG.PRICES.YEARLY;
  const lines = invoice.lines?.data ?? [];
  // `as any`: el shape de InvoiceLineItem varía según la versión de la API de Stripe.
  const isYearly = lines.some(
    (line) => (line as any).price?.id === yearlyPriceId,
  );
  if (!isYearly) return;

  const customerId = invoice.customer as string;
  const userId = await getUserIdByCustomerId(customerId);
  if (!userId) {
    console.error("invoice.paid anual sin userId asociado");
    return;
  }

  // Idempotente por invoice.id.
  await TokenWalletService.grant(
    userId,
    "PREMIUM_ANNUAL_GRANT",
    TOKEN_GRANTS.PREMIUM_ANNUAL_GRANT,
    { invoice_id: invoice.id },
  );
  console.log(
    `Concedidos ${TOKEN_GRANTS.PREMIUM_ANNUAL_GRANT} tokens (grant anual) al usuario ${userId}`,
  );
};

/**
 * Maneja el webhook cuando una suscripción se crea o actualiza
 */
export const handleSubscriptionUpdated = async (
  subscription: Stripe.Subscription,
): Promise<void> => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    // Intentar buscar por customer ID
    const customerId = subscription.customer as string;
    const foundUserId = await getUserIdByCustomerId(customerId);

    if (!foundUserId) {
      console.error("Suscripción actualizada sin userId asociado");
      return;
    }

    await updateSubscriptionInDatabase(foundUserId, subscription);
    return;
  }

  await updateSubscriptionInDatabase(userId, subscription);
};

/**
 * Maneja el webhook cuando una suscripción se cancela/elimina
 */
export const handleSubscriptionDeleted = async (
  subscription: Stripe.Subscription,
): Promise<void> => {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(customerId);

  if (!userId) {
    console.error("Suscripción eliminada sin userId asociado");
    return;
  }

  // Revertir a plan Free
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      tier: "free",
      provider_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  console.log(`Suscripción cancelada para usuario ${userId}`);
};

/**
 * Maneja el webhook cuando un pago falla
 */
export const handlePaymentFailed = async (
  invoice: Stripe.Invoice,
): Promise<void> => {
  const customerId = invoice.customer as string;
  const userId = await getUserIdByCustomerId(customerId);

  if (!userId) return;

  // Actualizar estado a past_due
  await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Notificar al usuario sobre el pago fallido
  await NotificationService.create({
    user_receiver_id: userId,
    type: "trip_update",
    content:
      "Tu último pago ha fallado. Por favor, actualiza tu método de pago para mantener tu suscripción activa.",
    status: "unread",
  });
  console.log(`Pago fallido para usuario ${userId}`);
};

/**
 * Cancela la suscripción al final del período
 */
export const cancelSubscription = async (
  userId: string,
): Promise<{ success: boolean; message: string }> => {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id, tier, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscription) {
    throw new Error("No se encontró información de suscripción");
  }

  // Si tiene suscripción de Stripe, cancelar en Stripe
  if (subscription.provider_subscription_id) {
    try {
      // Cancelar al final del período (no inmediatamente)
      await getStripe().subscriptions.update(
        subscription.provider_subscription_id,
        {
          cancel_at_period_end: true,
        },
      );

      // Actualizar en nuestra BD
      await supabase
        .from("subscriptions")
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return {
        success: true,
        message: "Tu suscripción se cancelará al final del período actual.",
      };
    } catch (error: unknown) {
      console.error("Error cancelando en Stripe:", error);
      throw new Error("Error al cancelar la suscripción en Stripe");
    }
  } else {
    // No tiene suscripción de Stripe (Premium por código/trial)
    // Simplemente marcamos que se va a cancelar
    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return {
      success: true,
      message:
        "Tu acceso Premium se desactivará cuando expire el período actual.",
    };
  }
};

/**
 * Reactiva una suscripción que iba a cancelarse
 */
export const reactivateSubscription = async (
  userId: string,
): Promise<{ success: boolean; message: string }> => {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  // Si tiene suscripción de Stripe, reactivar en Stripe
  if (subscription?.provider_subscription_id) {
    try {
      await getStripe().subscriptions.update(
        subscription.provider_subscription_id,
        {
          cancel_at_period_end: false,
        },
      );
    } catch (error) {
      console.error("Error reactivando en Stripe:", error);
    }
  }

  // Actualizar en nuestra BD
  await supabase
    .from("subscriptions")
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    success: true,
    message: "Tu suscripción ha sido reactivada.",
  };
};
