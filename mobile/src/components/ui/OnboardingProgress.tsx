import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticMedium } from '../../utils/haptics';

interface Props {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const progress = useSharedValue(0);
  const firedHaptic = useRef(false);

  const targetPct = Math.min(currentStep / totalSteps, 1);

  useEffect(() => {
    firedHaptic.current = false;
    progress.value = withSpring(targetPct, { damping: 16, stiffness: 80 }, (finished) => {
      if (finished && !firedHaptic.current) {
        firedHaptic.current = true;
        runOnJS(hapticMedium)();
      }
    });
  }, [targetPct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={{
          ...typography.caption,
          color: colors.textSecondary,
          fontWeight: '600',
          marginBottom: spacing.xs,
        }}
      >
        Step {currentStep} of {totalSteps}
      </Text>
      <View
        style={{
          height: 6,
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.full,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: radii.full,
            },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}
