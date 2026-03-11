import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: Props) {
  const theme = useTheme();
  if (!visible) return null;

  const { colors, spacing, typography } = theme;

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={message || 'Loading'}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text
          style={{
            ...typography.body,
            color: colors.textInverse,
            marginTop: spacing.lg,
          }}
          allowFontScaling
        >
          {message}
        </Text>
      )}
    </View>
  );
}
