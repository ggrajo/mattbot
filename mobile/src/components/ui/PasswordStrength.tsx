import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  password: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: 'Weak', color: '#EF4444' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 0.33, label: 'Weak', color: '#EF4444' };
  if (score <= 4) return { score: 0.66, label: 'Fair', color: '#F59E0B' };
  return { score: 1, label: 'Strong', color: '#10B981' };
}

export function PasswordStrength({ password }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { score, label, color } = getStrength(password);

  if (!password) return null;

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View
        style={{
          height: 4,
          backgroundColor: colors.surfaceVariant,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${score * 100}%`,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
      <Text
        style={{
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
