import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';

interface Props {
  icon: string;
  label: string;
  onPress?: () => void;
  chevron?: boolean;
  rightLabel?: string;
  iconColor?: string;
  labelColor?: string;
  disabled?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  style?: ViewStyle;
}

export function ListRow({
  icon,
  label,
  onPress,
  chevron = true,
  rightLabel,
  iconColor,
  labelColor,
  disabled = false,
  destructive = false,
  isLast = false,
  style,
}: Props) {
  const { colors, spacing, typography } = useTheme();

  const resolvedIconColor = destructive ? colors.error : iconColor ?? colors.primary;
  const resolvedLabelColor = destructive ? colors.error : labelColor ?? colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={resolvedIconColor} />
      <Text
        style={{
          ...typography.body,
          color: resolvedLabelColor,
          flex: 1,
          marginLeft: spacing.md,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {rightLabel ? (
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginRight: spacing.xs }}>
          {rightLabel}
        </Text>
      ) : null}
      {chevron && !disabled && onPress ? (
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}
