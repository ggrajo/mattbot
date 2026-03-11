import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface QuietHoursSettings {
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_days: string[];
}

const DEFAULTS: QuietHoursSettings = {
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  quiet_hours_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export function QuietHoursScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const [settings, setSettings] = useState<QuietHoursSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  async function save(patch: Partial<QuietHoursSettings>) {
    setSaving(true);
    try {
      await apiClient.patch('/settings', patch);
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

  function handleTimeChange(field: 'quiet_hours_start' | 'quiet_hours_end', val: string) {
    setSettings((prev) => ({ ...prev, [field]: val }));
  }

  function handleTimeBlur(field: 'quiet_hours_start' | 'quiet_hours_end') {
    save({ [field]: settings[field] });
  }

  function toggleDay(day: string) {
    const days = settings.quiet_hours_days.includes(day)
      ? settings.quiet_hours_days.filter((d) => d !== day)
      : [...settings.quiet_hours_days, day];
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
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <Icon name="moon-waning-crescent" size="md" color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }}>Enable Quiet Hours</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>Silence notifications during set times</Text>
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
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, gap: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Schedule</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>Start Time</Text>
                <TextInput
                  value={settings.quiet_hours_start}
                  onChangeText={(v) => handleTimeChange('quiet_hours_start', v)}
                  onBlur={() => handleTimeBlur('quiet_hours_start')}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    ...typography.body,
                    color: colors.textPrimary,
                    backgroundColor: colors.background,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    textAlign: 'center',
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>End Time</Text>
                <TextInput
                  value={settings.quiet_hours_end}
                  onChangeText={(v) => handleTimeChange('quiet_hours_end', v)}
                  onBlur={() => handleTimeBlur('quiet_hours_end')}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    ...typography.body,
                    color: colors.textPrimary,
                    backgroundColor: colors.background,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    textAlign: 'center',
                  }}
                />
              </View>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Days</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DAYS.map((day) => {
                const selected = settings.quiet_hours_days.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radii.full,
                      backgroundColor: selected ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ ...typography.bodySmall, color: selected ? colors.onPrimary : colors.textPrimary }}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}

      {saving && (
        <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}
