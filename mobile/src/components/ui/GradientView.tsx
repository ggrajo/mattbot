import React from 'react';
import { View, ViewStyle } from 'react-native';

let LinearGradientComponent: React.ComponentType<any> | null = null;

try {
  LinearGradientComponent = require('react-native-linear-gradient').default;
} catch {
  // native module not linked — fall back to plain View
}

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
  if (LinearGradientComponent) {
    return (
      <LinearGradientComponent
        colors={colors}
        start={start}
        end={end}
        style={style}
      >
        {children}
      </LinearGradientComponent>
    );
  }

  return (
    <View style={[{ backgroundColor: colors[0] }, style]}>
      {children}
    </View>
  );
}
