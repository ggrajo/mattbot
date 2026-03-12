import React, { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CalendarBookingSettings'>;

export function CalendarBookingSettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, saving, error, loadSettings, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [windowDays, setWindowDays] = useState('14');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

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

  async function handleSave() {
    const ok = await updateSettings({
      calendar_booking_enabled: enabled,
      calendar_default_duration_minutes: clamp(durationMinutes, 15, 120),
      calendar_booking_window_days: clamp(windowDays, 1, 60),
    });
    if (ok) {
      setDirty(false);
      setToast({ message: 'Calendar booking settings saved', type: 'success' });
    } else {
      setToast({ message: 'Failed to save settings', type: 'error' });
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

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={saving}
        disabled={!dirty}
        icon="content-save-outline"
      />
    </ScreenWrapper>
  );
}
