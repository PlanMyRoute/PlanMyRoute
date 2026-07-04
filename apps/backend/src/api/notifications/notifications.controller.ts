import * as NotificationService from "./notifications.service.js";
import * as TripService from "../trips/trips.service.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  asyncHandler,
} from "../../utils/errors.js";

export const getNotificationsByReceiver = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>; // receiver user id
  const notifications = await NotificationService.getByReceiverId(userId);
  res.json(notifications);
});

export const getNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const notification = await NotificationService.getById(id);
  res.json(notification);
});

export const createNotification = asyncHandler(async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.user_receiver_id || !payload.content) {
    throw new BadRequestError(
      "Faltan campos obligatorios: user_receiver_id y content",
    );
  }

  const newNotification = await NotificationService.create(payload);
  res.status(201).json(newNotification);
});

export const updateNotification = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const updated = await NotificationService.update(id, req.body);
  res.json(updated);
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  await NotificationService.deleteNotification(id);
  res
    .status(200)
    .json({ message: `Notificación con id ${id} borrada correctamente` });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const updated = await NotificationService.markAsRead(id);
  res.json(updated);
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const { role } = req.body;

  // 1. Obtener la notificación actual
  const notification = await NotificationService.getById(id);

  // 2. Validar que es una invitación pendiente
  if (notification.action_status !== "pending") {
    throw new BadRequestError(
      `La invitación ya ha sido ${
        notification.action_status === "accepted" ? "aceptada" : "rechazada"
      } previamente`,
    );
  }

  // 3. Validar que tiene los campos necesarios
  if (!notification.related_trip_id) {
    throw new BadRequestError("La notificación no tiene un viaje asociado");
  }
  if (!notification.user_receiver_id) {
    throw new BadRequestError("La notificación no tiene un usuario receptor");
  }
  if (!role) {
    throw new BadRequestError('Falta el campo "role" en el body');
  }

  // 4. Verificar que el viaje existe
  try {
    await TripService.getById(notification.related_trip_id);
  } catch {
    throw new NotFoundError("El viaje asociado no existe");
  }

  // 5. Añadir usuario al viaje
  try {
    await TripService.createUserTripRelation(
      notification.user_receiver_id,
      notification.related_trip_id,
      role,
    );
  } catch (err) {
    const error = err as Error;
    // Si es un error de duplicate key (usuario ya en el viaje)
    if (
      error.message.includes("duplicate") ||
      error.message.includes("unique")
    ) {
      throw new ConflictError("El usuario ya pertenece a este viaje");
    }
    throw err; // Re-throw si es otro tipo de error
  }

  // 6. Actualizar la notificación
  const notificationUpdated = await NotificationService.acceptInvitation(id);
  res.json(notificationUpdated);
});

export const declineInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;

  // 1. Obtener la notificación actual
  const notification = await NotificationService.getById(id);

  // 2. Validar que es una invitación pendiente
  if (notification.action_status !== "pending") {
    throw new BadRequestError(
      `La invitación ya ha sido ${
        notification.action_status === "accepted" ? "aceptada" : "rechazada"
      } previamente`,
    );
  }

  // 3. Actualizar la notificación
  const notificationUpdated = await NotificationService.declineInvitation(id);
  res.json(notificationUpdated);
});

export const getNotificationsByTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const notifications = await NotificationService.getByTripId(tripId);
  res.json(notifications);
});
