import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { TripService } from '../services/tripService';

export type TripAccessLevel = {
    role: 'owner' | 'editor' | 'viewer' | 'guest';
    tripStatus: 'planning' | 'going' | 'completed';
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
};

export type UseTripAccessResult = {
    accessLevel: TripAccessLevel | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    // Permisos individuales para fácil acceso
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageTravelers: boolean;
    canChangeRoles: boolean;
    canLeave: boolean;
    // Estado del viaje
    role: 'owner' | 'editor' | 'viewer' | 'guest' | null;
    tripStatus: 'planning' | 'going' | 'completed' | null;
    isGuest: boolean;
    isCompleted: boolean;
    // Helpers de rol
    isOwner: boolean;
    isEditor: boolean;
    isViewer: boolean;
};

/**
 * Hook para obtener el nivel de acceso del usuario actual en un viaje
 * Usa el endpoint del servidor para verificar permisos incluyendo:
 * - Usuarios guest (no en travelers)
 * - Viajes completados (bloqueados para edición)
 * - Permisos granulares por rol
 * 
 * @param tripId - ID del viaje (si es null o undefined, el hook no hace la petición)
 * @param options - Opciones adicionales
 * @returns Información completa de acceso y permisos
 */
export function useTripAccess(
    tripId?: string | null,
    options?: { enabled?: boolean }
): UseTripAccessResult {
    const { token } = useAuth();
    const enabled = Boolean(tripId) && (options?.enabled !== false);

    const query = useQuery<TripAccessLevel, Error>({
        queryKey: ['tripAccess', tripId],
        queryFn: () => TripService.getTripAccessLevel(tripId as string, { token: token || undefined }),
        enabled,
        staleTime: 1000 * 60 * 5, // 5 minutos - los permisos no cambian frecuentemente
        gcTime: 1000 * 60 * 10, // 10 minutos de cache
    });

    const accessLevel = query.data ?? null;

    return {
        accessLevel,
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
        // Permisos individuales
        canView: accessLevel?.permissions.canView ?? false,
        canEdit: accessLevel?.permissions.canEdit ?? false,
        canDelete: accessLevel?.permissions.canDelete ?? false,
        canManageTravelers: accessLevel?.permissions.canManageTravelers ?? false,
        canChangeRoles: accessLevel?.permissions.canChangeRoles ?? false,
        canLeave: accessLevel?.permissions.canLeave ?? false,
        // Estado del viaje
        role: accessLevel?.role ?? null,
        tripStatus: accessLevel?.tripStatus ?? null,
        isGuest: accessLevel?.isGuest ?? false,
        isCompleted: accessLevel?.isCompleted ?? false,
        // Helpers de rol
        isOwner: accessLevel?.role === 'owner',
        isEditor: accessLevel?.role === 'editor',
        isViewer: accessLevel?.role === 'viewer',
    };
}
