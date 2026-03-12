import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  currentStep: number;
  totalSteps: number;
  label?: string;
}

export function OnboardingProgress({ currentStep, totalSteps, label }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillWidth, {
      toValue: currentStep / totalSteps,
      useNativeDriver: false,
      speed: 12,
      bounciness: 0,
    }).start();
  }, [currentStep, totalSteps, fillWidth]);

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View
        style={{
          height: 6,
          borderRadius: radii.full,
          backgroundColor: colors.surfaceVariant,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: radii.full,
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
        {label
          ? `Step ${currentStep} of ${totalSteps} — ${label}`
          : `Step ${currentStep} of ${totalSteps}`}
      </Text>
    </View>
  );
}
