import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
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
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
  icon,
}: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme, variant, disabled || loading);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
      activeOpacity={0.75}
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
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.text} allowFontScaling>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(theme: Theme, variant: Variant, isDisabled: boolean) {
  const { colors, spacing, radii, typography, shadows } = theme;

  const base: ViewStyle = {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    opacity: isDisabled ? 0.5 : 1,
  };

  const textBase: TextStyle = {
    ...typography.button,
  };

  const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle; contentRow: ViewStyle; iconWrap: ViewStyle }> = {
    primary: {
      container: { ...base, backgroundColor: colors.primary, ...shadows.card },
      text: { ...textBase, color: colors.onPrimary },
      contentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      iconWrap: {},
    },
    secondary: {
      container: { ...base, backgroundColor: colors.secondaryContainer },
      text: { ...textBase, color: colors.secondary },
      contentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      iconWrap: {},
    },
    outline: {
      container: { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
      text: { ...textBase, color: colors.primary },
      contentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      iconWrap: {},
    },
    destructive: {
      container: { ...base, backgroundColor: colors.error, ...shadows.card },
      text: { ...textBase, color: colors.onError },
      contentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      iconWrap: {},
    },
    ghost: {
      container: { ...base, backgroundColor: 'transparent' },
      text: { ...textBase, color: colors.primary },
      contentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
      iconWrap: {},
    },
  };

  return StyleSheet.create(variantStyles[variant]);
}
