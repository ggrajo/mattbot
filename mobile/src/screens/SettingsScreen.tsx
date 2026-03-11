import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function SettingsScreen() {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ ...typography.h2, color: colors.textPrimary }}>Settings</Text>
      <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>This screen is under development.</Text>
    </View>
  );
}
