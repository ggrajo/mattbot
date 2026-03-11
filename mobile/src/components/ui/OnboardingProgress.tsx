import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  current: number;
  total: number;
  label?: string;
}

export function OnboardingProgress({ current, total, label }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillWidth, {
      toValue: current / total,
      useNativeDriver: false,
      speed: 12,
      bounciness: 0,
    }).start();
  }, [current, total, fillWidth]);

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: 2,
            backgroundColor: colors.primary,
            width: fillWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
      <Text
        style={{
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        }}
        allowFontScaling
      >
        {label ? `Step ${current} of ${total} — ${label}` : `Step ${current} of ${total}`}
      </Text>
    </View>
  );
}
