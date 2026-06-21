import Constants from "expo-constants";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { ROUTES } from "../constants/routes";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { PushNotificationService } from "../services/pushNotifications";

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
    const supportsRemotePush =
      Device.isDevice && Constants.executionEnvironment !== "storeClient";

    (async () => {
      if (!user || !authToken) return;

      if (!supportsRemotePush) {
        // In Expo Go (SDK 53+) remote push registration is unavailable.
        return;
      }

      await PushNotificationService.register(user.id, authToken);

      if (!mounted) return;
    })();

    if (!supportsRemotePush) {
      return () => {
        mounted = false;
      };
    }

    let NotificationsModule: any;

    (async () => {
      try {
        NotificationsModule = await import("expo-notifications");

        if (!mounted) return;

        // Listener for notifications received while app is foregrounded
        notificationListener.current =
          NotificationsModule.addNotificationReceivedListener(() => {});

        // Listener for responses (user taps on the notification)
        responseListener.current =
          NotificationsModule.addNotificationResponseReceivedListener(
            (response: any) => {
              try {
                const data = response.notification.request.content.data as any;

                if (data?.tripId) {
                  // Navigate to trip screen (adjust route as needed)
                  router.push(ROUTES.trip(data.tripId));
                } else if (data?.notificationId) {
                  router.push(ROUTES.notifications);
                }
              } catch (err) {
                console.error("Error handling notification response:", err);
              }
            },
          );
      } catch (err) {
        console.warn("Push listeners could not be initialized:", err);
      }
    })();

    return () => {
      mounted = false;
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [authToken, user, router]);
}
