import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function SkeletonLoader({
  width = '100%',
  height = 24,
  borderRadius = 8,
}: Props) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: typeof width === 'number' ? width : (width as string),
          height,
          borderRadius,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
      ]}
    />
  );
}
