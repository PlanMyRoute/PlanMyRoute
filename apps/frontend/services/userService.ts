import { apiFetch } from "@/constants/api";
import type { UseProfileData } from "@/hooks/users/useUsers";
import { Interest, User } from "@planmyroute/types";

type FetchOptions = {
  token?: string;
  signal?: AbortSignal;
  query?: Record<string, string | number>;
};

function buildQuery(q?: Record<string, string | number>) {
  if (!q) return "";
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => params.append(k, String(v)));
  return `?${params.toString()}`;
}

export class UserService {
  /**
   * Obtiene la lista de usuarios.
   * @param opts - Opciones de fetch (token, signal, query)
   * @returns Lista de usuarios
   */
  static async getUsers(opts?: FetchOptions): Promise<User[]> {
    try {
      return await apiFetch<User[]>(`/api/user${buildQuery(opts?.query)}`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("UserService.getUsers error", error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por su ID.
   * @param id - Identificador del usuario
   * @param opts - Opciones de fetch (token, signal)
   * @returns El usuario encontrado
   */
  static async getUserById(id: string, opts?: FetchOptions): Promise<User> {
    try {
      return await apiFetch<User>(`/api/user/${id}`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("UserService.getUserById error", error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por su nombre de usuario. Elimina el prefijo @ si está presente.
   * @param username - Nombre de usuario (con o sin prefijo @)
   * @param opts - Opciones de fetch (token, signal)
   * @returns El usuario encontrado
   */
  static async getUserByUsername(
    username: string,
    opts?: FetchOptions,
  ): Promise<User> {
    try {
      const clean = username.startsWith("@") ? username.slice(1) : username;
      return await apiFetch<User>(
        `/api/user/username/${encodeURIComponent(clean)}`,
        {
          token: opts?.token,
          signal: opts?.signal,
        },
      );
    } catch (error) {
      console.error("UserService.getUserByUsername error", error);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario.
   * @param user - Datos parciales del usuario a crear
   * @param token - Token de autenticación
   * @returns El usuario creado
   */
  static async createUser(user: Partial<User>, token?: string): Promise<User> {
    try {
      return await apiFetch<User>("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify(user),
      });
    } catch (error) {
      console.error("UserService.createUser error", error);
      throw error;
    }
  }

  /**
   * Actualiza parcialmente un usuario.
   * @param id - Identificador del usuario
   * @param user - Datos parciales del usuario a actualizar
   * @param token - Token de autenticación
   * @returns El usuario actualizado
   */
  static async updateUser(
    id: string,
    user: Partial<User>,
    token?: string,
  ): Promise<User> {
    try {
      return await apiFetch<User>(`/api/user/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify(user),
      });
    } catch (error) {
      console.error("UserService.updateUser error", error);
      throw error;
    }
  }

  /**
   * Elimina un usuario.
   * @param id - Identificador del usuario
   * @param token - Token de autenticación
   */
  static async deleteUser(id: string, token?: string): Promise<void> {
    try {
      await apiFetch<void>(`/api/user/${id}`, {
        method: "DELETE",
        token,
      });
    } catch (error) {
      console.error("UserService.deleteUser error", error);
      throw error;
    }
  }

  /**
   * Obtiene el perfil completo de un usuario, incluyendo estadísticas e intereses.
   * @param id - Identificador del usuario
   * @param opts - Opciones de fetch (token, signal)
   * @returns Datos del perfil del usuario
   */
  static async getUserProfile(
    id: string,
    opts?: FetchOptions,
  ): Promise<UseProfileData> {
    try {
      return await apiFetch<UseProfileData>(`/api/user/${id}/profile`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("UserService.getUserProfile error", error);
      throw error;
    }
  }

  /**
   * Actualiza los intereses del usuario.
   * @param id - Identificador del usuario
   * @param interests - Lista de intereses a asignar
   * @param token - Token de autenticación
   * @returns El usuario actualizado
   */
  static async updateUserInterests(
    id: string,
    interests: Interest[],
    token?: string,
  ): Promise<User> {
    try {
      //Solo mandamos los intereses que actualizamos
      const body: Partial<User> = {
        user_type: interests,
      };

      return await apiFetch<User>(`/api/user/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error("UserService.updateUserInterests error", error);
      throw error;
    }
  }

  /**
   * Busca usuarios por nombre de usuario.
   * @param username - Texto de búsqueda del nombre de usuario
   * @param opts - Opciones de fetch (token, signal)
   * @returns Lista de usuarios que coinciden con la búsqueda
   */
  static async searchUsersByUsername(
    username: string,
    opts?: FetchOptions,
  ): Promise<User[]> {
    try {
      return await apiFetch<User[]>(
        `/api/user/search/username/${encodeURIComponent(username)}`,
        {
          token: opts?.token,
          signal: opts?.signal,
        },
      );
    } catch (error) {
      console.error("UserService.searchUsersByUsername error", error);
      throw error;
    }
  }

  // =============== USER PREFERENCES ===============

  /**
   * Obtiene las preferencias de un usuario.
   * @param id - Identificador del usuario
   * @param token - Token de autenticación
   * @returns Preferencias del usuario (zona horaria y actualización automática de estado)
   */
  static async getUserPreferences(
    id: string,
    token?: string,
  ): Promise<{ autoTripStatusUpdate: boolean; timezone: string }> {
    try {
      return await apiFetch<{
        autoTripStatusUpdate: boolean;
        timezone: string;
      }>(`/api/user/${id}/preferences`, {
        token,
      });
    } catch (error) {
      console.error("UserService.getUserPreferences error", error);
      throw error;
    }
  }

  /**
   * Actualiza las preferencias de un usuario.
   * @param id - Identificador del usuario
   * @param preferences - Preferencias a actualizar (zona horaria y/o actualización automática)
   * @param token - Token de autenticación
   * @returns Resultado de la operación con las preferencias actualizadas
   */
  static async updateUserPreferences(
    id: string,
    preferences: { timezone?: string; autoTripStatusUpdate?: boolean },
    token?: string,
  ): Promise<{ success: boolean; preferences: any; message: string }> {
    try {
      return await apiFetch<{
        success: boolean;
        preferences: any;
        message: string;
      }>(`/api/user/${id}/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify(preferences),
      });
    } catch (error) {
      console.error("UserService.updateUserPreferences error", error);
      throw error;
    }
  }
}
