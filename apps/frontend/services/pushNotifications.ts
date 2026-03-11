import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Configure how notifications are shown when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync(userId: string, authToken?: string) {
    try {
        if (!Device.isDevice) {
            console.warn('⚠️ Push notifications are not supported on emulators/simulators');
            return { success: false, token: null, error: 'Device not supported' };
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
                console.log(`📤 Sending push token to backend: ${process.env.EXPO_PUBLIC_API_URL}/user/${userId}/push-token`);
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/user/${userId}/push-token`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({ expoPushToken }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Failed to send push token to backend:', response.status, errorText);
                } else {
                    console.log('✅ Push token sent to backend successfully');
                }
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
        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/user/${userId}/push-token`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ expoPushToken: null }),
        });
    } catch (err) {
        console.warn('⚠️ Failed to unregister push token', err);
    }
}
