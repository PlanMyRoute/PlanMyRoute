import * as EventChatService from "./eventChat.service.js";
import {
  BadRequestError,
  UnauthorizedError,
  asyncHandler,
} from "../../utils/errors.js";

/**
 * Controlador para obtener los mensajes del chat de un evento
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { eventId } = req.params as Record<string, string>;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
  const messages = await EventChatService.getMessages(eventId, page);
  res.json(messages);
});

/**
 * Controlador para enviar un mensaje al chat de un evento
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { eventId } = req.params as Record<string, string>;
  const userId = req.userId;
  const { message } = req.body as { message: string };

  if (!userId) {
    throw new UnauthorizedError("Usuario no autenticado");
  }
  if (!message) {
    throw new BadRequestError("El campo message es obligatorio");
  }

  const saved = await EventChatService.sendMessage(eventId, userId, message);
  res.status(201).json(saved);
});
