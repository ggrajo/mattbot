import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type Variant = 'elevated' | 'flat';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
}

export function Card({ children, variant = 'elevated', style }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  const glassEdge = theme.dark && variant === 'elevated'
    ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }
    : {};

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'elevated' ? colors.surfaceElevated : colors.surface,
          borderRadius: radii.xl,
          padding: spacing.lg,
          ...(variant === 'elevated' ? shadows.card : {}),
          ...(variant === 'flat'
            ? { borderWidth: 1, borderColor: colors.border }
            : {}),
          ...glassEdge,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
