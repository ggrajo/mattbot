import { Platform } from 'react-native';

let _initialized = false;

export async function initializeFCM(deviceId?: string): Promise<string | null> {
  if (_initialized) return null;
  _initialized = true;

  try {
    const messaging = (await import('@react-native-firebase/messaging')).default;

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[FCM] Permission not granted');
      return null;
    }

    const token = await messaging().getToken();
    console.log('[FCM] Token:', token?.substring(0, 20) + '...');

    try {
      const { apiClient } = await import('../api/client');
      await apiClient.post('/push/register', {
        token,
        platform: Platform.OS,
        provider: 'fcm',
        device_id: deviceId,
      });
    } catch (e) {
      console.log('[FCM] Failed to register token with backend:', e);
    }

    return token;
  } catch (e) {
    console.log('[FCM] Initialization failed:', e);
    return null;
  }
}

export function setupFCMListeners(): (() => void) | null {
  let unsubscribers: Array<() => void> = [];

  (async () => {
    try {
      const messaging = (await import('@react-native-firebase/messaging')).default;

      const unsubMessage = messaging().onMessage(async (remoteMessage) => {
        console.log('[FCM] Foreground message:', remoteMessage.notification?.title);
      });
      unsubscribers.push(unsubMessage);

      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('[FCM] Notification opened app:', remoteMessage.notification?.title);
      });

      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('[FCM] App opened from notification:', initialNotification.notification?.title);
      }

      messaging().onTokenRefresh(async (newToken) => {
        try {
          const { apiClient } = await import('../api/client');
          await apiClient.post('/push/register', {
            token: newToken,
            platform: Platform.OS,
            provider: 'fcm',
          });
        } catch {}
      });
    } catch (e) {
      console.log('[FCM] Listener setup failed:', e);
    }
  })();

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
