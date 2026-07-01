import { useQuery } from "@tanstack/react-query";
import { UsageService, UserUsageStats } from "@/services/usageService";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook para obtener las estadísticas de uso del usuario autenticado.
 * @returns Query de React Query con las estadísticas de uso del usuario
 */
export function useUserUsage() {
  const { user, token } = useAuth();

  return useQuery<UserUsageStats>({
    queryKey: ["userUsage", user?.id],
    queryFn: async () => {
      if (!user?.id || !token) {
        throw new Error("Usuario no autenticado");
      }
      return UsageService.getUserUsageStats(user.id, token);
    },
    enabled: !!user?.id && !!token,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
