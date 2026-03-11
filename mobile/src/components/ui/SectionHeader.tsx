import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function SectionHeader({ title, subtitle, style }: Props) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }, style]}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 12, color: colors.textDisabled, marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
