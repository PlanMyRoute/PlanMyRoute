import { API_URL, apiFetch } from '@/constants/api';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

let notificationHandlerConfigured = false;

export async function registerForPushNotificationsAsync(userId: string, authToken?: string) {
    try {
        if (!Device.isDevice) {
            console.warn('⚠️ Push notifications are not supported on emulators/simulators');
            return { success: false, token: null, error: 'Device not supported' };
        }

        if (Constants.executionEnvironment === 'storeClient') {
            console.warn('⚠️ Push notifications are not available in Expo Go (SDK 53+). Use a development build instead.');
            return { success: false, token: null, error: 'Expo Go not supported' };
        }

        const Notifications = await import('expo-notifications');

        if (!notificationHandlerConfigured) {
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
            notificationHandlerConfigured = true;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('⚠️ Push notification permission not granted');
            return { success: false, token: null, error: 'Permission not granted' };
        }

        console.log('📲 Getting Expo push token...');
        // Intentar obtener el token sin projectId (funciona en Expo Go con experienceId)
        let tokenData;
        try {
            tokenData = await Notifications.getExpoPushTokenAsync();
        } catch (error: any) {
            // Si falla sin projectId, mostrar el error
            console.error('❌ Failed to get push token:', error.message);
            throw error;
        }
        const expoPushToken = tokenData.data;
        console.log('✅ Expo push token obtained:', expoPushToken);

        // Send token to backend if authToken and userId are provided
        if (authToken && userId) {
            try {
                console.log(`📤 Sending push token to backend: ${API_URL}/api/user/${userId}/push-token`);
                await apiFetch<void>(`/api/user/${userId}/push-token`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    token: authToken,
                    body: JSON.stringify({ expoPushToken }),
                });
                console.log('✅ Push token sent to backend successfully');
            } catch (err) {
                console.warn('⚠️ Failed to send push token to backend', err);
            }
        }

        return { success: true, token: expoPushToken };
    } catch (error) {
        console.error('❌ registerForPushNotificationsAsync error:', error);
        return { success: false, token: null, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function unregisterPushToken(userId: string, authToken?: string) {
    if (!authToken || !userId) return;
    try {
        await apiFetch<void>(`/api/user/${userId}/push-token`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            token: authToken,
            body: JSON.stringify({ expoPushToken: null }),
        });
    } catch (err) {
        console.warn('⚠️ Failed to unregister push token', err);
    }
}

