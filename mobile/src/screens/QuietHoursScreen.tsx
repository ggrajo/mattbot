import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { TimePicker, formatTime12h } from '../components/ui/TimePicker';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuietHours'>;

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function QuietHoursScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('07:00');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [allowVip, setAllowVip] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.quiet_hours_enabled);
      setStartTime(settings.quiet_hours_start ?? '22:00');
      setEndTime(settings.quiet_hours_end ?? '07:00');
      setDays(settings.quiet_hours_days ?? [0, 1, 2, 3, 4, 5, 6]);
      setAllowVip(settings.quiet_hours_allow_vip);
    }
  }, [settings]);

  function toggleDay(day: number) {
    setDirty(true);
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSave() {
    const ok = await updateSettings({
      quiet_hours_enabled: enabled,
      quiet_hours_start: startTime,
      quiet_hours_end: endTime,
      quiet_hours_days: days,
      quiet_hours_allow_vip: allowVip,
    });
    if (ok) {
      setDirty(false);
      setToast({ message: 'Quiet hours saved', type: 'success' });
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

      <TimePicker
        visible={showStartPicker}
        value={startTime}
        onChange={(t) => { setStartTime(t); setDirty(true); }}
        onDismiss={() => setShowStartPicker(false)}
        label="Start Time"
      />
      <TimePicker
        visible={showEndPicker}
        value={endTime}
        onChange={(t) => { setEndTime(t); setDirty(true); }}
        onDismiss={() => setShowEndPicker(false)}
        label="End Time"
      />

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}
        allowFontScaling
      >
        Quiet Hours
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      {/* Enable toggle */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <Icon name="moon-waning-crescent" size="md" color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Enable Quiet Hours
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Silence non-VIP calls during set times
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => { setEnabled(v); setDirty(true); }}
            trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
            thumbColor={enabled ? colors.primary : colors.textDisabled}
          />
        </View>
      </Card>

      {enabled && (
        <>
          {/* Time pickers */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text
              style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.md }}
              allowFontScaling
            >
              Schedule
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  alignItems: 'center',
                }}
                accessibilityLabel="Select start time"
              >
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }} allowFontScaling>
                  Start
                </Text>
                <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                  {formatTime12h(startTime)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  alignItems: 'center',
                }}
                accessibilityLabel="Select end time"
              >
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }} allowFontScaling>
                  End
                </Text>
                <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                  {formatTime12h(endTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Day chips */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text
              style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.md }}
              allowFontScaling
            >
              Active Days
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DAYS.map((d) => {
                const active = days.includes(d.value);
                return (
                  <TouchableOpacity
                    key={d.value}
                    onPress={() => toggleDay(d.value)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radii.full,
                      backgroundColor: active ? colors.primary : colors.surfaceVariant,
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={d.label}
                  >
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: active ? colors.onPrimary : colors.textPrimary,
                        fontWeight: '600',
                      }}
                      allowFontScaling
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Allow VIP */}
          <Card style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                <Icon name="star-outline" size="md" color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                    Allow VIP Calls
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    VIP contacts can still reach you
                  </Text>
                </View>
              </View>
              <Switch
                value={allowVip}
                onValueChange={(v) => { setAllowVip(v); setDirty(true); }}
                trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
                thumbColor={allowVip ? colors.primary : colors.textDisabled}
              />
            </View>
          </Card>
        </>
      )}

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={loading}
        disabled={!dirty}
        icon="content-save-outline"
      />
    </ScreenWrapper>
  );
}
