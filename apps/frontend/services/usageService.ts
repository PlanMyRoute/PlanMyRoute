import { apiFetch } from '@/constants/api';
export interface UserUsageStats {
  usage: {
    ai_trips_generated_month: number;
    max_vehicles_allowed: number;
    last_reset_date: string;
  };
  ai_trip_creation: {
    can_create: boolean;
    used_count?: number;
    max_count?: number;
    reason?: string;
  };
}

export async function getUserUsageStats(userId: string, token: string): Promise<UserUsageStats> {
  const data = await apiFetch<UserUsageStats>(`/api/user/${userId}/usage`, {
    token,
  });
  console.log('📊 User usage response:', JSON.stringify(data, null, 2));
  return data;
}

