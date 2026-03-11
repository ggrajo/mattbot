import { Platform } from 'react-native';

export function hapticLight() {
  if (Platform.OS === 'ios') {
    try {
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
      ReactNativeHapticFeedback.trigger('impactLight');
    } catch {}
  }
}

export function hapticMedium() {
  if (Platform.OS === 'ios') {
    try {
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
      ReactNativeHapticFeedback.trigger('impactMedium');
    } catch {}
  }
}

export function hapticSuccess() {
  if (Platform.OS === 'ios') {
    try {
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } catch {}
  }
}
