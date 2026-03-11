import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'info';

interface Props {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'primary', size = 'md' }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  const bgMap: Record<BadgeVariant, string> = {
    primary: colors.primaryContainer,
    success: colors.successContainer,
    warning: colors.warningContainer,
    error: colors.errorContainer,
    secondary: colors.secondaryContainer,
    info: colors.surfaceVariant,
  };
  const textMap: Record<BadgeVariant, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    secondary: colors.secondary,
    info: colors.textSecondary,
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={{
        backgroundColor: bgMap[variant],
        borderRadius: radii.full,
        paddingHorizontal: isSmall ? spacing.sm : spacing.md,
        paddingVertical: isSmall ? 2 : spacing.xs,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          ...(isSmall ? { fontSize: 10, lineHeight: 14, fontWeight: '700' as const } : { ...typography.caption, fontWeight: '600' as const }),
          color: textMap[variant],
          letterSpacing: 0.3,
          textTransform: isSmall ? 'uppercase' : 'none',
        }}
        allowFontScaling
      >
        {label}
      </Text>
    </View>
  );
}
