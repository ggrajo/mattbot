import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function UrgentNotificationsScreen() {
  const theme = useTheme();
  const { colors, typography, spacing } = theme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.centered}>
        <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
          Urgent Notifications
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
