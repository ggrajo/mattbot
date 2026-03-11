import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { iconSize as defaultSizes } from '../../theme/tokens';

type SizeName = keyof typeof defaultSizes;

interface Props {
  name: string;
  size?: SizeName | number;
  color?: string;
}

export function Icon({ name, size = 'lg', color = '#FFFFFF' }: Props) {
  const resolved = typeof size === 'number' ? size : defaultSizes[size];
  return <MaterialCommunityIcons name={name} size={resolved} color={color} />;
}
