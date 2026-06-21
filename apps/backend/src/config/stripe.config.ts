import Stripe from "stripe";
import dotenv from "dotenv";
import { TOKEN_PACKAGES, TokenPackage } from "@planmyroute/types";

dotenv.config();

/**
 * Auxiliar que lanza si falta una variable de entorno.
 * Se invoca perezosamente (al acceder al valor, no al importar el módulo).
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/**
 * Cliente de Stripe — se inicializa perezosamente al primer acceso
 * para no lanzar en tests/módulos que no usan Stripe.
 */
let _stripe: Stripe | undefined;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return _stripe;
}

// Configuración de precios de Stripe (validación perezosa con getters)
export const STRIPE_CONFIG = {
  // Price IDs de suscripción (Test mode). El plan mensual fue retirado.
  PRICES: {
    get YEARLY(): string {
      return requireEnv("STRIPE_PRICE_YEARLY");
    },
  },

  // URLs de redirección después del pago
  get SUCCESS_URL(): string {
    return requireEnv("STRIPE_SUCCESS_URL");
  },
  get CANCEL_URL(): string {
    return requireEnv("STRIPE_CANCEL_URL");
  },

  // Para móvil usamos deep links
  MOBILE_SUCCESS_URL: "planmyroute://subscription/success",
  MOBILE_CANCEL_URL: "planmyroute://subscription/cancel",

  // Precio en euros (para mostrar en frontend)
  DISPLAY_PRICES: {
    YEARLY: 49.99,
  },
};

// Solo queda la suscripción anual.
export type PlanType = "yearly";

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
    throw new Error(
      `Falta la variable de entorno ${pkg.stripePriceEnvKey} con el price id del paquete de tokens "${pkg.id}"`,
    );
  }
  return priceId;
};

/**
 * Mapea un price id one-time de Stripe a su paquete de tokens (para el webhook).
 */
export const getTokenPackageByPriceId = (
  priceId: string,
): TokenPackage | undefined => {
  return TOKEN_PACKAGES.find((pkg) => {
    const envPriceId = process.env[pkg.stripePriceEnvKey];
    return envPriceId && envPriceId === priceId;
  });
};
