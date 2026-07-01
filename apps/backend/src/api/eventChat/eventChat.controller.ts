import { Request, Response } from "express";
import * as EventChatService from "./eventChat.service.js";

/**
 * Controlador para obtener los mensajes del chat de un evento
 * @param req - Petición HTTP con el eventId en params y page opcional en query
 * @param res - Respuesta HTTP con la lista de mensajes o error
 * @returns Respuesta vacía (void); el resultado se envía mediante res.json
 */
export const getMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { eventId } = req.params as Record<string, string>;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
    const messages = await EventChatService.getMessages(eventId, page);
    res.json(messages);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("Solo el creador")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controlador para enviar un mensaje al chat de un evento
 * @param req - Petición HTTP con eventId en params, userId autenticado y message en body
 * @param res - Respuesta HTTP con el mensaje creado (201) o error
 * @returns Respuesta vacía (void); el resultado se envía mediante res.json
 */
export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { eventId } = req.params as Record<string, string>;
    const userId = req.userId;
    const { message } = req.body as { message: string };

    if (!userId) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    if (!message) {
      res.status(400).json({ error: "El campo message es obligatorio" });
      return;
    }

    const saved = await EventChatService.sendMessage(eventId, userId, message);
    res.status(201).json(saved);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("vacío") || err.message.includes("largo")) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("Solo el creador")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};
