import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info';

interface Props {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'primary' }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  const bgMap: Record<BadgeVariant, string> = {
    primary: colors.primaryContainer,
    success: colors.successContainer,
    warning: colors.warningContainer,
    error: colors.errorContainer,
    info: colors.secondaryContainer,
  };
  const textMap: Record<BadgeVariant, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.secondary,
  };

  return (
    <View
      style={{
        backgroundColor: bgMap[variant],
        borderRadius: radii.full,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: textMap[variant] + '20',
      }}
    >
      <Text
        style={{ ...typography.caption, color: textMap[variant], fontWeight: '600' }}
        allowFontScaling
      >
        {label}
      </Text>
    </View>
  );
}
