import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function handleDeepLink(nav: Nav, data: Record<string, string> | undefined) {
  if (!data) return;

  const deepLink = data.deep_link ?? data.deepLink;
  if (deepLink) {
    const callMatch = deepLink.match(/mattbot:\/\/call\/(.+)/);
    if (callMatch?.[1]) {
      nav.navigate('CallDetail', { callId: callMatch[1] });
      return;
    }
  }

  if (data.call_id) {
    nav.navigate('CallDetail', { callId: data.call_id });
  }
}

/**
 * Handles foreground notifications and tap-to-open deep linking.
 * Must be called inside a NavigationContainer.
 */
export function useNotificationHandler() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    let unsubOnMessage: (() => void) | undefined;
    let unsubOnOpen: (() => void) | undefined;

    (async () => {
      try {
        const { default: messaging } = await import(
          '@react-native-firebase/messaging'
        );
        const msg = messaging();

        unsubOnMessage = msg.onMessage(async (remoteMessage) => {
          const title =
            remoteMessage.notification?.title ?? 'MattBot';
          const body =
            remoteMessage.notification?.body ?? 'New activity';

          if (Platform.OS === 'android') {
            Alert.alert(title, body, [
              { text: 'Dismiss', style: 'cancel' },
              {
                text: 'View',
                onPress: () =>
                  handleDeepLink(
                    navigation,
                    remoteMessage.data as Record<string, string>,
                  ),
              },
            ]);
          } else {
            Alert.alert(title, body);
          }
        });

        unsubOnOpen = msg.onNotificationOpenedApp((remoteMessage) => {
          handleDeepLink(
            navigation,
            remoteMessage.data as Record<string, string>,
          );
        });

        const initialNotification = await msg.getInitialNotification();
        if (initialNotification) {
          handleDeepLink(
            navigation,
            initialNotification.data as Record<string, string>,
          );
        }
      } catch {
        // Firebase not available (e.g., emulator without Play Services)
      }
    })();

    return () => {
      unsubOnMessage?.();
      unsubOnOpen?.();
    };
  }, [navigation]);
}
