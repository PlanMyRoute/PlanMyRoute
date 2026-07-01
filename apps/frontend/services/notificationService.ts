import { apiFetch } from "@/constants/api";
import { CollaboratorRole, Notification } from "@planmyroute/types";

const BASE_PATH = "/notification";

type FetchOptions = {
  token?: string;
  signal?: AbortSignal;
};

export class NotificationService {
  /**
   * Obtiene las notificaciones de un usuario receptor.
   * @param userId - Identificador del usuario receptor
   * @param opts - Opciones de fetch (token, signal)
   * @returns Lista de notificaciones del usuario
   */
  static async getByReceiverId(
    userId: string | number,
    opts?: FetchOptions,
  ): Promise<Notification[]> {
    try {
      // Validar que userId existe
      if (!userId) {
        throw new Error("userId is required but was undefined or empty");
      }

      return await apiFetch<Notification[]>(
        `/api${BASE_PATH}/receiver/${userId}`,
        {
          token: opts?.token,
          signal: opts?.signal,
        },
      );
    } catch (error) {
      console.error("NotificationService.getByReceiverId error", error);
      throw error;
    }
  }

  /**
   * Obtiene las notificaciones asociadas a un viaje.
   * @param tripId - Identificador del viaje
   * @param opts - Opciones de fetch (token, signal)
   * @returns Lista de notificaciones del viaje
   */
  static async getByTripId(
    tripId: string | number,
    opts?: FetchOptions,
  ): Promise<Notification[]> {
    try {
      if (!tripId) {
        throw new Error("tripId is required but was undefined or empty");
      }

      return await apiFetch<Notification[]>(`/api${BASE_PATH}/trip/${tripId}`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("NotificationService.getByTripId error", error);
      throw error;
    }
  }

  /**
   * Obtiene una notificación por su ID.
   * @param id - Identificador de la notificación
   * @param opts - Opciones de fetch (token, signal)
   * @returns La notificación encontrada
   */
  static async getById(
    id: string | number,
    opts?: FetchOptions,
  ): Promise<Notification> {
    try {
      return await apiFetch<Notification>(`/api${BASE_PATH}/${id}`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("NotificationService.getById error", error);
      throw error;
    }
  }

  /**
   * Crea una nueva notificación.
   * @param notification - Datos parciales de la notificación a crear
   * @param token - Token de autenticación
   * @returns La notificación creada
   */
  static async create(
    notification: Partial<Notification>,
    token?: string,
  ): Promise<Notification> {
    try {
      return await apiFetch<Notification>(`/api${BASE_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify(notification),
      });
    } catch (error) {
      console.error("NotificationService.create error", error);
      throw error;
    }
  }

  /**
   * Marca una notificación como leída.
   * @param id - Identificador de la notificación
   * @param token - Token de autenticación
   * @returns La notificación actualizada
   */
  static async markAsRead(
    id: string | number,
    token?: string,
  ): Promise<Notification> {
    try {
      return await apiFetch<Notification>(`/api${BASE_PATH}/${id}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
      });
    } catch (error) {
      console.error("NotificationService.markAsRead error", error);
      throw error;
    }
  }

  /**
   * Elimina una notificación.
   * @param id - Identificador de la notificación
   * @param token - Token de autenticación
   */
  static async deleteNotification(
    id: string | number,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(`/api${BASE_PATH}/${id}`, {
        method: "DELETE",
        token,
      });
    } catch (error) {
      console.error("NotificationService.deleteNotification error", error);
      throw error;
    }
  }

  /**
   * Acepta una invitación a un viaje.
   * @param id - Identificador de la notificación de invitación
   * @param role - Rol del colaborador en el viaje
   * @param token - Token de autenticación
   */
  static async acceptInvitation(
    id: string | number,
    role: CollaboratorRole,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(`/api${BASE_PATH}/${id}/accept`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify({ role }),
      });
    } catch (error) {
      console.error("NotificationService.acceptInvitation error", error);
      throw error;
    }
  }

  /**
   * Rechaza una invitación a un viaje.
   * @param id - Identificador de la notificación de invitación
   * @param token - Token de autenticación
   */
  static async declineInvitation(
    id: string | number,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(`/api${BASE_PATH}/${id}/decline`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
      });
    } catch (error) {
      console.error("NotificationService.declineInvitation error", error);
      throw error;
    }
  }
}

export default NotificationService;
