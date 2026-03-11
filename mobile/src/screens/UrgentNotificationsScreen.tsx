import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

function ToggleRow({ icon, label, subtitle, value, onValueChange, colors, spacing, typography }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <Icon name={icon} size="md" color={colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.body, color: colors.textPrimary }}>{label}</Text>
        {subtitle && <Text style={{ ...typography.caption, color: colors.textSecondary }}>{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

const SENSITIVITY_LEVELS = ['Low', 'Medium', 'High'] as const;
type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

interface UrgentSettings {
  urgent_notifications_enabled: boolean;
  urgent_flash_screen: boolean;
  urgent_override_dnd: boolean;
  urgent_sensitivity: SensitivityLevel;
}

const DEFAULTS: UrgentSettings = {
  urgent_notifications_enabled: true,
  urgent_flash_screen: false,
  urgent_override_dnd: false,
  urgent_sensitivity: 'Medium',
};

export function UrgentNotificationsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const [settings, setSettings] = useState<UrgentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
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
            urgent_notifications_enabled: d.urgent_notifications_enabled ?? DEFAULTS.urgent_notifications_enabled,
            urgent_flash_screen: d.urgent_flash_screen ?? DEFAULTS.urgent_flash_screen,
            urgent_override_dnd: d.urgent_override_dnd ?? DEFAULTS.urgent_override_dnd,
            urgent_sensitivity: d.urgent_sensitivity ?? DEFAULTS.urgent_sensitivity,
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

  function handleToggle(key: keyof Pick<UrgentSettings, 'urgent_notifications_enabled' | 'urgent_flash_screen' | 'urgent_override_dnd'>) {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    apiClient.patch('/settings', { [key]: next }).catch((err) => {
      setSettings((prev) => ({ ...prev, [key]: !next }));
      setError(extractApiError(err));
    });
  }

  function handleSensitivity(level: SensitivityLevel) {
    setSettings((prev) => ({ ...prev, urgent_sensitivity: level }));
    apiClient.patch('/settings', { urgent_sensitivity: level }).catch((err) => {
      setError(extractApiError(err));
    });
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
        <ToggleRow
          icon="bell-alert-outline"
          label="Enable Urgent Notifications"
          subtitle="Get alerted for time-sensitive calls"
          value={settings.urgent_notifications_enabled}
          onValueChange={() => handleToggle('urgent_notifications_enabled')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="flash-outline"
          label="Flash Screen on Urgent"
          subtitle="Visual alert for urgent incoming calls"
          value={settings.urgent_flash_screen}
          onValueChange={() => handleToggle('urgent_flash_screen')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="do-not-disturb-off"
          label="Override Do Not Disturb"
          subtitle="Urgent calls break through DND mode"
          value={settings.urgent_override_dnd}
          onValueChange={() => handleToggle('urgent_override_dnd')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
      </View>

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Sensitivity</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {SENSITIVITY_LEVELS.map((level) => {
            const selected = settings.urgent_sensitivity === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => handleSensitivity(level)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: selected ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...typography.button, color: selected ? colors.onPrimary : colors.textPrimary }}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
