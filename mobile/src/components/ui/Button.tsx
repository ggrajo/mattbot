import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Pressable,
} from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { Theme } from '../../theme/tokens';

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

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <Animated.View style={[styles.container, { transform: [{ scale }] }, style]}>
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon && <Icon name={icon} size="md" color={styles.text.color as string} />}
            <Text style={styles.text} allowFontScaling>
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function makeStyles(theme: Theme, variant: Variant, isDisabled: boolean) {
  const { colors, spacing, radii, typography } = theme;

  const base: ViewStyle = {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    opacity: isDisabled ? 0.5 : 1,
  };

  const textBase: TextStyle = {
    ...typography.button,
  };

  const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { ...base, backgroundColor: colors.primary },
      text: { ...textBase, color: colors.onPrimary },
    },
    secondary: {
      container: { ...base, backgroundColor: colors.secondaryContainer },
      text: { ...textBase, color: colors.secondary },
    },
    outline: {
      container: { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
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
