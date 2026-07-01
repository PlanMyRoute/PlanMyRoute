import { supabase } from "../../supabase.js";
import { Notification } from "@planmyroute/types";
import * as PushNotificationService from "../../services/pushNotificationService.js";

const TABLE_NAME = "notifications";

/**
 * Obtiene una notificación por su ID
 * @param id - ID de la notificación
 * @returns La notificación encontrada
 */
export const getById = async (id: string | number) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener la notificación: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No se encontró ninguna notificación con el id: ${id}`);
  }

  return data as Notification;
};

/**
 * Obtiene todas las notificaciones de un usuario receptor, ordenadas por fecha descendente
 * @param userReceiverId - ID del usuario receptor
 * @returns Lista de notificaciones del usuario
 */
export const getByReceiverId = async (userReceiverId: string) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_receiver_id", userReceiverId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener las notificaciones: ${error.message}`);
  }

  return data as Notification[];
};

/**
 * Crea una nueva notificación y envía un push si el receptor tiene token registrado
 * @param notificationData - Datos parciales de la notificación a crear
 * @returns La notificación creada
 */
export const create = async (notificationData: Partial<Notification>) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(notificationData)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear la notificación: ${error.message}`);
  }

  const notification = data as Notification;

  // Enviar notificación push si el usuario tiene un token registrado
  if (notificationData.user_receiver_id) {
    try {
      // Obtener el push token del usuario
      const { data: userData, error: userError } = await supabase
        .from("user")
        .select("expo_push_token")
        .eq("id", notificationData.user_receiver_id)
        .maybeSingle();

      if (!userError && userData?.expo_push_token) {
        // Formatear el título y cuerpo según el tipo de notificación
        const { title, body } =
          PushNotificationService.formatNotificationForPush(
            notificationData.type || "default",
            notificationData.content || "",
          );

        // Enviar notificación push
        await PushNotificationService.sendPushNotification(
          userData.expo_push_token,
          title,
          body,
          {
            notificationId: notification.id,
            tripId: notificationData.related_trip_id,
            type: notificationData.type,
          },
        );
      }
    } catch (pushError) {
      // No lanzamos error si falla el push — el fallo se registra internamente en PushNotificationService
    }
  }

  return notification;
};

/**
 * Actualiza una notificación existente por su ID
 * @param id - ID de la notificación a actualizar
 * @param notificationData - Datos parciales con los campos a modificar
 * @returns La notificación actualizada
 */
export const update = async (
  id: string | number,
  notificationData: Partial<Notification>,
) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(notificationData)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Error al actualizar la notificación: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No se encontró ninguna notificación con el id: ${id}`);
  }

  return data as Notification;
};

/**
 * Elimina una notificación por su ID
 * @param id - ID de la notificación a eliminar
 * @returns El ID de la notificación eliminada
 */
export const deleteNotification = async (id: string | number) => {
  const { data: existing } = await supabase
    .from(TABLE_NAME)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    throw new Error(`No se encontró ninguna notificación con el id: ${id}`);
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar la notificación: ${error.message}`);
  }

  return id;
};

/**
 * Marca una notificación como leída
 * @param id - ID de la notificación
 * @returns La notificación actualizada con estado "read"
 */
export const markAsRead = async (id: string | number) => {
  return update(id, { status: "read" } as any);
};

/**
 * Acepta una invitación, marcándola como aceptada y leída
 * @param id - ID de la notificación de invitación
 * @returns La notificación actualizada
 */
export const acceptInvitation = async (id: string | number) => {
  return update(id, { action_status: "accepted", status: "read" } as any);
};

/**
 * Rechaza una invitación, marcándola como rechazada y leída
 * @param id - ID de la notificación de invitación
 * @returns La notificación actualizada
 */
export const declineInvitation = async (id: string | number) => {
  return update(id, { action_status: "rejected", status: "read" } as any);
};

/**
 * Obtiene todas las notificaciones asociadas a un viaje, ordenadas por fecha descendente
 * @param tripId - ID del viaje
 * @returns Lista de notificaciones del viaje
 */
export const getByTripId = async (tripId: string | number) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("related_trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Error al obtener las notificaciones del viaje: ${error.message}`,
    );
  }

  return data as Notification[];
};

/**
 * Envía una notificación push directamente al usuario sin crear un registro en la BD.
 * Usado internamente para recordatorios que no deben generar nuevas filas en notifications.
 */
export const sendPushToUser = async (
  userId: string,
  type: string,
  content: string,
  tripId?: number,
): Promise<void> => {
  const { data: userData, error } = await supabase
    .from("user")
    .select("expo_push_token")
    .eq("id", userId)
    .maybeSingle();

  if (error || !userData?.expo_push_token) return;

  const { title, body } = PushNotificationService.formatNotificationForPush(
    type,
    content,
  );
  await PushNotificationService.sendPushNotification(
    userData.expo_push_token,
    title,
    body,
    { tripId, type },
  );
};
