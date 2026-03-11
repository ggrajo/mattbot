import React from 'react';
import { Pressable } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  icon: string;
  onPress: () => void;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  accessibilityLabel?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 'lg',
  color,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const iconColor = color ?? theme.colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Icon name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}
