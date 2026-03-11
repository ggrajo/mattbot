import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export function Card({ children, style, variant = 'default' }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  const shadow = variant === 'elevated' ? shadows.cardHover : shadows.card;

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
          ...shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
