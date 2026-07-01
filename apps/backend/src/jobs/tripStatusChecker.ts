// src/jobs/tripStatusChecker.ts
import * as TripService from "../api/trips/trips.service.js";
import * as UserService from "../api/users/users.service.js";
import * as NotificationService from "../api/notifications/notifications.service.js";
import { Trip } from "@planmyroute/types";
import { supabase } from "../supabase.js";

/** Horas de gracia tras la fecha de fin antes de considerar el viaje finalizable */
const COMPLETION_GRACE_HOURS = 24;
/** Tiempo (ms) sin respuesta antes de enviar un recordatorio */
const REMINDER_THRESHOLD_MS = 24 * 60 * 60 * 1000;
/** Tiempo (ms) sin respuesta antes de auto-actualizar el estado */
const AUTO_UPDATE_THRESHOLD_MS = 48 * 60 * 60 * 1000;
/** Número máximo de recordatorios antes de auto-actualizar */
const MAX_REMINDERS = 2;

/** Configuración para una transición automática de estado de viaje */
interface TransitionConfig {
  /** Nuevo estado al que transicionar */
  newStatus: "going" | "completed";
  /** Contenido de la notificación cuando se auto-actualiza */
  autoContent: (tripName: string) => string;
  /** Contenido de la notificación cuando se pide confirmación */
  checkContent: (tripName: string) => string;
  /** Etiqueta para el log */
  logLabel: string;
  /** Emoji para el log */
  logEmoji: string;
}

/**
 * Procesa un conjunto de viajes para una transición de estado.
 * Para cada viaje: si el usuario tiene auto-actualización habilitada, cambia el estado
 * automáticamente; si no, envía una notificación pidiendo confirmación (evitando duplicados).
 */
const processTripsForTransition = async (
  trips: Trip[],
  config: TransitionConfig,
): Promise<void> => {
  if (trips.length === 0) return;

  let autoUpdatedCount = 0;
  let notificationsSentCount = 0;

  for (const trip of trips) {
    try {
      const owner = await TripService.getTripOwner(trip.id);
      const preferences = await UserService.getUserPreferences(owner.id);

      if (preferences.autoTripStatusUpdate) {
        await TripService.updateTripStatus(
          trip.id,
          config.newStatus,
          "auto",
          "Estado actualizado automáticamente según preferencias del usuario",
        );
        await NotificationService.create({
          user_receiver_id: owner.id,
          related_trip_id: trip.id,
          type: "trip_update",
          content: config.autoContent(trip.name),
          status: "unread",
        });
        autoUpdatedCount++;
      } else {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_receiver_id", owner.id)
          .eq("related_trip_id", trip.id)
          .eq("type", "trip_status_check")
          .eq("action_status", "pending")
          .limit(1);

        if (!existing || existing.length === 0) {
          await NotificationService.create({
            user_receiver_id: owner.id,
            related_trip_id: trip.id,
            type: "trip_status_check",
            content: config.checkContent(trip.name),
            status: "unread",
            action_status: "pending",
          });
          notificationsSentCount++;
        }
      }
    } catch (error) {
      console.error(
        `❌ [TripStatusChecker] Error procesando viaje ${trip.id}:`,
        error,
      );
    }
  }

  if (autoUpdatedCount > 0 || notificationsSentCount > 0) {
    console.log(
      `${config.logEmoji} [TripStatusChecker] ${config.logLabel}: ${notificationsSentCount} notificaciones, ${autoUpdatedCount} auto-actualizados`,
    );
  }
};

/**
 * Verifica y procesa viajes que deberían comenzar.
 * Busca todos los viajes en estado 'planning' cuya fecha de inicio ya ha pasado
 * y que aún no tienen una notificación pendiente de confirmación.
 */
export const checkTripsToStart = async (): Promise<void> => {
  try {
    const trips = await TripService.getTripsReadyToStart();
    await processTripsForTransition(trips, {
      newStatus: "going",
      autoContent: (name) =>
        `Tu viaje "${name}" ha comenzado automáticamente. ¡Buen viaje! 🚗`,
      checkContent: (name) =>
        `¡Es hora de partir! Tu viaje "${name}" está programado para comenzar ahora. ¿Ya empezaste el viaje?`,
      logLabel: "Inicio",
      logEmoji: "🚗",
    });
  } catch (error) {
    console.error(
      "❌ [TripStatusChecker] Error fatal en verificación de inicio:",
      error,
    );
    throw error;
  }
};

/**
 * Verifica y procesa viajes que deberían terminar.
 * Busca todos los viajes en estado 'going' cuya fecha de fin superó el período de gracia.
 */
export const checkTripsToComplete = async (): Promise<void> => {
  try {
    const trips = await TripService.getTripsReadyToComplete(
      COMPLETION_GRACE_HOURS,
    );
    await processTripsForTransition(trips, {
      newStatus: "completed",
      autoContent: (name) =>
        `Tu viaje "${name}" ha sido marcado como completado. ¡Esperamos que hayas disfrutado! 🎉`,
      checkContent: (name) =>
        `¡Ya llegaste! Han pasado 24 horas desde el fin programado de tu viaje "${name}". ¿Ya terminaste el viaje?`,
      logLabel: "Fin",
      logEmoji: "🏁",
    });
  } catch (error) {
    console.error(
      "❌ [TripStatusChecker] Error fatal en verificación de finalización:",
      error,
    );
    throw error;
  }
};

/**
 * Procesa recordatorios para notificaciones pendientes sin respuesta.
 *
 * Flujo por notificación:
 *   reminder_count=0, edad > 24h  → push recordatorio 1, reminder_count=1
 *   reminder_count=1, edad > 24h  → push recordatorio 2, reminder_count=2
 *   reminder_count≥2, edad > 48h  → auto-actualiza el viaje, cierra la notificación
 *
 * Cuando hay varias notificaciones pendientes para el mismo viaje (legado de bugs
 * anteriores), se procesa sólo la más antigua y las demás se descartan.
 *
 * IMPORTANTE: los recordatorios NO crean nuevos registros en la BD; sólo envían
 * un push y actualizan el reminder_count de la notificación original.
 */
export const checkPendingNotifications = async (): Promise<void> => {
  const startTime = Date.now();

  try {
    const twentyFourHoursAgo = new Date(Date.now() - REMINDER_THRESHOLD_MS);
    const fortyEightHoursAgo = new Date(Date.now() - AUTO_UPDATE_THRESHOLD_MS);

    // Query A: notificaciones que necesitan un recordatorio (reminder_count < 2, edad > 24h)
    const { data: pendingForReminder, error: errorA } = await supabase
      .from("notifications")
      .select(
        "id, user_receiver_id, related_trip_id, content, reminder_count, created_at, trip:related_trip_id(id, name)",
      )
      .eq("type", "trip_status_check")
      .eq("action_status", "pending")
      .lt("created_at", twentyFourHoursAgo.toISOString())
      .lt("reminder_count", MAX_REMINDERS)
      .order("created_at", { ascending: true });

    if (errorA)
      throw new Error(
        `Error al obtener notificaciones pendientes: ${errorA.message}`,
      );

    // Query B: notificaciones que ya recibieron 2 recordatorios y deben auto-actualizarse (edad > 48h)
    const { data: pendingForAutoUpdate, error: errorB } = await supabase
      .from("notifications")
      .select(
        "id, user_receiver_id, related_trip_id, content, reminder_count, created_at, trip:related_trip_id(id, name)",
      )
      .eq("type", "trip_status_check")
      .eq("action_status", "pending")
      .lt("created_at", fortyEightHoursAgo.toISOString())
      .gte("reminder_count", MAX_REMINDERS)
      .order("created_at", { ascending: true });

    if (errorB)
      throw new Error(
        `Error al obtener notificaciones para auto-actualizar: ${errorB.message}`,
      );

    let remindersSent = 0;
    let duplicatesCleared = 0;
    let autoUpdated = 0;

    // --- Procesar recordatorios (Query A) ---
    if (pendingForReminder && pendingForReminder.length > 0) {
      // Agrupar por viaje: procesar sólo la más antigua, descartar duplicados
      const byTrip = new Map<number, typeof pendingForReminder>();
      for (const n of pendingForReminder) {
        if (!n.related_trip_id) continue;
        if (!byTrip.has(n.related_trip_id)) byTrip.set(n.related_trip_id, []);
        byTrip.get(n.related_trip_id)!.push(n);
      }

      for (const [, notifications] of byTrip) {
        // La más antigua es la primera (ordenadas ASC)
        const primary = notifications[0];
        const duplicates = notifications.slice(1);

        // Marcar duplicados como rechazados para limpiar la BD progresivamente
        if (duplicates.length > 0) {
          const dupIds = duplicates.map((d) => d.id);
          await supabase
            .from("notifications")
            .update({ status: "read", action_status: "rejected" })
            .in("id", dupIds);
          duplicatesCleared += duplicates.length;
        }

        const trip = Array.isArray(primary.trip)
          ? primary.trip[0]
          : primary.trip;
        if (!trip) continue;

        const reminderNumber = (primary.reminder_count || 0) + 1;
        const isStart =
          primary.content?.includes("partir") ||
          primary.content?.includes("empezar") ||
          primary.content?.includes("comenzar");

        const content = isStart
          ? `🔔 Recordatorio ${reminderNumber}/2: ¿Ya empezaste tu viaje "${trip.name}"? Por favor confirma el estado.`
          : `🔔 Recordatorio ${reminderNumber}/2: ¿Ya terminaste tu viaje "${trip.name}"? Por favor confirma el estado.`;

        // Enviar push sin crear nuevo registro en la BD
        await NotificationService.sendPushToUser(
          primary.user_receiver_id,
          "trip_status_check",
          content,
          trip.id,
        );

        await supabase
          .from("notifications")
          .update({ reminder_count: reminderNumber })
          .eq("id", primary.id);

        remindersSent++;
      }
    }

    // --- Procesar auto-actualizaciones (Query B) ---
    if (pendingForAutoUpdate && pendingForAutoUpdate.length > 0) {
      for (const notification of pendingForAutoUpdate) {
        try {
          const trip = Array.isArray(notification.trip)
            ? notification.trip[0]
            : notification.trip;
          if (!trip) continue;

          const isStart =
            notification.content?.includes("partir") ||
            notification.content?.includes("empezar") ||
            notification.content?.includes("comenzar");
          const newStatus = isStart ? "going" : "completed";

          await TripService.updateTripStatus(
            trip.id,
            newStatus,
            "auto",
            "Estado actualizado automáticamente después de 2 recordatorios sin respuesta",
            notification.user_receiver_id,
          );

          await supabase
            .from("notifications")
            .update({ status: "read", action_status: "accepted" })
            .eq("id", notification.id);

          await NotificationService.create({
            user_receiver_id: notification.user_receiver_id,
            related_trip_id: trip.id,
            type: "trip_update",
            content: `Tu viaje "${trip.name}" ha sido actualizado automáticamente a "${newStatus === "going" ? "en curso" : "completado"}" tras no recibir respuesta. 🤖`,
            status: "unread",
          });

          autoUpdated++;
        } catch (error) {
          console.error(
            `❌ [TripStatusChecker] Error auto-actualizando notificación ${notification.id}:`,
            error,
          );
        }
      }
    }

    const duration = Date.now() - startTime;
    if (remindersSent > 0 || autoUpdated > 0 || duplicatesCleared > 0) {
      console.log(
        `📊 [TripStatusChecker] Recordatorios: ${remindersSent} enviados, ${autoUpdated} auto-actualizados, ${duplicatesCleared} duplicados eliminados (${duration}ms)`,
      );
    }
  } catch (error) {
    console.error(
      "❌ [TripStatusChecker] Error fatal en verificación de recordatorios:",
      error,
    );
    throw error;
  }
};

/**
 * Ejecuta todas las verificaciones (inicio, fin y recordatorios).
 * Función principal llamada por el cron job.
 */
export const runAllChecks = async (): Promise<void> => {
  const ts = new Date().toISOString();
  console.log(`🕐 [TripStatusChecker] Verificación periódica iniciada (${ts})`);

  try {
    await checkTripsToStart();
    await checkTripsToComplete();
    await checkPendingNotifications();
    console.log("✅ [TripStatusChecker] Verificación completada");
  } catch (error) {
    console.error("❌ [TripStatusChecker] Error en las verificaciones:", error);
    // No lanzamos el error para que el cron continúe en la siguiente ejecución
  }
};
