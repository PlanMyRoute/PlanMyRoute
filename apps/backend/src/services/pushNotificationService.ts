// src/services/pushNotificationService.ts
import fetch from 'node-fetch';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationMessage {
    to: string; // Expo push token
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    badge?: number;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
}

interface PushNotificationResponse {
    data: {
        status: 'ok' | 'error';
        id?: string;
        message?: string;
        details?: any;
    }[];
}

/**
 * Valida si un token es un Expo Push Token válido
 * Los tokens de Expo tienen el formato: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 */
export const isValidExpoPushToken = (token: string): boolean => {
    if (!token) return false;

    // Formato antiguo: ExponentPushToken[...]
    if (token.startsWith('ExponentPushToken[') && token.endsWith(']')) {
        return true;
    }

    // Formato nuevo: ExpoPushToken[...]
    if (token.startsWith('ExpoPushToken[') && token.endsWith(']')) {
        return true;
    }

    return false;
};

/**
 * Envía una notificación push a un dispositivo usando Expo Push Notifications
 * @param pushToken - Token de Expo Push del dispositivo
 * @param title - Título de la notificación
 * @param body - Cuerpo del mensaje
 * @param data - Datos adicionales para la notificación (trip_id, notification_id, etc)
 * @returns Promise con el resultado del envío
 */
export const sendPushNotification = async (
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Validar el token
        if (!isValidExpoPushToken(pushToken)) {
            console.warn('⚠️ [PushNotification] Invalid Expo push token format:', pushToken);
            return { success: false, error: 'Invalid push token format' };
        }

        const message: PushNotificationMessage = {
            to: pushToken,
            title,
            body,
            data: data || {},
            sound: 'default',
            priority: 'high',
            channelId: 'default',
        };

        console.log('📲 [PushNotification] Sending notification:', {
            to: pushToken,
            title,
            body: body.substring(0, 50) + '...',
        });

        const response = await fetch(EXPO_PUSH_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [PushNotification] HTTP error:', response.status, errorText);
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
            };
        }

        const result = (await response.json()) as PushNotificationResponse;

        if (result.data && result.data.length > 0) {
            const firstResult = result.data[0];

            if (firstResult.status === 'error') {
                console.error('❌ [PushNotification] Expo API error:', firstResult);
                return {
                    success: false,
                    error: firstResult.message || 'Unknown error from Expo API'
                };
            }

            console.log('✅ [PushNotification] Notification sent successfully:', firstResult.id);
            return { success: true };
        }

        return { success: false, error: 'No response data from Expo API' };

    } catch (error) {
        console.error('❌ [PushNotification] Error sending notification:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Envía notificaciones push a múltiples dispositivos
 * @param messages - Array de mensajes para enviar
 * @returns Promise con los resultados de cada envío
 */
export const sendBatchPushNotifications = async (
    messages: Array<{
        pushToken: string;
        title: string;
        body: string;
        data?: Record<string, any>;
    }>
): Promise<Array<{ success: boolean; error?: string }>> => {
    console.log(`📲 [PushNotification] Sending ${messages.length} notifications in batch`);

    const results = await Promise.allSettled(
        messages.map(({ pushToken, title, body, data }) =>
            sendPushNotification(pushToken, title, body, data)
        )
    );

    return results.map((result) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return { success: false, error: result.reason?.message || 'Promise rejected' };
    });
};

/**
 * Formatea el contenido de una notificación para push
 * Extrae el título y cuerpo apropiados según el tipo de notificación
 */
export const formatNotificationForPush = (
    type: string,
    content: string,
    tripName?: string
): { title: string; body: string } => {
    switch (type) {
        case 'invitation':
            return {
                title: '🎉 Nueva invitación de viaje',
                body: content,
            };

        case 'trip_status_check':
            if (content.includes('empezar') || content.includes('comenzar') || content.includes('partir')) {
                return {
                    title: '🚗 ¿Ya empezaste tu viaje?',
                    body: content,
                };
            }
            if (content.includes('terminado') || content.includes('completar')) {
                return {
                    title: '🏁 ¿Ya terminaste tu viaje?',
                    body: content,
                };
            }
            return {
                title: '📋 Actualización de viaje requerida',
                body: content,
            };

        case 'trip_update':
            return {
                title: 'ℹ️ Actualización de viaje',
                body: content,
            };

        default:
            return {
                title: 'PlanMyRoute',
                body: content,
            };
    }
};
