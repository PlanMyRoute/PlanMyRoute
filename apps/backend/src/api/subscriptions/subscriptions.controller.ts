import { Request, Response } from "express";
import * as SubscriptionService from "./subscriptions.service.js";

export const getMySubscription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuario no identificado" });
      return;
    }

    const sub = await SubscriptionService.getSubscription(userId);
    res.json(sub);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("No se pudo obtener")) {
      res.json({ tier: "free", status: "active" });
      return;
    }
    res.status(500).json({ error: message });
  }
};

export const startTrial = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Usuario no identificado" });
      return;
    }

    const result = await SubscriptionService.activateTrial(userId);
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Error al activar trial",
    });
  }
};

export const redeemCode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Usuario no identificado" });
      return;
    }

    const { code, type } = req.body;

    if (!code) {
      res.status(400).json({ error: "Falta el código" });
      return;
    }

    let result;
    if (type === "referral") {
      result = await SubscriptionService.redeemReferral(userId, code);
    } else {
      result = await SubscriptionService.redeemPromoCode(userId, code);
    }

    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Error al canjear código",
    });
  }
};
