import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  icon: string;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function StatusScreen({ icon, title, message, actionTitle, onAction }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
      }}
    >
      <View style={{ marginBottom: spacing.lg }}>
        <Icon name={icon} size={48} color={colors.textSecondary} />
      </View>
      <Text
        style={{
          ...typography.h3,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.xl,
        }}
      >
        {message}
      </Text>
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} />
      )}
    </View>
  );
}
