import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface Props {
  delay?: number;
  duration?: number;
  slide?: 'up' | 'down';
  scale?: boolean;
  spring?: boolean;
  children: React.ReactNode;
}

export function FadeIn({
  delay = 0,
  duration = 600,
  slide,
  scale: useScale = false,
  spring: useSpring = false,
  children,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slide === 'up' ? 24 : slide === 'down' ? -24 : 0);
  const scaleVal = useSharedValue(useScale ? 0.85 : 1);

  useEffect(() => {
    const animate = useSpring
      ? (v: number) => withSpring(v, { damping: 14, stiffness: 90 })
      : (v: number) => withTiming(v, { duration, easing: Easing.out(Easing.cubic) });

    opacity.value = withDelay(delay, animate(1));
    if (slide) translateY.value = withDelay(delay, animate(0));
    if (useScale) scaleVal.value = withDelay(delay, animate(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scaleVal.value },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
