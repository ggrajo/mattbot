import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export function BotLoader({ size = 'large', color, style }: Props) {
  const { colors, radii } = useTheme();
  const tint = color ?? colors.primary;

  const pulse = useRef(new Animated.Value(0.85)).current;
  const glow = useRef(new Animated.Value(0.3)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const iconSize = size === 'large' ? 32 : 20;
  const containerSize = size === 'large' ? 64 : 40;
  const orbSize = size === 'large' ? 80 : 52;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.7, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    const rotateAnim = Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
    );

    pulseAnim.start();
    glowAnim.start();
    rotateAnim.start();

    return () => {
      pulseAnim.stop();
      glowAnim.stop();
      rotateAnim.stop();
    };
  }, [pulse, glow, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          borderWidth: 2,
          borderColor: tint,
          opacity: glow,
          transform: [{ rotate: spin }],
          borderStyle: 'dashed',
        }}
      />

      {/* Pulsing bot container */}
      <Animated.View
        style={{
          width: containerSize,
          height: containerSize,
          borderRadius: radii.full,
          backgroundColor: tint + '18',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulse }],
        }}
      >
        <Icon name="robot-outline" size={iconSize} color={tint} />
      </Animated.View>
    </View>
  );
}
