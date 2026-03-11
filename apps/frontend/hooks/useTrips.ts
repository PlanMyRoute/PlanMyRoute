import { notifications as Notification, Trip, User } from '@planmyroute/types';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { TripService } from '../services/tripService';
import { UserService } from '../services/userService';
import { useNotificationsByTrip } from './useNotifications';

type UseTripsResult = {
  data: Trip | Trip[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useTrips(
  tripId?: string | null,
  options?: { token?: string; enabled?: boolean }
): UseTripsResult {
  const { user, token } = useAuth();
  const enabled = options?.enabled !== false;

  // Usar el token del AuthContext si no se proporciona uno
  const finalToken = options?.token || token;

  // Query para obtener los viajes del usuario autenticado
  const queryTrips = useQuery<Trip[], Error>({
    queryKey: ['trips', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return TripService.getUserTrips(user.id, { token: finalToken || undefined });
    },
    enabled: enabled && !tripId && Boolean(user?.id),
  });

  const queryTrip = useQuery<Trip, Error>({
    queryKey: ['trip', tripId ?? ''],
    queryFn: () => TripService.getTripById(tripId as string, { token: finalToken || undefined }),
    enabled: enabled && Boolean(tripId),
  });

  const data = tripId ? (queryTrip.data ?? null) : (queryTrips.data ?? null);
  const loading = tripId ? queryTrip.isLoading : queryTrips.isLoading;
  const error = tripId ? (queryTrip.error ? queryTrip.error.message : null) : (queryTrips.error ? queryTrips.error.message : null);
  const refetch = () => (tripId ? queryTrip.refetch() : queryTrips.refetch());

  return { data: data as Trip | Trip[] | null, loading, error, refetch };
}

type UseTripStopsCountResult = {
  count: number | null;
  data: any[] | null;
  isLoading: boolean;
  error: Error | null;
};

export function useTripStopsCount(tripId?: string | null, options?: { enabled?: boolean }): UseTripStopsCountResult {
  const { token } = useAuth();
  const enabled = Boolean(tripId) && (options?.enabled !== false);

  const query = useQuery<any[], Error>({
    queryKey: ['trip', tripId, 'stops'],
    queryFn: () => TripService.getNumberOfStops(tripId as string, { token: token || undefined }),
    enabled,
  });

  return {
    count: query.data ? query.data.length : (query.isLoading ? null : 0),
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}

/**
 * Hook para actualizar un viaje
 */
export function useUpdateTrip(token?: string) {
  const { user, token: contextToken } = useAuth();
  const queryClient = useQueryClient();
  const finalToken = token || contextToken;

  return useMutation({
    mutationFn: async ({ tripId, tripData }: { tripId: string; tripData: Partial<Trip> }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return await TripService.updateTrip(tripId, tripData, user.id, finalToken || undefined);
    },
    onSuccess: (_, variables) => {
      // Refrescar la lista de viajes y el detalle de este viaje
      queryClient.invalidateQueries({ queryKey: ['trips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
    },
  });
}
/**
 * Hook para eliminar un viaje
 */
export function useDeleteTrip(token?: string) {
  const { user, token: contextToken } = useAuth();
  const queryClient = useQueryClient();
  const finalToken = token || contextToken;

  return useMutation({
    mutationFn: async (tripId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return await TripService.deleteTrip(tripId, user.id, finalToken || undefined);
    },
    onSuccess: () => {
      // Refrescar todas las listas de viajes
      queryClient.invalidateQueries({ queryKey: ['trips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['activeTrips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pastTrips', user?.id] });
    },
  });
}

/**
 * Hook para salir de un viaje
 */
export function useLeaveTrip(token?: string) {
  const { user, token: contextToken } = useAuth();
  const queryClient = useQueryClient();
  const finalToken = token || contextToken;

  return useMutation({
    mutationFn: async (tripId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return await TripService.leaveTrip(user.id, tripId, finalToken || undefined);
    },
    onSuccess: () => {
      // Refrescar la lista de viajes
      queryClient.invalidateQueries({ queryKey: ['trips', user?.id] });
    },
  });
}

/**
 * Hook para expulsar a un usuario de un viaje (solo owner)
 */
export function useKickUser(token?: string) {
  const { user, token: contextToken } = useAuth();
  const queryClient = useQueryClient();
  const finalToken = token || contextToken;

  return useMutation({
    mutationFn: async ({ userId, tripId }: { userId: string; tripId: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return await TripService.kickUser(user.id, userId, tripId, finalToken || undefined);
    },
    onSuccess: (_, variables) => {
      // Refrescar los viajeros del viaje
      queryClient.invalidateQueries({ queryKey: ['travelers', variables.tripId] });
    },
  });
}

/**
 * Hook para cambiar el rol de un usuario en un viaje
 */
export function useChangeUserRole(token?: string) {
  const { user, token: contextToken } = useAuth();
  const queryClient = useQueryClient();
  const finalToken = token || contextToken;

  return useMutation({
    mutationFn: async ({
      userId,
      tripId,
      role
    }: {
      userId: string;
      tripId: string;
      role: 'owner' | 'editor' | 'viewer'
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      return await TripService.changeUserRole(user.id, userId, tripId, role, finalToken || undefined);
    },
    onSuccess: (_, variables) => {
      // Refrescar los viajeros del viaje
      queryClient.invalidateQueries({ queryKey: ['travelers', variables.tripId] });
    },
  });
}

/**
 * Hook para obtener los viajeros de un viaje
 */
export function useTravelers(tripId?: string | null, options?: { token?: string; enabled?: boolean }) {
  const { token } = useAuth();
  const enabled = Boolean(tripId) && (options?.enabled !== false);
  const finalToken = options?.token || token;

  return useQuery({
    queryKey: ['travelers', tripId ?? ''],
    queryFn: () => TripService.getTravelersInTrip(tripId as string, { token: finalToken || undefined }),
    enabled,
  });
}

/**
 * Tipo para viajeros con su rol incluyendo el estado "pending"
 */
export type TravelerWithRole = {
  user: User;
  role: 'owner' | 'editor' | 'viewer' | 'pending';
};

/**
 * Hook unificado que combina viajeros confirmados con los pendientes (invitaciones)
 * Este hook proporciona una vista completa de todos los viajeros asociados a un viaje:
 * - Viajeros confirmados (desde user_trip con roles: owner, editor, viewer)
 * - Viajeros pendientes (desde notifications con action_status='pending')
 */
export function useTravelersWithPending(
  tripId?: string | null,
  options?: { token?: string; enabled?: boolean }
) {
  const { token } = useAuth();
  const enabled = Boolean(tripId) && (options?.enabled !== false);
  const finalToken = options?.token || token;

  // 1. Obtener viajeros confirmados (con relación en user_trip)
  const {
    data: confirmedTravelers,
    isLoading: isLoadingConfirmed,
    error: errorConfirmed
  } = useTravelers(tripId, { ...options, enabled });

  // 2. Obtener notificaciones de este viaje específico para encontrar invitaciones pending
  const {
    data: notifications,
    isLoading: isLoadingNotifications
  } = useNotificationsByTrip(tripId ?? undefined, { enabled });

  // 3. Filtrar notificaciones pending
  const pendingNotifications = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((n: Notification) => n.action_status === 'pending');
  }, [notifications]);

  // 4. Obtener los usuarios de las notificaciones pending usando useQueries
  const pendingUserIds = pendingNotifications.map((n: Notification) => n.user_receiver_id);

  // useQueries permite hacer múltiples queries en paralelo de forma eficiente
  // Usamos getUserProfile en lugar de getUserById porque es más permisivo (optionalAuth)
  const pendingUsersQueries = useQueries({
    queries: pendingUserIds.map((userId: string) => ({
      queryKey: ['userProfile', userId, 'trip', tripId],
      queryFn: async () => {
        const profileData = await UserService.getUserProfile(userId, { token: finalToken || undefined });
        return profileData.user; // Extraer solo el usuario del perfil
      },
      enabled: enabled && Boolean(userId),
      staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    })),
  });

  // 5. Combinar todos los datos
  const travelersWithPending = useMemo<TravelerWithRole[]>(() => {
    const result: TravelerWithRole[] = [];

    // Añadir viajeros confirmados
    if (confirmedTravelers) {
      result.push(...confirmedTravelers);
    }

    // Añadir viajeros pendientes (solo si no están ya confirmados)
    pendingUsersQueries.forEach((query) => {
      if (query.data) {
        const user = query.data as User;
        // Verificar que no esté ya en la lista de confirmados
        const alreadyConfirmed = result.some(t => t.user.id === user.id);
        if (!alreadyConfirmed) {
          result.push({
            user,
            role: 'pending'
          });
        }
      }
    });

    return result;
  }, [confirmedTravelers, pendingUsersQueries]);

  // 6. Estados de carga y error combinados
  const isLoadingPendingUsers = pendingUsersQueries.some(q => q.isLoading);
  const isLoading = isLoadingConfirmed || isLoadingNotifications || isLoadingPendingUsers;

  const errorPendingUsers = pendingUsersQueries.find(q => q.error)?.error;
  const error = errorConfirmed?.message ?? (errorPendingUsers as Error)?.message ?? null;

  return {
    data: travelersWithPending,
    isLoading,
    error,
    // Refetch invalida todas las queries relacionadas
    refetch: () => {
      // El queryClient se encargará de refrescar automáticamente
      // cuando las notificaciones o travelers cambien
    }
  };
}

/**
 * Hook para obtener solo los viajes completados del usuario
 * Solo retorna viajes con status === 'completed'
 */
export function usePastTrips(userId?: string, options?: { token?: string; enabled?: boolean; publicOnly?: boolean }) {
  const { user, token } = useAuth();
  const targetUserId = userId || user?.id;
  const enabled = options?.enabled !== false;
  const finalToken = options?.token || token;

  return useQuery<Trip[], Error>({
    queryKey: ['pastTrips', targetUserId, options?.publicOnly],
    queryFn: async () => {
      if (!targetUserId) throw new Error('Usuario no especificado');
      const trips = await TripService.getUserTrips(targetUserId, { token: finalToken || undefined });

      // Filtrar solo viajes completados
      let pastTrips = trips.filter(trip => trip.status === 'completed');

      return pastTrips;
    },
    enabled: enabled && Boolean(targetUserId),
  });
}

/**
 * Hook para obtener los viajes activos del usuario
 * Retorna viajes con status 'going' o 'planning' (excluye 'completed')
 */
export function useActiveTrips(options?: { token?: string; enabled?: boolean }) {
  const { user, token } = useAuth();
  const enabled = options?.enabled !== false;
  const finalToken = options?.token || token;

  return useQuery<{ going: Trip[]; planning: Trip[] }, Error>({
    queryKey: ['activeTrips', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      const trips = await TripService.getUserTrips(user.id, { token: finalToken || undefined });

      // Filtrar y organizar viajes activos
      const going = trips.filter(trip => trip.status === 'going');
      const planning = trips.filter(trip => trip.status === 'planning');

      return { going, planning };
    },
    enabled: enabled && Boolean(user?.id),
  });
}

/**
 * Hook para obtener el rol del usuario en un viaje específico
 */
export function useUserRoleInTrip(tripId: string, options?: { token?: string; enabled?: boolean }) {
  const { user, token } = useAuth();
  const enabled = options?.enabled !== false;
  const finalToken = options?.token || token;

  return useQuery<'owner' | 'editor' | 'viewer' | null, Error>({
    queryKey: ['userRoleInTrip', tripId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await TripService.getUserRoleInTrip(user.id, tripId, { token: finalToken || undefined });
    },
    enabled: enabled && Boolean(user?.id) && Boolean(tripId),
  });
}

export default useTrips;