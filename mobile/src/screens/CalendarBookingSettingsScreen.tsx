import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, Linking, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useCalendarStore } from '../store/calendarStore';
import { getCalendarAuthUrl } from '../api/calendar';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CalendarBookingSettings' | 'OnboardingCalendarSetup'>;

export function CalendarBookingSettingsScreen({ navigation, route }: Props) {
  const isOnboarding = route.name === 'OnboardingCalendarSetup';
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, saving, error, loadSettings, updateSettings, completeStep } = useSettingsStore();
  const { status, loadStatus, disconnect } = useCalendarStore();

  const [enabled, setEnabled] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [windowDays, setWindowDays] = useState('14');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadStatus();
    }, []),
  );

  useEffect(() => {
    if (settings) {
      setEnabled(settings.calendar_booking_enabled);
      setDurationMinutes(String(settings.calendar_default_duration_minutes ?? 30));
      setWindowDays(String(settings.calendar_booking_window_days ?? 14));
    }
  }, [settings]);

  function clamp(val: string, min: number, max: number): number {
    const n = parseInt(val, 10);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { auth_url } = await getCalendarAuthUrl();
      await Linking.openURL(auth_url);
    } catch {
      setToast({ message: 'Could not open Google sign-in', type: 'error' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    hapticLight();
    setDisconnecting(true);
    try {
      await disconnect();
      await loadStatus();
      setSuccessModal({ title: 'Saved', message: 'Google Calendar disconnected' });
    } catch {
      setToast({ message: 'Failed to disconnect calendar', type: 'error' });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSave() {
    const ok = await updateSettings({
      calendar_booking_enabled: enabled,
      calendar_default_duration_minutes: clamp(durationMinutes, 15, 120),
      calendar_booking_window_days: clamp(windowDays, 1, 60),
    });
    if (ok) {
      setDirty(false);
      setSuccessModal({ title: 'Saved', message: 'Calendar booking settings saved' });
    } else {
      setToast({ message: 'Failed to save settings', type: 'error' });
    }
  }

  const isConnected = status?.connected === true;
  const needsReauth = status?.needs_reauth === true;

  async function handleOnboardingContinue() {
    const ok = await updateSettings({
      calendar_booking_enabled: enabled,
      calendar_default_duration_minutes: clamp(durationMinutes, 15, 120),
      calendar_booking_window_days: clamp(windowDays, 1, 60),
    });
    if (ok) {
      const stepOk = await completeStep('calendar_setup');
      if (stepOk) {
        hapticMedium();
        navigation.navigate('PlanSelection', { source: 'onboarding' });
        return;
      }
    }
    setToast({ message: 'Failed to save progress', type: 'error' });
  }

  async function handleOnboardingSkip() {
    const ok = await completeStep('calendar_setup');
    if (ok) {
      hapticMedium();
      navigation.navigate('PlanSelection', { source: 'onboarding' });
    } else {
      setToast({ message: 'Failed to save progress', type: 'error' });
    }
  }

  return (
    <ScreenWrapper>
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
      <SuccessModal visible={!!successModal} title={successModal?.title ?? ''} message={successModal?.message} onDismiss={() => setSuccessModal(null)} />

      {isOnboarding && (
        <OnboardingProgress currentStep={4} totalSteps={7} label="Calendar" />
      )}

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}
        allowFontScaling
      >
        Calendar Booking
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: (isConnected && !needsReauth) ? colors.success + '1A' : colors.warning + '1A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name="google"
                size="lg"
                color={(isConnected && !needsReauth) ? colors.success : colors.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                Google Calendar
              </Text>
              {isConnected && !needsReauth ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Icon name="check-circle" size="sm" color={colors.success} />
                  <Text
                    style={{ ...typography.bodySmall, color: colors.success, fontWeight: '500' }}
                    numberOfLines={1}
                    allowFontScaling
                  >
                    {status.email ?? 'Connected'}
                  </Text>
                </View>
              ) : needsReauth ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Icon name="alert-circle" size="sm" color={colors.warning} />
                  <Text
                    style={{ ...typography.bodySmall, color: colors.warning, fontWeight: '500' }}
                    numberOfLines={1}
                    allowFontScaling
                  >
                    Session expired - reconnect required
                  </Text>
                </View>
              ) : (
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  Not connected
                </Text>
              )}
            </View>
          </View>

          {needsReauth ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.sm,
                borderRadius: radii.sm,
                backgroundColor: colors.warning + '14',
              }}>
                <Icon name="alert-outline" size="sm" color={colors.warning} />
                <Text style={{ ...typography.caption, color: colors.warning, flex: 1 }} allowFontScaling>
                  Your Google Calendar access expired. Please reconnect to sync events.
                </Text>
              </View>
              <Button
                title="Reconnect Google Calendar"
                icon="google"
                onPress={handleConnect}
                loading={connecting}
              />
            </View>
          ) : isConnected ? (
            <Button
              title="Disconnect"
              variant="outline"
              icon="link-off"
              onPress={handleDisconnect}
              loading={disconnecting}
            />
          ) : (
            <Button
              title="Connect Google Calendar"
              icon="google"
              onPress={handleConnect}
              loading={connecting}
            />
          )}
        </View>
      </Card>

      <Card variant="flat" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="calendar-clock" size="lg" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.xs }} allowFontScaling>
              How Calendar Booking Works
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 }} allowFontScaling>
              When enabled, your AI assistant can offer callers the option to book a
              meeting on your calendar. You control the default meeting duration and
              how far into the future callers can book.
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <Icon name="calendar-check-outline" size="md" color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Enable Calendar Booking
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Allow callers to book meetings via the assistant
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => { hapticLight(); setEnabled(v); setDirty(true); }}
            trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
            thumbColor={enabled ? colors.primary : colors.textDisabled}
          />
        </View>
      </Card>

      {enabled && !isConnected && (
        <Card variant="flat" style={{ marginBottom: spacing.lg, borderColor: colors.primary + '44' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="information-outline" size="md" color={colors.primary} />
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary, flex: 1 }}
              allowFontScaling
            >
              Booking works without Google Calendar. Connect it optionally to sync events to your calendar.
            </Text>
          </View>
        </Card>
      )}

      {enabled && (
        <>
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Icon name="clock-outline" size="md" color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                    Default Duration
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    Default meeting length in minutes (15–120)
                  </Text>
                </View>
              </View>
              <TextInput
                label="Duration (minutes)"
                value={durationMinutes}
                onChangeText={(v) => { setDurationMinutes(v); setDirty(true); }}
                keyboardType="number-pad"
                leftIcon="timer-outline"
                placeholder="30"
              />
            </View>
          </Card>

          <Card style={{ marginBottom: spacing.xl }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Icon name="calendar-range" size="md" color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                    Booking Window
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    How far ahead callers can book (1–60 days)
                  </Text>
                </View>
              </View>
              <TextInput
                label="Window (days)"
                value={windowDays}
                onChangeText={(v) => { setWindowDays(v); setDirty(true); }}
                keyboardType="number-pad"
                leftIcon="calendar-outline"
                placeholder="14"
              />
            </View>
          </Card>
        </>
      )}

      {isOnboarding ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            title="Continue"
            icon="arrow-right"
            onPress={handleOnboardingContinue}
            loading={saving}
            disabled={saving}
          />
          <Button
            title="Skip for Now"
            variant="ghost"
            onPress={handleOnboardingSkip}
            disabled={saving}
          />
        </View>
      ) : (
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!dirty}
          icon="content-save-outline"
        />
      )}
    </ScreenWrapper>
  );
}
