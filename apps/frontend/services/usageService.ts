import { apiFetch } from "@/constants/api";

export interface UserUsageStats {
  usage: {
    ai_trips_generated_month: number;
    max_vehicles_allowed: number;
    last_reset_date: string;
  };
}

/** Servicio para consultar estadísticas de uso del usuario */
export class UsageService {
  /** Obtiene las estadísticas de uso de un usuario */
  static async getUserUsageStats(
    userId: string,
    token: string,
  ): Promise<UserUsageStats> {
    return apiFetch<UserUsageStats>(`/api/user/${userId}/usage`, {
      token,
    });
  }
}
