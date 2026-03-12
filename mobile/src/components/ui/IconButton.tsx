import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  icon: string;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size = 'lg',
  color,
  disabled = false,
  accessibilityLabel,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[{ opacity: disabled ? 0.4 : 1, padding: theme.spacing.xs }, style]}
    >
      <Icon name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}
