import { ApiError, apiFetch } from "@/constants/api";
import { Trip, Stop, CollaboratorRole } from "@planmyroute/types";

export type CreateTripResponse = {
  trip: Trip;
  routesWithStops: unknown[];
};

export type TravelerWithUser = {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    img?: string | null;
    lastname?: string | null;
    email?: string | null;
  };
  role: CollaboratorRole;
};

export class PremiumLimitError extends Error {
  status: number;
  requiresPremium: boolean;
  usedCount?: unknown;
  maxCount?: unknown;
  error?: unknown;

  constructor(message: string, body: Record<string, unknown>) {
    super(message);
    this.name = "PremiumLimitError";
    this.status = 403;
    this.requiresPremium = true;
    this.usedCount = body.usedCount;
    this.maxCount = body.maxCount;
    this.error = body.error;
  }
}

/**
 * Error lanzado cuando el backend rechaza una acción de IA por saldo de tokens insuficiente (402).
 */
export class InsufficientTokensError extends Error {
  status = 402;
  code = "INSUFFICIENT_TOKENS" as const;
  required?: number;
  balance?: number;

  constructor(message: string, body: Record<string, unknown>) {
    super(message);
    this.name = "InsufficientTokensError";
    this.required =
      typeof body.required === "number" ? body.required : undefined;
    this.balance = typeof body.balance === "number" ? body.balance : undefined;
  }
}

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

export class TripService {
  /**
   * Obtiene todos los viajes (sin filtrar por usuario)
   * @deprecated Usar getUserTrips con userId para obtener viajes del usuario
   */
  static async getTrips(opts?: FetchOptions): Promise<Trip[]> {
    try {
      return await apiFetch<Trip[]>(`/api/trip${buildQuery(opts?.query)}`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("Error in getTrips:", error);
      throw error;
    }
  }

  /**
   * Obtiene todos los viajes de un usuario específico
   */
  static async getUserTrips(
    userId: string,
    opts?: FetchOptions,
  ): Promise<Trip[]> {
    try {
      return await apiFetch<Trip[]>(
        `/api/travelers/${userId}/trips${buildQuery(opts?.query)}`,
        {
          token: opts?.token,
          signal: opts?.signal,
        },
      );
    } catch (error) {
      console.error("Error in getUserTrips:", error);
      throw error;
    }
  }

  /**
   * Obtiene un viaje específico por su ID
   */
  static async getTripById(id: string, opts?: FetchOptions): Promise<Trip> {
    try {
      return await apiFetch<Trip>(`/api/trip/${id}`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("Error in getTripById:", error);
      throw error;
    }
  }

  /**
   * Crea un nuevo viaje.
   */
  static async createTrip(
    trip: Partial<Trip>,
    userId: string,
    iaTrip: boolean,
    token?: string,
  ): Promise<CreateTripResponse> {
    try {
      let result: CreateTripResponse;
      if (iaTrip) {
        trip.description = ""; // IA will generate description
        result = await apiFetch<CreateTripResponse>(
          `/api/automatic-trips/${userId}/generate-trip`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            token,
            body: JSON.stringify(trip),
          },
        );
      } else {
        result = await apiFetch<CreateTripResponse>(
          `/api/travelers/${userId}/trip`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            token,
            body: JSON.stringify(trip),
          },
        );
      }
      return result;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.body &&
        typeof error.body === "object"
      ) {
        const body = error.body as Record<string, unknown>;
        if (error.status === 402 || body.code === "INSUFFICIENT_TOKENS") {
          throw new InsufficientTokensError(
            String(body.error ?? "No tienes tokens suficientes."),
            body,
          );
        }
        if (error.status === 403) {
          throw new PremiumLimitError(
            String(body.error ?? error.message ?? "Límite alcanzado"),
            body,
          );
        }
      }
      console.error("Error in createTrip:", error);
      throw error;
    }
  }

  /**
   * Actualiza un viaje existente
   */
  static async updateTrip(
    id: string,
    trip: Partial<Trip>,
    userId: string,
    token?: string,
  ): Promise<Trip> {
    try {
      return await apiFetch<Trip>(`/api/travelers/${userId}/trip/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        token,
        body: JSON.stringify(trip),
      });
    } catch (error) {
      console.error("Error in updateTrip:", error);
      throw error;
    }
  }

  /**
   * Elimina un viaje
   */
  static async deleteTrip(
    id: string,
    userId: string,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(`/api/travelers/${userId}/trip/${id}`, {
        method: "DELETE",
        token,
      });
    } catch (error) {
      console.error("Error in deleteTrip:", error);
      throw error;
    }
  }

  static async getNumberOfStops(
    tripId: string,
    opts?: FetchOptions,
  ): Promise<Stop[]> {
    try {
      return await apiFetch<Stop[]>(`/api/itinerary/trip/${tripId}/stops`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("Error in getNumberOfStops:", error);
      throw error;
    }
  }

  // =============== TRAVELERS CONTROLLERS ===============
  static async getTravelersInTrip(
    tripId: string,
    opts?: FetchOptions,
  ): Promise<TravelerWithUser[]> {
    try {
      return await apiFetch<TravelerWithUser[]>(
        `/api/travelers/trip/${tripId}`,
        {
          token: opts?.token,
          signal: opts?.signal,
        },
      );
    } catch (error) {
      console.error("Error in getTravelersInTrip:", error);
      throw error;
    }
  }

  /**
   * Obtiene el rol del usuario en un viaje específico
   */
  static async getUserRoleInTrip(
    userId: string,
    tripId: string,
    opts?: FetchOptions,
  ): Promise<"owner" | "editor" | "viewer" | null> {
    try {
      const travelers = await this.getTravelersInTrip(tripId, opts);
      const traveler = travelers.find((t) => t.user.id === userId);
      return traveler ? traveler.role : null;
    } catch (error) {
      console.error("Error in getUserRoleInTrip:", error);
      return null;
    }
  }

  /**
   * Obtiene el nivel de acceso completo del usuario en un viaje
   * Incluye rol, estado del viaje, y permisos granulares
   */
  static async getTripAccessLevel(
    tripId: string,
    opts?: FetchOptions,
  ): Promise<{
    role: "owner" | "editor" | "viewer" | "guest";
    tripStatus: "planning" | "going" | "completed";
    isGuest: boolean;
    isCompleted: boolean;
    permissions: {
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canManageTravelers: boolean;
      canChangeRoles: boolean;
      canLeave: boolean;
    };
  }> {
    try {
      return await apiFetch<{
        role: "owner" | "editor" | "viewer" | "guest";
        tripStatus: "planning" | "going" | "completed";
        isGuest: boolean;
        isCompleted: boolean;
        permissions: {
          canView: boolean;
          canEdit: boolean;
          canDelete: boolean;
          canManageTravelers: boolean;
          canChangeRoles: boolean;
          canLeave: boolean;
        };
      }>(`/api/trip/${tripId}/access-level`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("Error in getTripAccessLevel:", error);
      throw error;
    }
  }

  /**
   * Elimina a un usuario de un viaje (salir del viaje)
   */
  static async leaveTrip(
    userId: string,
    tripId: string,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(`/api/travelers/${userId}/trip/${tripId}/leave`, {
        method: "DELETE",
        token,
      });
    } catch (error) {
      console.error("Error in leaveTrip:", error);
      throw error;
    }
  }

  /**
   * Cambia el rol de un usuario en un viaje
   */
  static async changeUserRole(
    actorUserId: string,
    targetUserId: string,
    tripId: string,
    role: CollaboratorRole,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/api/travelers/${targetUserId}/trip/${tripId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          token,
          body: JSON.stringify({ role, actorUserId }),
        },
      );
    } catch (error) {
      console.error("Error in changeUserRole:", error);
      throw error;
    }
  }

  /**
   * Expulsa a un usuario de un viaje (solo para owners)
   */
  static async kickUser(
    actorUserId: string,
    targetUserId: string,
    tripId: string,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/api/travelers/${targetUserId}/trip/${tripId}/kick?actorUserId=${actorUserId}`,
        {
          method: "DELETE",
          token,
        },
      );
    } catch (error) {
      console.error("Error in kickUser:", error);
      throw error;
    }
  }

  // =============== VEHICLE METHODS ===============

  /**
   * Obtiene los vehículos asociados a un viaje
   */
  static async getVehiclesInTrip(
    tripId: string,
    opts?: FetchOptions,
  ): Promise<any[]> {
    try {
      return await apiFetch<any[]>(`/api/trip/${tripId}/vehicles`, {
        token: opts?.token,
        signal: opts?.signal,
      });
    } catch (error) {
      console.error("Error in getVehiclesInTrip:", error);
      throw error;
    }
  }

  /**
   * Elimina un vehículo de un viaje (requiere permisos de editor u owner)
   */
  static async removeVehicleFromTrip(
    userId: string,
    tripId: string,
    vehicleId: string,
    token?: string,
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/api/travelers/${userId}/trip/${tripId}/vehicle/${vehicleId}`,
        {
          method: "DELETE",
          token,
        },
      );
    } catch (error) {
      console.error("Error in removeVehicleFromTrip:", error);
      throw error;
    }
  }
}
