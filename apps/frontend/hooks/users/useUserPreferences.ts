import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/userService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface UserPreferences {
    autoTripStatusUpdate: boolean;
    timezone: string;
}

interface UpdatePreferencesPayload {
    timezone?: string;
    autoTripStatusUpdate?: boolean;
}

export function useUserPreferences(userId: string | undefined) {
    const { session } = useAuth();
    const token = session?.access_token;
    const queryClient = useQueryClient();

    // Query para obtener preferencias
    const {
        data: preferences,
        isLoading,
        error,
        refetch,
    } = useQuery<UserPreferences>({
        queryKey: ['userPreferences', userId],
        queryFn: async () => {
            if (!userId || !token) {
                throw new Error('User ID or token not available');
            }
            return await UserService.getUserPreferences(userId, token);
        },
        enabled: Boolean(userId && token),
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    // Mutation para actualizar preferencias
    const mutation = useMutation({
        mutationFn: async (newPreferences: UpdatePreferencesPayload) => {
            if (!userId || !token) {
                throw new Error('User ID or token not available');
            }
            return await UserService.updateUserPreferences(userId, newPreferences, token);
        },
        onSuccess: (data) => {
            // Actualizar cache con las nuevas preferencias
            queryClient.setQueryData(['userPreferences', userId], data.preferences);
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['userPreferences', userId] });
        },
        onError: (error) => {
            console.error('Error updating user preferences:', error);
        },
    });

    return {
        preferences,
        isLoading,
        error,
        refetch,
        updatePreferences: mutation.mutate,
        isUpdating: mutation.isPending,
        updateError: mutation.error,
    };
}
