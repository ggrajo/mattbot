import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface Props {
  delay?: number;
  duration?: number;
  slide?: 'up' | 'down';
  style?: ViewStyle;
  children: React.ReactNode;
}

export function FadeIn({
  delay = 0,
  duration = 300,
  slide,
  style,
  children,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slide === 'down' ? -12 : slide === 'up' ? 12 : 0)).current;

  useEffect(() => {
    const animations = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ];

    if (slide) {
      animations.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      );
    }

    Animated.parallel(animations).start();
  }, [delay, duration, opacity, slide, translateY]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
