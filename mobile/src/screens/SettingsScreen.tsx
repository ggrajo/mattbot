import React from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/ui/Card';
import { useTheme, useThemeContext } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

type ThemeMode = 'system' | 'light' | 'dark';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen(_props: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { themeMode, setThemeMode } = useThemeContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <Card>
          <Text
            style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}
            allowFontScaling
          >
            Appearance
          </Text>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surfaceVariant,
              borderRadius: radii.md,
              padding: spacing.xs,
            }}
          >
            {THEME_OPTIONS.map((option) => {
              const active = themeMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setThemeMode(option.value)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing.sm,
                    borderRadius: radii.sm,
                    backgroundColor: active ? colors.primary : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${option.label} theme`}
                >
                  <Text
                    style={{
                      ...typography.button,
                      color: active ? colors.onPrimary : colors.textSecondary,
                    }}
                    allowFontScaling
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
