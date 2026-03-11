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

interface QuietHoursSettings {
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_days: number[];
  quiet_hours_allow_vip: boolean;
  revision: number;
}

const DEFAULTS: QuietHoursSettings = {
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  quiet_hours_days: [0, 1, 2, 3, 4, 5, 6],
  quiet_hours_allow_vip: false,
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

export function QuietHoursScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [settings, setSettings] = useState<QuietHoursSettings>(DEFAULTS);
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
            quiet_hours_enabled: d.quiet_hours_enabled ?? DEFAULTS.quiet_hours_enabled,
            quiet_hours_start: d.quiet_hours_start ?? DEFAULTS.quiet_hours_start,
            quiet_hours_end: d.quiet_hours_end ?? DEFAULTS.quiet_hours_end,
            quiet_hours_days: d.quiet_hours_days ?? DEFAULTS.quiet_hours_days,
            quiet_hours_allow_vip: d.quiet_hours_allow_vip ?? DEFAULTS.quiet_hours_allow_vip,
            revision: d.revision ?? 1,
          });
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

  async function save(changes: Partial<Omit<QuietHoursSettings, 'revision'>>) {
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
    setSettings((prev) => ({ ...prev, quiet_hours_enabled: val }));
    save({ quiet_hours_enabled: val });
  }

  function handleToggleVip(val: boolean) {
    setSettings((prev) => ({ ...prev, quiet_hours_allow_vip: val }));
    save({ quiet_hours_allow_vip: val });
  }

  function handleStartTimeChange(_: any, selected?: Date) {
    setShowStartPicker(false);
    if (selected) {
      const hhmm = formatHHMM(selected);
      setSettings((prev) => ({ ...prev, quiet_hours_start: hhmm }));
      save({ quiet_hours_start: hhmm });
    }
  }

  function handleEndTimeChange(_: any, selected?: Date) {
    setShowEndPicker(false);
    if (selected) {
      const hhmm = formatHHMM(selected);
      setSettings((prev) => ({ ...prev, quiet_hours_end: hhmm }));
      save({ quiet_hours_end: hhmm });
    }
  }

  function toggleDay(dayValue: number) {
    const days = settings.quiet_hours_days.includes(dayValue)
      ? settings.quiet_hours_days.filter((d) => d !== dayValue)
      : [...settings.quiet_hours_days, dayValue];
    setSettings((prev) => ({ ...prev, quiet_hours_days: days }));
    save({ quiet_hours_days: days });
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

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}>
          <Icon name="moon-waning-crescent" size="md" color={colors.textSecondary} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontSize: 16, color: colors.textPrimary }}>Enable Quiet Hours</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Silence notifications during set times</Text>
          </View>
          <Switch
            value={settings.quiet_hours_enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {settings.quiet_hours_enabled && (
        <>
          {/* Time Schedule */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md }}>Schedule</Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs }}>Start Time</Text>
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
                    {formatDisplay(settings.quiet_hours_start)}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs }}>End Time</Text>
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
                    {formatDisplay(settings.quiet_hours_end)}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Days Selection */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md }}>Days</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {DAYS.map((day, idx) => {
                const selected = settings.quiet_hours_days.includes(day.value);
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

          {/* Allow VIP */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}>
              <Icon name="star-outline" size="md" color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: 16, color: colors.textPrimary }}>Allow VIP Calls</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>VIP contacts can still reach you during quiet hours</Text>
              </View>
              <Switch
                value={settings.quiet_hours_allow_vip}
                onValueChange={handleToggleVip}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
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
          value={parseHHMM(settings.quiet_hours_start)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={handleStartTimeChange}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={parseHHMM(settings.quiet_hours_end)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={handleEndTimeChange}
        />
      )}
    </ScrollView>
  );
}
