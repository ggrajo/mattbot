import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

type WeekSchedule = Record<string, DaySchedule>;

const DEFAULT_DAY: DaySchedule = { enabled: true, start: '09:00', end: '17:00' };
const DEFAULT_WEEKEND: DaySchedule = { enabled: false, start: '09:00', end: '17:00' };

function buildDefaults(): WeekSchedule {
  const schedule: WeekSchedule = {};
  for (const day of DAYS) {
    schedule[day] = day === 'Saturday' || day === 'Sunday' ? { ...DEFAULT_WEEKEND } : { ...DEFAULT_DAY };
  }
  return schedule;
}

export function BusinessHoursScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>(buildDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/call-modes')
        .then((res) => {
          if (!active) return;
          const d = res.data;
          setEnabled(!!d.business_hours_enabled);
          if (d.business_hours_schedule) {
            setSchedule((prev) => ({ ...prev, ...d.business_hours_schedule }));
          }
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

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await apiClient.patch('/call-modes', patch);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handleToggleEnabled(val: boolean) {
    setEnabled(val);
    save({ business_hours_enabled: val });
  }

  function handleToggleDay(day: string) {
    const updated = { ...schedule, [day]: { ...schedule[day], enabled: !schedule[day].enabled } };
    setSchedule(updated);
    save({ business_hours_schedule: updated });
  }

  function handleTimeChange(day: string, field: 'start' | 'end', value: string) {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  function handleTimeBlur(day: string) {
    save({ business_hours_schedule: schedule });
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
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <Icon name="clock-outline" size="md" color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }}>Enable Business Hours</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>Apply different call modes during work hours</Text>
          </View>
          <Switch value={enabled} onValueChange={handleToggleEnabled} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>
      </View>

      {enabled && (
        <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: spacing.sm }}>
          {DAYS.map((day) => {
            const ds = schedule[day] ?? DEFAULT_DAY;
            return (
              <View
                key={day}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  padding: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ds.enabled ? spacing.sm : 0 }}>
                  <Switch
                    value={ds.enabled}
                    onValueChange={() => handleToggleDay(day)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                  <Text style={{ ...typography.body, color: ds.enabled ? colors.textPrimary : colors.textDisabled, marginLeft: spacing.sm, flex: 1 }}>
                    {day}
                  </Text>
                </View>
                {ds.enabled && (
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginLeft: 52 }}>
                    <TextInput
                      value={ds.start}
                      onChangeText={(v) => handleTimeChange(day, 'start', v)}
                      onBlur={() => handleTimeBlur(day)}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numbers-and-punctuation"
                      style={{
                        ...typography.bodySmall,
                        color: colors.textPrimary,
                        backgroundColor: colors.background,
                        borderRadius: radii.sm,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        textAlign: 'center',
                        width: 80,
                      }}
                    />
                    <Text style={{ ...typography.body, color: colors.textSecondary, alignSelf: 'center' }}>to</Text>
                    <TextInput
                      value={ds.end}
                      onChangeText={(v) => handleTimeChange(day, 'end', v)}
                      onBlur={() => handleTimeBlur(day)}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numbers-and-punctuation"
                      style={{
                        ...typography.bodySmall,
                        color: colors.textPrimary,
                        backgroundColor: colors.background,
                        borderRadius: radii.sm,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        textAlign: 'center',
                        width: 80,
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {saving && (
        <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}
