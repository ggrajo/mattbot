import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';

interface ActionObject {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
}

interface Props {
  icon: string;
  iconColor?: string;
  title: string;
  message?: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
  action?: ActionObject;
}

export function StatusScreen({
  icon,
  iconColor,
  title,
  message,
  subtitle,
  actionTitle,
  onAction,
  action,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  const displayMessage = message || subtitle || '';
  const resolvedActionTitle = actionTitle || action?.title;
  const resolvedOnAction = onAction || action?.onPress;
  const resolvedVariant = action?.variant;

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
        <Icon name={icon} size={48} color={iconColor || colors.textSecondary} />
      </View>
      <Text
        style={{
          ...typography.h3,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
        allowFontScaling
      >
        {title}
      </Text>
      {displayMessage ? (
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: spacing.xl,
          }}
          allowFontScaling
        >
          {displayMessage}
        </Text>
      ) : null}
      {resolvedActionTitle && resolvedOnAction && (
        <Button
          title={resolvedActionTitle}
          onPress={resolvedOnAction}
          variant={resolvedVariant}
        />
      )}
    </View>
  );
}
