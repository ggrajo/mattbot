import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  accessibilityLabel?: string;
}

export function Icon({ name, size = 'lg', color, accessibilityLabel }: Props) {
  const theme = useTheme();
  const resolvedSize = typeof size === 'number' ? size : theme.iconSize[size];
  const resolvedColor = color ?? theme.colors.textPrimary;

  return (
    <MaterialCommunityIcons
      name={name}
      size={resolvedSize}
      color={resolvedColor}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
