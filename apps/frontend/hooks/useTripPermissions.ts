import { CollaboratorRole } from '@planmyroute/types';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRolePermissions } from '../utils/permissions';
import { useTravelers } from './useTrips';

/**
 * Hook para obtener el rol del usuario actual en un viaje específico
 */
export function useTripRole(tripId?: string | null) {
    const { user } = useAuth();
    const { data: travelers, isLoading } = useTravelers(tripId, { enabled: Boolean(tripId) });

    const role = useMemo(() => {
        if (!user?.id || !travelers || travelers.length === 0) {
            return null;
        }

        // Buscar al usuario actual en la lista de viajeros
        const currentTraveler = travelers.find(t => t.user.id === user.id);
        return currentTraveler?.role ?? null;
    }, [user?.id, travelers]);

    return {
        role,
        isLoading,
    };
}

/**
 * Hook principal para obtener todos los permisos del usuario en un viaje
 * @param tripId - ID del viaje (null si estamos creando uno nuevo)
 * @param isCreating - Si es true, habilita todos los permisos (modo creación)
 */
export function useTripPermissions(tripId?: string | null, isCreating: boolean = false) {
    const { role, isLoading } = useTripRole(tripId);

    const permissions = useMemo(() => {
        // Si estamos creando el viaje, el usuario tiene todos los permisos
        if (isCreating) {
            return {
                canView: true,
                canEdit: true,
                canDelete: true,
                canLeave: false, // No puede salir de un viaje que está creando
                canInvite: true,
                canChangeRoles: true,
                canRemoveTravelers: true,
                canAddStop: true,
                canEditStop: true,
                canDeleteStop: true,
                canManageRoutes: true,
                canManageAccommodations: true,
                canManageActivities: true,
                canManageItinerary: true,
                canManageTrip: true,
                role: 'owner' as CollaboratorRole,
                isOwner: true,
                isEditor: false,
                isViewer: false,
                isPending: false,
            };
        }

        return getRolePermissions(role as CollaboratorRole | 'pending' | null);
    }, [role, isCreating]);

    return {
        ...permissions,
        isLoading,
    };
}

/**
 * Hook para verificar una acción específica
 * Útil cuando solo necesitas verificar un permiso puntual
 */
export function useCanPerformAction(
    tripId: string | null | undefined,
    action: import('../utils/permissions').TripAction
) {
    const { role, isLoading } = useTripRole(tripId);

    const canPerform = useMemo(() => {
        if (!role || role === 'pending') return false;
        return require('../utils/permissions').canPerformAction(role, action);
    }, [role, action]);

    return {
        canPerform,
        isLoading,
    };
}
