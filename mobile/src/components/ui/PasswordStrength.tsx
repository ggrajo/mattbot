import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  password: string;
}

type Strength = 'weak' | 'fair' | 'good' | 'strong';

function evaluateStrength(password: string): { level: Strength; score: number } {
  if (!password) return { level: 'weak', score: 0 };

  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak', score: 1 };
  if (score <= 2) return { level: 'fair', score: 2 };
  if (score <= 3) return { level: 'good', score: 3 };
  return { level: 'strong', score: 4 };
}

export function PasswordStrength({ password }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const { level, score } = useMemo(() => evaluateStrength(password), [password]);

  if (!password) return null;

  const colorMap: Record<Strength, string> = {
    weak: colors.error,
    fair: colors.warning,
    good: colors.accent,
    strong: colors.success,
  };

  const labelMap: Record<Strength, string> = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  };

  const barColor = colorMap[level];

  return (
    <View style={{ gap: spacing.xs, marginTop: -spacing.sm, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= score ? barColor : colors.border,
            }}
          />
        ))}
      </View>
      <Text
        style={{ ...typography.caption, color: barColor }}
        allowFontScaling
        accessibilityLabel={`Password strength: ${labelMap[level]}`}
      >
        {labelMap[level]}
      </Text>
    </View>
  );
}
