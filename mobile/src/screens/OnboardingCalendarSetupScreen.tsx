import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

export function OnboardingCalendarSetupScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await apiClient.get('/calendar/status');
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [checkStatus]),
  );

  async function handleConnect() {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/calendar/auth-url');
      const url = data.url || data.auth_url;
      if (url) {
        await Linking.openURL(url);
      }
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to get auth URL');
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setLoading(true);
    try {
      await apiClient.post('/onboarding/complete-step', { step: 'calendar_setup' });
      navigation.navigate('PlanSelection' as never, { source: 'onboarding' } as never);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to complete step');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    try {
      await apiClient.post('/onboarding/complete-step', { step: 'calendar_setup' });
    } catch {
      // non-blocking
    }
    navigation.navigate('PlanSelection' as never, { source: 'onboarding' } as never);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + 140,
        }}
      >
        {/* Illustration Area */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="calendar-sync-outline" size="xl" color={colors.primary} />
          </View>
        </View>

        {/* Title & Description */}
        <Text
          style={{ ...typography.h1, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Calendar Integration
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.xxl,
          }}
          allowFontScaling
        >
          Connect your calendar for smart scheduling
        </Text>

        {checking ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : connected ? (
          /* Connected State */
          <View
            style={{
              backgroundColor: colors.successContainer,
              borderRadius: radii.xl,
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.success + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check-circle" size="xl" color={colors.success} />
            </View>
            <Text
              style={{ ...typography.h3, color: colors.success }}
              allowFontScaling
            >
              Calendar Connected
            </Text>
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}
              allowFontScaling
            >
              Your Google Calendar is linked. MattBot can now check your availability when scheduling.
            </Text>
          </View>
        ) : (
          /* Not Connected State */
          <View style={{ gap: spacing.lg }}>
            <View
              style={{
                backgroundColor: colors.surfaceElevated,
                borderRadius: radii.xl,
                padding: spacing.xl,
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <Icon name="google" size="xl" color={colors.textSecondary} />
              <Text
                style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
                allowFontScaling
              >
                Link your Google Calendar so MattBot can check your availability and help schedule meetings.
              </Text>
              <TouchableOpacity
                onPress={handleConnect}
                disabled={loading}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: radii.lg,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.xl,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <Icon name="link-variant" size="md" color={colors.onPrimary} />
                    <Text style={{ ...typography.button, color: colors.onPrimary }} allowFontScaling>
                      Connect Google Calendar
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Benefits */}
            {[
              { icon: 'calendar-check', text: 'Know when you\'re free' },
              { icon: 'clock-fast', text: 'Avoid double-bookings' },
              { icon: 'account-group-outline', text: 'Smart meeting scheduling' },
            ].map((item) => (
              <View
                key={item.text}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.md,
                }}
              >
                <Icon name={item.icon} size="md" color={colors.primary} />
                <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background,
          gap: spacing.sm,
        }}
      >
        {connected && (
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.lg,
              paddingVertical: spacing.md + 2,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.6 : 1,
              minHeight: 52,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={{ ...typography.button, color: colors.onPrimary }} allowFontScaling>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        )}
        {!connected && !checking && (
          <TouchableOpacity
            onPress={handleSkip}
            disabled={loading}
            style={{
              paddingVertical: spacing.md,
              alignItems: 'center',
            }}
          >
            <Text
              style={{ ...typography.body, color: colors.textSecondary, textDecorationLine: 'underline' }}
              allowFontScaling
            >
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
