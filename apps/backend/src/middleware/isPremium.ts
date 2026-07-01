import { Request, Response, NextFunction } from "express";
import { getIsPremium } from "../api/subscriptions/subscriptions.service.js";

/**
 * Middleware que verifica si el usuario autenticado tiene suscripción premium activa.
 * Delega la lógica de negocio a getIsPremium() para evitar duplicación.
 */
export const isPremium = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const premium = await getIsPremium(userId);

    if (premium) {
      return next();
    }

    return res.status(403).json({
      error: "Esta funcionalidad es exclusiva para usuarios Premium.",
      code: "PREMIUM_REQUIRED",
    });
  } catch (error) {
    console.error("Error verificando suscripción:", error);
    return res.status(500).json({ error: "Error verificando suscripción" });
  }
};
