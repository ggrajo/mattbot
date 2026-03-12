import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface Props {
  delay?: number;
  duration?: number;
  slide?: 'up' | 'down';
  scale?: boolean;
  style?: any;
  children: React.ReactNode;
}

export function FadeIn({
  delay = 0,
  duration = 300,
  slide,
  scale: enableScale,
  style,
  children,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slide === 'down' ? -12 : slide === 'up' ? 12 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(enableScale ? 0.95 : 1)).current;

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

    if (enableScale) {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
      );
    }

    const composite = Animated.parallel(animations);
    composite.start();

    return () => {
      composite.stop();
    };
  }, [delay, duration, enableScale, opacity, scaleAnim, slide, translateY]);

  const transform: Animated.WithAnimatedObject<any>[] = [{ translateY }];
  if (enableScale) {
    transform.push({ scale: scaleAnim });
  }

  return (
    <Animated.View
      style={[
        { opacity, transform },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
