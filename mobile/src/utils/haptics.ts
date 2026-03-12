import { Platform } from 'react-native';

let HapticFeedback: any = null;

try {
  HapticFeedback = require('react-native-haptic-feedback').default;
} catch {
  // Package not installed -- haptics will silently no-op
}

const trigger = (type: string) => {
  if (!HapticFeedback || Platform.OS === 'web') return;
  try {
    HapticFeedback.trigger(type, { enableVibrateFallback: false, ignoreAndroidSystemSettings: false });
  } catch {
    // Simulator or unsupported device
  }
};

export const hapticLight = () => trigger('impactLight');
export const hapticMedium = () => trigger('impactMedium');
export const hapticError = () => trigger('notificationError');
