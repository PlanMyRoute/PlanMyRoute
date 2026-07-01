import { apiFetch } from "@/constants/api";
import Constants from "expo-constants";
import * as Device from "expo-device";

let notificationHandlerConfigured = false;

/** Servicio para gestionar notificaciones push */
export class PushNotificationService {
  /** Registra el dispositivo para recibir notificaciones push */
  static async register(userId: string, authToken?: string) {
    try {
      if (!Device.isDevice) {
        console.warn(
          "Las notificaciones push no son compatibles con emuladores/simuladores",
        );
        return { success: false, token: null, error: "Device not supported" };
      }

      if (Constants.executionEnvironment === "storeClient") {
        console.warn(
          "Las notificaciones push no están disponibles en Expo Go (SDK 53+). Usa un build de desarrollo.",
        );
        return { success: false, token: null, error: "Expo Go not supported" };
      }

      const Notifications = await import("expo-notifications");

      if (!notificationHandlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        notificationHandlerConfigured = true;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Permiso de notificaciones push no concedido");
        return { success: false, token: null, error: "Permission not granted" };
      }

      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync();
      } catch (error: unknown) {
        console.error(
          "Error al obtener push token:",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
      const expoPushToken = tokenData.data;

      if (authToken && userId) {
        try {
          await apiFetch<void>(`/api/user/${userId}/push-token`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            token: authToken,
            body: JSON.stringify({ expoPushToken }),
          });
        } catch (err) {
          console.warn("Error al enviar push token al backend", err);
        }
      }

      return { success: true, token: expoPushToken };
    } catch (error) {
      console.error("Error en register:", error);
      return {
        success: false,
        token: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Desregistra el push token del usuario */
  static async unregister(userId: string, authToken?: string) {
    if (!authToken || !userId) return;
    try {
      await apiFetch<void>(`/api/user/${userId}/push-token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        token: authToken,
        body: JSON.stringify({ expoPushToken: null }),
      });
    } catch (err) {
      console.warn("Error al desregistrar push token", err);
    }
  }
}
