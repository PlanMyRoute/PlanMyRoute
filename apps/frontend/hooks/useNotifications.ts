import { useAuth } from '@/context/AuthContext';
import NotificationService from '@/services/notificationService';
import { CollaboratorRole, notifications as Notification } from '@planmyroute/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const NOTIFICATIONS_STALE_TIME = 15_000;

export function useNotifications(userId?: string | number, options?: { enabled?: boolean }) {
    const { token } = useAuth();
    // Solo habilitar si hay userId Y está habilitado explícitamente
    const enabled = options?.enabled !== false && Boolean(userId);

    const query = useQuery<Notification[], Error>({
        queryKey: ['notifications', String(userId ?? '')],
        queryFn: () => {
            // Validación adicional dentro de queryFn
            if (!userId) {
                throw new Error('No hay userId disponible');
            }
            return NotificationService.getByReceiverId(userId, { token: token || undefined });
        },
        enabled,
        // No intentar refetch automático si falla por falta de userId
        retry: (failureCount, error) => {
            if (error.message.includes('No hay userId')) {
                return false;
            }
            return failureCount < 2;
        },
        staleTime: NOTIFICATIONS_STALE_TIME,
        select: (data) => {
            // Ordenar: pendientes primero, luego por created_at descendente
            return [...data].sort((a, b) => {
                // Si una es pending y otra no, pending va primero
                if (a.action_status === 'pending' && b.action_status !== 'pending') return -1;
                if (a.action_status !== 'pending' && b.action_status === 'pending') return 1;

                // Si ambas son pending o ambas no lo son, ordenar por fecha (más reciente primero)
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA;
            });
        },
    });

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: () => query.refetch(),
    } as const;
}

export function useNotificationsByTrip(tripId?: string | number, options?: { enabled?: boolean }) {
    const { token } = useAuth();
    const enabled = options?.enabled !== false && Boolean(tripId);

    const query = useQuery<Notification[], Error>({
        queryKey: ['notifications', 'trip', String(tripId ?? '')],
        queryFn: () => {
            if (!tripId) {
                throw new Error('No hay tripId disponible');
            }
            return NotificationService.getByTripId(tripId, { token: token || undefined });
        },
        enabled,
        retry: (failureCount, error) => {
            if (error.message.includes('No hay tripId')) {
                return false;
            }
            return failureCount < 2;
        },
        staleTime: NOTIFICATIONS_STALE_TIME,
        select: (data) => {
            // Ordenar: pendientes primero, luego por created_at descendente
            return [...data].sort((a, b) => {
                if (a.action_status === 'pending' && b.action_status !== 'pending') return -1;
                if (a.action_status !== 'pending' && b.action_status === 'pending') return 1;

                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA;
            });
        },
    });

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: () => query.refetch(),
    } as const;
}

export function useNotification(notificationId?: string | number, options?: { enabled?: boolean }) {
    const enabled = options?.enabled !== false && Boolean(notificationId);

    const query = useQuery<Notification, Error>({
        queryKey: ['notification', String(notificationId ?? '')],
        queryFn: () => NotificationService.getById(notificationId as string | number),
        enabled,
        staleTime: NOTIFICATIONS_STALE_TIME,
        retry: 1,
    });

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: () => query.refetch(),
    } as const;
}

// Mutation hook para aceptar invitaciones
export function useAcceptInvitation(userId?: string | number) {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ notificationId, role }: { notificationId: string | number; role: CollaboratorRole }) => {
            await NotificationService.acceptInvitation(notificationId, role, token || undefined);
        },
        onMutate: async ({ notificationId }) => {
            // Cancelar queries en vuelo para evitar que sobrescriban el optimistic update
            await queryClient.cancelQueries({ queryKey: ['notifications', String(userId)] });

            // Snapshot del estado anterior
            const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications', String(userId)]);

            // Optimistic update: actualizar la notificación en cache
            if (previousNotifications) {
                queryClient.setQueryData<Notification[]>(['notifications', String(userId)], (old) =>
                    old?.map((notif) =>
                        notif.id === notificationId
                            ? { ...notif, action_status: 'accepted' as any, status: 'read' as any }
                            : notif
                    ) ?? []
                );
            }

            // Retornar contexto para rollback si falla
            return { previousNotifications };
        },
        onError: (_err, _variables, context) => {
            // Rollback en caso de error
            if (context?.previousNotifications) {
                queryClient.setQueryData(['notifications', String(userId)], context.previousNotifications);
            }
        },
        onSettled: () => {
            // Refrescar desde el servidor para asegurar consistencia
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['notifications', String(userId)] });
            }
        },
    });
}

// Mutation hook para rechazar invitaciones
export function useDeclineInvitation(userId?: string | number) {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string | number) => {
            await NotificationService.declineInvitation(notificationId, token || undefined);
        },
        onMutate: async (notificationId) => {
            // Cancelar queries en vuelo
            await queryClient.cancelQueries({ queryKey: ['notifications', String(userId)] });

            // Snapshot del estado anterior
            const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications', String(userId)]);

            // Optimistic update: actualizar la notificación en cache
            if (previousNotifications) {
                queryClient.setQueryData<Notification[]>(['notifications', String(userId)], (old) =>
                    old?.map((notif) =>
                        notif.id === notificationId
                            ? { ...notif, action_status: 'rejected' as any, status: 'read' as any }
                            : notif
                    ) ?? []
                );
            }

            return { previousNotifications };
        },
        onError: (_err, _variables, context) => {
            // Rollback en caso de error
            if (context?.previousNotifications) {
                queryClient.setQueryData(['notifications', String(userId)], context.previousNotifications);
            }
        },
        onSettled: () => {
            // Refrescar desde el servidor
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['notifications', String(userId)] });
            }
        },
    });
}

// Mutation hook para marcar como leída
export function useMarkAsRead(userId?: string | number) {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string | number) => {
            await NotificationService.markAsRead(notificationId, token || undefined);
        },
        onSuccess: () => {
            // Invalidar la lista de notificaciones para refrescar
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['notifications', String(userId)] });
            }
        },
    });
}

// Mutation hook para eliminar notificación
export function useDeleteNotification(userId?: string | number) {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string | number) => {
            await NotificationService.deleteNotification(notificationId, token || undefined);
        },
        onSuccess: () => {
            // Invalidar la lista de notificaciones para refrescar
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['notifications', String(userId)] });
            }
        },
    });
}

// Mutation hook para crear una notificación
export function useCreateNotification() {
    const { token: contextToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ notification, token }: { notification: Partial<Notification>; token?: string }) => {
            const finalToken = token || contextToken || undefined;
            return await NotificationService.create(notification, finalToken);
        },
        onSuccess: (_data, variables) => {
            // Invalidar las notificaciones del receptor para que se actualicen
            if (variables.notification.user_receiver_id) {
                queryClient.invalidateQueries({
                    queryKey: ['notifications', String(variables.notification.user_receiver_id)],
                });
            }
        },
    });
}

export default useNotifications;
