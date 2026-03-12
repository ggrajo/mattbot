import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  codes: string[];
  onCopyAll: () => void;
}

export function RecoveryCodeList({ codes, onCopyAll }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.lg,
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          {codes.map((code, i) => (
            <View
              key={i}
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderRadius: radii.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                alignItems: 'center',
              }}
            >
              <Text
                style={{ ...typography.mono, color: colors.textPrimary }}
                allowFontScaling
                accessibilityLabel={`Recovery code ${i + 1}: ${code}`}
              >
                {code}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={onCopyAll}
        style={{
          alignSelf: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
        }}
        accessibilityLabel="Copy all recovery codes"
        accessibilityRole="button"
      >
        <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }} allowFontScaling>
          Copy all codes
        </Text>
      </TouchableOpacity>
    </View>
  );
}
