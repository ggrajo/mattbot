import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import { GradientView } from './GradientView';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { Theme } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme, variant, disabled || loading);
  const spinnerColor =
    variant === 'outline' || variant === 'ghost'
      ? theme.colors.primary
      : theme.colors.onPrimary;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = loading ? (
    <ActivityIndicator size="small" color={spinnerColor} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon && <Icon name={icon} size="md" color={styles.text.color as string} />}
      <Text style={styles.text} allowFontScaling>
        {title}
      </Text>
    </View>
  );

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[animatedStyle, style]}
    >
      {isPrimary ? (
        <GradientView
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.container,
            Platform.OS === 'ios' && {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
            },
          ]}
        >
          {content}
        </GradientView>
      ) : (
        <View
          style={[
            styles.container,
            variant === 'destructive' && Platform.OS === 'ios' && {
              shadowColor: theme.colors.error,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
            },
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
}

function makeStyles(theme: Theme, variant: Variant, isDisabled: boolean) {
  const { colors, spacing, radii, typography } = theme;

  const base: ViewStyle = {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    opacity: isDisabled ? 0.5 : 1,
  };

  const textBase: TextStyle = {
    ...typography.button,
  };

  const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { ...base },
      text: { ...textBase, color: colors.onPrimary },
    },
    secondary: {
      container: { ...base, backgroundColor: colors.secondaryContainer },
      text: { ...textBase, color: colors.secondary },
    },
    outline: {
      container: {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.border,
      },
      text: { ...textBase, color: colors.textPrimary },
    },
    destructive: {
      container: { ...base, backgroundColor: colors.error },
      text: { ...textBase, color: colors.onError },
    },
    ghost: {
      container: { ...base, backgroundColor: 'transparent' },
      text: { ...textBase, color: colors.primary },
    },
  };

  return StyleSheet.create(variantStyles[variant]);
}
