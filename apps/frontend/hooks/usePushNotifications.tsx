import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

/**
 * Hook to register for push notifications and attach listeners.
 * - Registers token and posts it to backend using `auth.token` and `auth.user.id`.
 * - Adds listeners for notification received and response (tapped).
 * - Navigates to related trip if notification contains `tripId` in data.
 */
export default function usePushNotifications() {
    const { token: authToken, user } = useAuth();
    const router = useRouter();
    const responseListener = useRef<any>(null);
    const notificationListener = useRef<any>(null);

    useEffect(() => {
        let mounted = true;
        const supportsRemotePush = Device.isDevice && Constants.executionEnvironment !== 'storeClient';

        (async () => {
            if (!user || !authToken) return;

            if (!supportsRemotePush) {
                // In Expo Go (SDK 53+) remote push registration is unavailable.
                console.log('Push registration skipped: Expo Go/dev simulator environment.');
                return;
            }

            const result = await registerForPushNotificationsAsync(user.id, authToken);

            if (!mounted) return;
            if (!result.success) {
                console.log('Push registration failed:', result.error);
            } else {
                console.log('Push token registered:', result.token);
            }
        })();

        if (!supportsRemotePush) {
            return () => {
                mounted = false;
            };
        }

        let NotificationsModule: any;

        (async () => {
            try {
                NotificationsModule = await import('expo-notifications');

                if (!mounted) return;

                // Listener for notifications received while app is foregrounded
                notificationListener.current = NotificationsModule.addNotificationReceivedListener((notification: any) => {
                    console.log('Notification received:', notification);
                });

                // Listener for responses (user taps on the notification)
                responseListener.current = NotificationsModule.addNotificationResponseReceivedListener((response: any) => {
                    try {
                        const data = response.notification.request.content.data as any;
                        console.log('Notification response:', data);

                        if (data?.tripId) {
                            // Navigate to trip screen (adjust route as needed)
                            router.push(`/trip/${data.tripId}`);
                        } else if (data?.notificationId) {
                            router.push('/notifications');
                        }
                    } catch (err) {
                        console.error('Error handling notification response:', err);
                    }
                });
            } catch (err) {
                console.warn('Push listeners could not be initialized:', err);
            }
        })();

        return () => {
            mounted = false;
            if (notificationListener.current) notificationListener.current.remove();
            if (responseListener.current) responseListener.current.remove();
        };
    }, [authToken, user, router]);
}
