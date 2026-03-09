import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  message: string;
  action?: string;
  onAction?: () => void;
}

export function ErrorMessage({ message, action, onAction }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  return (
    <View
      style={{
        backgroundColor: colors.errorContainer,
        borderRadius: radii.md,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
      accessibilityRole="alert"
    >
      <Icon name="alert-circle-outline" size="md" color={colors.error} />
      <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }} allowFontScaling>
        {message}
      </Text>
      {action && onAction && (
        <Text
          onPress={onAction}
          style={{
            ...typography.bodySmall,
            color: colors.error,
            fontWeight: '700',
            textDecorationLine: 'underline',
          }}
          accessibilityRole="button"
          allowFontScaling
        >
          {action}
        </Text>
      )}
    </View>
  );
}
