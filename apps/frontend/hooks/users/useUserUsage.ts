import { useQuery } from '@tanstack/react-query';
import { getUserUsageStats, UserUsageStats } from '@/services/usageService';
import { useAuth } from '@/context/AuthContext';

export function useUserUsage() {
  const { user, session } = useAuth();

  return useQuery<UserUsageStats>({
    queryKey: ['userUsage', user?.id],
    queryFn: async () => {
      if (!user?.id || !session?.access_token) {
        throw new Error('Usuario no autenticado');
      }
      return getUserUsageStats(user.id, session.access_token);
    },
    enabled: !!user?.id && !!session?.access_token,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
