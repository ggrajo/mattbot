import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';

export function SubscriptionGateScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.icon]}>🔒</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Subscription Required</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          You need an active subscription to access this feature. Choose a plan to get started.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('PlanSelection')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>View Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  button: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 16 },
  backText: { fontSize: 16 },
});
