import React from 'react';
import { ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function GradientView({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
}: Props) {
  return (
    <LinearGradient colors={colors} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
}
