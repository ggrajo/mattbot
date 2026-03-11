import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Pressable, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const DAYS: { label: string; short: string; value: number }[] = [
  { label: 'Sunday', short: 'Sun', value: 0 },
  { label: 'Monday', short: 'Mon', value: 1 },
  { label: 'Tuesday', short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday', short: 'Thu', value: 4 },
  { label: 'Friday', short: 'Fri', value: 5 },
  { label: 'Saturday', short: 'Sat', value: 6 },
];

const AFTER_HOURS_OPTIONS: { value: string; label: string; icon: string; desc: string }[] = [
  { value: 'screen_normally', label: 'Screen Normally', icon: 'phone-check-outline', desc: 'AI answers and screens calls as usual' },
  { value: 'voicemail_only', label: 'Voicemail Only', icon: 'voicemail', desc: 'Send all calls to voicemail' },
  { value: 'reject', label: 'Reject', icon: 'phone-hangup', desc: 'Reject all incoming calls' },
];

interface BusinessHoursSettings {
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_hours_days: number[];
  after_hours_behavior: string;
  revision: number;
}

const DEFAULTS: BusinessHoursSettings = {
  business_hours_enabled: false,
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_hours_days: [1, 2, 3, 4, 5],
  after_hours_behavior: 'screen_normally',
  revision: 1,
};

function parseHHMM(s: string): Date {
  const [h, m] = s.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDisplay(hhmm: string): string {
  const d = parseHHMM(hhmm);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function BusinessHoursScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [settings, setSettings] = useState<BusinessHoursSettings>(DEFAULTS);
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/settings')
        .then((res) => {
          if (!active) return;
          const d = res.data;
          setSettings({
            business_hours_enabled: d.business_hours_enabled ?? DEFAULTS.business_hours_enabled,
            business_hours_start: d.business_hours_start ?? DEFAULTS.business_hours_start,
            business_hours_end: d.business_hours_end ?? DEFAULTS.business_hours_end,
            business_hours_days: d.business_hours_days ?? DEFAULTS.business_hours_days,
            after_hours_behavior: d.after_hours_behavior ?? DEFAULTS.after_hours_behavior,
            revision: d.revision ?? 1,
          });
          setTimezone(d.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  async function save(changes: Partial<Omit<BusinessHoursSettings, 'revision'>>) {
    setSaving(true);
    try {
      const res = await apiClient.patch('/settings', {
        expected_revision: settings.revision,
        changes,
      });
      if (res.data?.revision) {
        setSettings((prev) => ({ ...prev, revision: res.data.revision }));
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handleToggleEnabled(val: boolean) {
    setSettings((prev) => ({ ...prev, business_hours_enabled: val }));
    save({ business_hours_enabled: val });
  }

  function handleStartTimeChange(_: any, selected?: Date) {
    setShowStartPicker(false);
    if (selected) {
      const hhmm = formatHHMM(selected);
      setSettings((prev) => ({ ...prev, business_hours_start: hhmm }));
      save({ business_hours_start: hhmm });
    }
  }

  function handleEndTimeChange(_: any, selected?: Date) {
    setShowEndPicker(false);
    if (selected) {
      const hhmm = formatHHMM(selected);
      setSettings((prev) => ({ ...prev, business_hours_end: hhmm }));
      save({ business_hours_end: hhmm });
    }
  }

  function toggleDay(dayValue: number) {
    const days = settings.business_hours_days.includes(dayValue)
      ? settings.business_hours_days.filter((d) => d !== dayValue)
      : [...settings.business_hours_days, dayValue];
    setSettings((prev) => ({ ...prev, business_hours_days: days }));
    save({ business_hours_days: days });
  }

  function handleAfterHours(val: string) {
    setSettings((prev) => ({ ...prev, after_hours_behavior: val }));
    save({ after_hours_behavior: val });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: 14, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {/* Info note */}
      <View
        style={{
          marginTop: spacing.lg,
          marginHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: colors.primary + '12',
          borderRadius: radii.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.primary + '25',
          gap: spacing.sm,
        }}
      >
        <Icon name="information-outline" size="md" color={colors.primary} />
        <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>
          Business hours affect calendar booking availability. After-hours call behavior is planned for a future update.
        </Text>
      </View>

      {/* Enable toggle */}
      <View style={{ marginTop: spacing.md, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}>
          <Icon name="clock-outline" size="md" color={colors.textSecondary} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontSize: 16, color: colors.textPrimary }}>Enable Business Hours</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Apply different call handling during work hours</Text>
          </View>
          <Switch value={settings.business_hours_enabled} onValueChange={handleToggleEnabled} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>
      </View>

      {settings.business_hours_enabled && (
        <>
          {/* Hours */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Working Hours</Text>
              {timezone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                  <Icon name="earth" size={12} color={colors.primary} />
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{timezone}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs }}>Start</Text>
                <Pressable
                  onPress={() => setShowStartPicker(true)}
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="clock-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginLeft: spacing.xs }}>
                    {formatDisplay(settings.business_hours_start)}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs }}>End</Text>
                <Pressable
                  onPress={() => setShowEndPicker(true)}
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="clock-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginLeft: spacing.xs }}>
                    {formatDisplay(settings.business_hours_end)}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Days */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md }}>Business Days</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {DAYS.map((day, idx) => {
                const selected = settings.business_hours_days.includes(day.value);
                return (
                  <Pressable
                    key={day.value}
                    onPress={() => toggleDay(day.value)}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: 20,
                      backgroundColor: selected ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      marginRight: idx < DAYS.length - 1 ? 8 : 0,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#FFFFFF' : colors.textPrimary }}>{day.short}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* After-Hours Behavior */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs }}>After-Hours Behavior</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
              How calls are handled outside business hours
            </Text>
            {AFTER_HOURS_OPTIONS.map((opt) => {
              const selected = settings.after_hours_behavior === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleAfterHours(opt.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: selected ? colors.primary + '12' : 'transparent',
                    borderRadius: radii.md,
                    padding: spacing.md,
                    marginBottom: 4,
                    borderWidth: selected ? 1 : 0,
                    borderColor: selected ? colors.primary + '40' : 'transparent',
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
                  </View>
                  <Icon name={opt.icon} size={20} color={selected ? colors.primary : colors.textSecondary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? colors.primary : colors.textPrimary }}>{opt.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{opt.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {saving && (
        <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {showStartPicker && (
        <DateTimePicker
          value={parseHHMM(settings.business_hours_start)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={handleStartTimeChange}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={parseHHMM(settings.business_hours_end)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={handleEndTimeChange}
        />
      )}
    </ScrollView>
  );
}
