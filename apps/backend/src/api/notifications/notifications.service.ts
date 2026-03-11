import { supabase } from '../../supabase.js';
import { notifications as NotificationType } from '@planmyroute/types';
import * as PushNotificationService from '../../services/pushNotificationService.js';

const TABLE_NAME = 'notifications';

export const getById = async (id: string | number) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al obtener la notificación: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna notificación con el id: ${id}`);
    }

    return data as NotificationType;
};

export const getByReceiverId = async (userReceiverId: string) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_receiver_id', userReceiverId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener las notificaciones: ${error.message}`);
    }

    return data as NotificationType[];
};

export const create = async (notificationData: Partial<NotificationType>) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(notificationData)
        .select()
        .single();

    if (error) {
        throw new Error(`Error al crear la notificación: ${error.message}`);
    }

    const notification = data as NotificationType;

    // Enviar notificación push si el usuario tiene un token registrado
    if (notificationData.user_receiver_id) {
        try {
            // Obtener el push token del usuario
            const { data: userData, error: userError } = await supabase
                .from('user')
                .select('expo_push_token')
                .eq('id', notificationData.user_receiver_id)
                .maybeSingle();

            if (!userError && userData?.expo_push_token) {
                console.log(`📲 [NotificationService] Sending push notification to user ${notificationData.user_receiver_id}`);

                // Formatear el título y cuerpo según el tipo de notificación
                const { title, body } = PushNotificationService.formatNotificationForPush(
                    notificationData.type || 'default',
                    notificationData.content || '',
                );

                // Enviar notificación push
                const pushResult = await PushNotificationService.sendPushNotification(
                    userData.expo_push_token,
                    title,
                    body,
                    {
                        notificationId: notification.id,
                        tripId: notificationData.related_trip_id,
                        type: notificationData.type,
                    }
                );

                if (pushResult.success) {
                    console.log(`✅ [NotificationService] Push notification sent successfully`);
                } else {
                    console.warn(`⚠️ [NotificationService] Failed to send push: ${pushResult.error}`);
                }
            } else {
                console.log(`ℹ️ [NotificationService] User has no push token registered, skipping push notification`);
            }
        } catch (pushError) {
            // No lanzamos error si falla el push, solo registramos
            console.error(`❌ [NotificationService] Error sending push notification:`, pushError);
        }
    }

    return notification;
};

export const update = async (id: string | number, notificationData: Partial<NotificationType>) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(notificationData)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error(`Error al actualizar la notificación: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna notificación con el id: ${id}`);
    }

    return data as NotificationType;
};

export const deleteNotification = async (id: string | number) => {
    const { data: existing } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('id', id)
        .maybeSingle();

    if (!existing) {
        throw new Error(`No se encontró ninguna notificación con el id: ${id}`);
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Error al eliminar la notificación: ${error.message}`);
    }

    return id;
};

// Helper para marcar como leída
export const markAsRead = async (id: string | number) => {
    return update(id, { status: 'read' } as any);
};

export const acceptInvitation = async (id: string | number) => {
    return update(id, { action_status: 'accepted', status: 'read' } as any);
};

export const declineInvitation = async (id: string | number) => {
    return update(id, { action_status: 'rejected', status: 'read' } as any);
};

export const getByTripId = async (tripId: string | number) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('related_trip_id', tripId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener las notificaciones del viaje: ${error.message}`);
    }

    return data as NotificationType[];
};
