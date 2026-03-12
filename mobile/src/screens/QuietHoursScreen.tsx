import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Divider } from '../components/ui/Divider';
import { TimePicker, formatTime12h } from '../components/ui/TimePicker';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticLight } from '../utils/haptics';
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

interface QuickPattern {
  label: string;
  icon: string;
  start: string;
  end: string;
  days: number[];
}

const QUICK_PATTERNS: QuickPattern[] = [
  {
    label: 'Weekday Nights',
    icon: 'briefcase-clock-outline',
    start: '22:00',
    end: '07:00',
    days: [1, 2, 3, 4, 5],
  },
  {
    label: 'Weekend',
    icon: 'calendar-weekend',
    start: '00:00',
    end: '23:59',
    days: [0, 6],
  },
  {
    label: 'Every Night',
    icon: 'weather-night',
    start: '22:00',
    end: '07:00',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
];

export function QuietHoursScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, saving, error, loadSettings, updateSettings } = useSettingsStore();

  interface Interval {
    label: string;
    start: string;
    end: string;
    days: number[];
  }

  const [enabled, setEnabled] = useState(false);
  const [intervals, setIntervals] = useState<Interval[]>([{ label: 'Default', start: '22:00', end: '07:00', days: [0, 1, 2, 3, 4, 5, 6] }]);
  const [allowVip, setAllowVip] = useState(true);
  const [editingInterval, setEditingInterval] = useState<number | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  const startTime = editingInterval != null ? intervals[editingInterval]?.start ?? '22:00' : '22:00';
  const endTime = editingInterval != null ? intervals[editingInterval]?.end ?? '07:00' : '07:00';
  const days = editingInterval != null ? intervals[editingInterval]?.days ?? [] : [];

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.quiet_hours_enabled);
      setAllowVip(settings.quiet_hours_allow_vip);
      if (settings.quiet_hours_intervals && settings.quiet_hours_intervals.length > 0) {
        setIntervals(settings.quiet_hours_intervals);
      } else {
        setIntervals([{
          label: 'Default',
          start: settings.quiet_hours_start ?? '22:00',
          end: settings.quiet_hours_end ?? '07:00',
          days: settings.quiet_hours_days ?? [0, 1, 2, 3, 4, 5, 6],
        }]);
      }
    }
  }, [settings]);

  function toggleDay(day: number) {
    if (editingInterval == null) return;
    hapticLight();
    setDirty(true);
    setIntervals((prev) => prev.map((iv, i) =>
      i === editingInterval
        ? { ...iv, days: iv.days.includes(day) ? iv.days.filter((d) => d !== day) : [...iv.days, day] }
        : iv
    ));
  }

  function applyPattern(pattern: QuickPattern) {
    hapticLight();
    setIntervals([{ label: pattern.label, start: pattern.start, end: pattern.end, days: pattern.days }]);
    setEditingInterval(0);
    setEnabled(true);
    setDirty(true);
  }

  function isPatternActive(pattern: QuickPattern): boolean {
    if (!enabled || intervals.length !== 1) return false;
    const iv = intervals[0];
    if (iv.start !== pattern.start || iv.end !== pattern.end) return false;
    if (pattern.days.length !== iv.days.length) return false;
    return pattern.days.every((d) => iv.days.includes(d));
  }

  function addInterval() {
    if (intervals.length >= 5) return;
    hapticLight();
    const newIv: Interval = { label: `Interval ${intervals.length + 1}`, start: '22:00', end: '07:00', days: [0, 1, 2, 3, 4, 5, 6] };
    setIntervals((prev) => [...prev, newIv]);
    setEditingInterval(intervals.length);
    setDirty(true);
  }

  function removeInterval(idx: number) {
    hapticLight();
    setIntervals((prev) => prev.filter((_, i) => i !== idx));
    if (editingInterval === idx) setEditingInterval(intervals.length > 1 ? 0 : null);
    setDirty(true);
  }

  function updateIntervalTime(field: 'start' | 'end', value: string) {
    if (editingInterval == null) return;
    setIntervals((prev) => prev.map((iv, i) => i === editingInterval ? { ...iv, [field]: value } : iv));
    setDirty(true);
  }

  async function handleSave() {
    const first = intervals[0];
    const ok = await updateSettings({
      quiet_hours_enabled: enabled,
      quiet_hours_start: first?.start ?? '22:00',
      quiet_hours_end: first?.end ?? '07:00',
      quiet_hours_days: first?.days ?? [],
      quiet_hours_intervals: intervals,
      quiet_hours_allow_vip: allowVip,
    });
    if (ok) {
      setDirty(false);
      setToast({ message: 'Quiet hours saved', type: 'success' });
      setTimeout(() => navigation.goBack(), 500);
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
        onChange={(t) => { updateIntervalTime('start', t); }}
        onDismiss={() => setShowStartPicker(false)}
        label="Start Time"
      />
      <TimePicker
        visible={showEndPicker}
        value={endTime}
        onChange={(t) => { updateIntervalTime('end', t); }}
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
            onValueChange={(v) => { hapticLight(); setEnabled(v); setDirty(true); }}
            trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
            thumbColor={enabled ? colors.primary : colors.textDisabled}
          />
        </View>
      </Card>

      {enabled && (
        <>
          {/* Quick Patterns */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text
              style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.md }}
              allowFontScaling
            >
              Quick Patterns
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {QUICK_PATTERNS.map((pattern) => {
                const active = isPatternActive(pattern);
                return (
                  <TouchableOpacity
                    key={pattern.label}
                    onPress={() => applyPattern(pattern)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + '14' : 'transparent',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Apply ${pattern.label} pattern`}
                  >
                    <Icon
                      name={pattern.icon}
                      size="md"
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={{
                        ...typography.caption,
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? '600' : '400',
                        textAlign: 'center',
                      }}
                      allowFontScaling
                    >
                      {pattern.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <Divider style={{ marginBottom: spacing.lg }} />

          {/* Intervals */}
          {intervals.map((iv, idx) => {
            const isEditing = editingInterval === idx;
            return (
              <Card key={idx} style={{ marginBottom: spacing.md, borderWidth: isEditing ? 1.5 : 0, borderColor: isEditing ? colors.primary : 'transparent' }}>
                <TouchableOpacity
                  onPress={() => setEditingInterval(isEditing ? null : idx)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditing ? spacing.md : 0 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                      {iv.label || `Interval ${idx + 1}`}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      {formatTime12h(iv.start)} - {formatTime12h(iv.end)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {intervals.length > 1 && (
                      <TouchableOpacity onPress={() => removeInterval(idx)} hitSlop={8}>
                        <Icon name="close-circle-outline" size="md" color={colors.error} />
                      </TouchableOpacity>
                    )}
                    <Icon name={isEditing ? 'chevron-up' : 'chevron-down'} size="md" color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                {isEditing && (
                  <>
                    {/* Time pickers */}
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                      <TouchableOpacity
                        onPress={() => setShowStartPicker(true)}
                        activeOpacity={0.7}
                        style={{ flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' }}
                      >
                        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }} allowFontScaling>Start</Text>
                        <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>{formatTime12h(iv.start)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowEndPicker(true)}
                        activeOpacity={0.7}
                        style={{ flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' }}
                      >
                        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }} allowFontScaling>End</Text>
                        <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>{formatTime12h(iv.end)}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Day chips */}
                    <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm }} allowFontScaling>Active Days</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {DAYS.map((d) => {
                        const active = iv.days.includes(d.value);
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
                            <Text style={{ ...typography.bodySmall, color: active ? colors.onPrimary : colors.textPrimary, fontWeight: '600' }} allowFontScaling>{d.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </Card>
            );
          })}

          {intervals.length < 5 && (
            <TouchableOpacity
              onPress={addInterval}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, paddingVertical: spacing.sm }}
            >
              <Icon name="plus-circle-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.primary, fontWeight: '500' }} allowFontScaling>Add Interval</Text>
            </TouchableOpacity>
          )}

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
                onValueChange={(v) => { hapticLight(); setAllowVip(v); setDirty(true); }}
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
        loading={saving}
        disabled={!dirty}
        icon="content-save-outline"
      />
    </ScreenWrapper>
  );
}
