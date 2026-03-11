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
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${userId}/usage`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error('❌ Error al obtener usage:', response.status, response.statusText);
    throw new Error('Error al obtener estadísticas de uso');
  }

  const data = await response.json();
  console.log('📊 User usage response:', JSON.stringify(data, null, 2));
  return data;
}
