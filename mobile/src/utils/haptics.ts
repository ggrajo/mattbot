import { Platform } from 'react-native';

let HapticFeedback: any = null;
try {
  HapticFeedback = require('react-native-haptic-feedback').default;
} catch {
  // haptics unavailable
}

const trigger = (type: string) => {
  if (Platform.OS === 'ios' && HapticFeedback) {
    HapticFeedback.trigger(type, { enableVibrateFallback: false, ignoreAndroidSystemSettings: false });
  }
};

export const hapticLight = () => trigger('impactLight');
export const hapticMedium = () => trigger('impactMedium');
export const hapticSuccess = () => trigger('notificationSuccess');
