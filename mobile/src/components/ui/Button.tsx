import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Theme } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme, variant, disabled || loading);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.onPrimary}
        />
      ) : (
        <Text style={styles.text} allowFontScaling>
          {title}
        </Text>
      )}
    </TouchableOpacity>
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
      container: { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
      text: { ...textBase, color: colors.primary },
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
