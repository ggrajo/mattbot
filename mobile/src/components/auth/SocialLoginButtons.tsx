import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  onGooglePress: () => void;
  onApplePress: () => void;
  loading?: boolean;
}

export function SocialLoginButtons({ onGooglePress, onApplePress, loading }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  const buttonStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 48,
    opacity: loading ? 0.5 : 1,
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <TouchableOpacity
        onPress={onGooglePress}
        disabled={loading}
        activeOpacity={0.7}
        style={buttonStyle}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <>
            <Icon name="google" size="md" color="#DB4437" />
            <Text style={{ ...typography.button, color: colors.textPrimary }} allowFontScaling>
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          onPress={onApplePress}
          disabled={loading}
          activeOpacity={0.7}
          style={buttonStyle}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <Icon name="apple" size="md" color={colors.textPrimary} />
              <Text style={{ ...typography.button, color: colors.textPrimary }} allowFontScaling>
                Continue with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
