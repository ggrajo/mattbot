import { useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      const { default: messaging } = await import('@react-native-firebase/messaging');
      const status = await messaging().requestPermission();
      return (
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch {
      return false;
    }
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const result = await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any,
        {
          title: 'Notification Permission',
          message:
            'MattBot needs notifications to alert you about incoming calls, messages, and reminders.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true;
}

async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message:
            'MattBot needs access to your contacts so you can quickly add VIP, blocked, and known callers.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  if (Platform.OS === 'ios') {
    try {
      const Contacts = require('react-native-contacts').default;
      const status = await Contacts.checkPermission();
      if (status === 'authorized') return true;
      if (status === 'denied') return false;
      const requested = await Contacts.requestPermission();
      return requested === 'authorized';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Automatically requests notification and contacts permissions once per
 * app session.  Call this hook inside any component that renders after
 * the user has authenticated (e.g. RootNavigator's authenticated branch).
 */
export function useAutoPermissions() {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    (async () => {
      await requestNotificationPermission();
      await requestContactsPermission();
    })();
  }, []);
}
