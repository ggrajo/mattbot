import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useCalendarStore } from '../store/calendarStore';
import type { Theme } from '../theme/tokens';

export function CalendarBookingSettingsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { status, loading, fetchStatus, connect, disconnect } = useCalendarStore();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isConnected = status?.is_connected ?? false;

  const handleConnect = async () => {
    setConnecting(true);
    // In a production app the auth_code would come from a Google OAuth
    // WebView / redirect flow. For now we pass a placeholder that the
    // dev-mode backend accepts.
    const success = await connect('dev-auth-code');
    setConnecting(false);
    if (success) {
      Alert.alert('Connected', 'Your Google Calendar has been connected.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Calendar',
      'Your AI assistant will no longer be able to check availability or book appointments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={s.heading}>Calendar Settings</Text>
          <Text style={s.subtitle}>
            Manage your Google Calendar connection for AI-powered booking.
          </Text>
        </FadeIn>

        <FadeIn delay={80}>
          <Card>
            <Text style={s.sectionTitle}>Connection</Text>
            <View style={s.statusRow}>
              <View style={[s.statusDot, isConnected ? s.dotConnected : s.dotDisconnected]} />
              <Text style={s.statusLabel}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            {isConnected && status?.calendar_id && (
              <Text style={s.calendarId}>Calendar: {status.calendar_id}</Text>
            )}

            {isConnected ? (
              <Button
                title="Disconnect Calendar"
                onPress={handleDisconnect}
                variant="destructive"
                loading={loading}
                style={s.btn}
              />
            ) : (
              <Button
                title="Connect Google Calendar"
                onPress={handleConnect}
                loading={connecting || loading}
                style={s.btn}
              />
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={160}>
          <Card>
            <Text style={s.sectionTitle}>How It Works</Text>
            <View style={s.stepRow}>
              <Text style={s.stepNumber}>1</Text>
              <Text style={s.stepText}>Connect your Google Calendar above.</Text>
            </View>
            <View style={s.stepRow}>
              <Text style={s.stepNumber}>2</Text>
              <Text style={s.stepText}>
                Your AI assistant will see your availability in real time.
              </Text>
            </View>
            <View style={s.stepRow}>
              <Text style={s.stepNumber}>3</Text>
              <Text style={s.stepText}>
                Callers can book appointments directly during phone calls.
              </Text>
            </View>
          </Card>
        </FadeIn>

        {isConnected && (
          <FadeIn delay={240}>
            <Button
              title="View Calendar"
              onPress={() => navigation.navigate('Calendar')}
              variant="outline"
              style={s.btn}
            />
          </FadeIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    dotConnected: { backgroundColor: colors.success },
    dotDisconnected: { backgroundColor: colors.textDisabled },
    statusLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    calendarId: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    btn: { marginTop: spacing.lg },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    stepNumber: {
      ...typography.body,
      fontWeight: '700',
      color: colors.primary,
      width: 22,
      textAlign: 'center',
    },
    stepText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  });
}
