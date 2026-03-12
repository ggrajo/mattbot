import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  label?: string;
  style?: ViewStyle;
}

export function Divider({ label, style }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  if (!label) {
    return (
      <View
        style={[{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }, style]}
      />
    );
  }

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          marginVertical: spacing.lg,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text
        style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}
        allowFontScaling
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
