import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '../ui/Button';
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
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: colors.surfaceVariant,
              borderRadius: radii.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text
              style={{
                ...typography.caption,
                color: colors.textDisabled,
                width: 20,
                textAlign: 'right',
                fontWeight: '600',
              }}
              allowFontScaling
            >
              {i + 1}
            </Text>
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

      <Button
        title="Copy All Codes"
        icon="content-copy"
        onPress={onCopyAll}
        variant="outline"
      />
    </View>
  );
}
