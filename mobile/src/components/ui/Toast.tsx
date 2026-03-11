import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

const ICON_MAP: Record<ToastType, string> = {
  success: 'check-circle-outline',
  error: 'alert-circle-outline',
  warning: 'alert-outline',
  info: 'information-outline',
};

export function Toast({
  message,
  type = 'info',
  visible,
  onDismiss,
  duration = 3000,
}: Props) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(onDismiss);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const { colors, spacing, radii, typography, shadows } = theme;
  const accentMap: Record<ToastType, string> = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.primary,
  };
  const bgMap: Record<ToastType, string> = {
    success: colors.successContainer,
    error: colors.errorContainer,
    warning: colors.warningContainer,
    info: colors.primaryContainer,
  };

  const accentColor = accentMap[type];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: spacing.lg,
        right: spacing.lg,
        transform: [{ translateY }],
        opacity,
        zIndex: 9999,
      }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: bgMap[type],
          borderRadius: radii.md,
          overflow: 'hidden',
          ...shadows.card,
        }}
      >
        <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: accentColor }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, flex: 1 }}>
          <Icon name={ICON_MAP[type]} size="md" color={accentColor} />
          <Text style={{ ...typography.bodySmall, color: accentColor, flex: 1, fontWeight: '500' }} allowFontScaling>
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
