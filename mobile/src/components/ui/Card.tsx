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

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          ...(variant === 'elevated' ? shadows.card : {}),
          ...(variant === 'flat'
            ? { borderWidth: 1, borderColor: colors.border }
            : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
