import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          ...shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
