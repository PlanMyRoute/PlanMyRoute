import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request } from "express";

// Limita por usuario autenticado si lo hay; si no, por IP normalizada.
// ipKeyGenerator espera la IP (string), no el req (normaliza IPv6 correctamente).
const keyGenerator = (req: Request): string =>
  req.userId ?? ipKeyGenerator(req.ip ?? "");

export const aiGenerationLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  keyGenerator,
  message: {
    error: "Demasiadas solicitudes de generación. Inténtalo de nuevo en un minuto.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const refuelLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator,
  message: {
    error: "Demasiadas solicitudes de repostaje. Inténtalo de nuevo en un minuto.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const stripeCheckoutLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator,
  message: {
    error: "Demasiadas solicitudes de pago. Inténtalo de nuevo en un minuto.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
