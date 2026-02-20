import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = 'info',
  visible,
  onDismiss,
  duration = 3000,
}: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(onDismiss);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const { colors, spacing, radii, typography } = theme;
  const bgMap: Record<ToastType, string> = {
    success: colors.successContainer,
    error: colors.errorContainer,
    warning: colors.warningContainer,
    info: colors.primaryContainer,
  };
  const textMap: Record<ToastType, string> = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.primary,
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: bgMap[type],
        borderRadius: radii.md,
        padding: spacing.lg,
        opacity,
        zIndex: 9999,
      }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={{ ...typography.bodySmall, color: textMap[type] }} allowFontScaling>
        {message}
      </Text>
    </Animated.View>
  );
}
