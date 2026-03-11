import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

interface PrivacySettings {
  show_caller_id: boolean;
  record_calls: boolean;
  store_transcripts: boolean;
  share_analytics: boolean;
}

const DEFAULTS: PrivacySettings = {
  show_caller_id: true,
  record_calls: false,
  store_transcripts: true,
  share_analytics: false,
};

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

export function PrivacySettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULTS);
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
            show_caller_id: d.show_caller_id ?? DEFAULTS.show_caller_id,
            record_calls: d.record_calls ?? DEFAULTS.record_calls,
            store_transcripts: d.store_transcripts ?? DEFAULTS.store_transcripts,
            share_analytics: d.share_analytics ?? DEFAULTS.share_analytics,
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

  function handleToggle(key: keyof PrivacySettings) {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    apiClient.patch('/settings', { [key]: next }).catch((err) => {
      setSettings((prev) => ({ ...prev, [key]: !next }));
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
          icon="phone-outgoing"
          label="Show Caller ID"
          subtitle="Display your number on outbound calls"
          value={settings.show_caller_id}
          onValueChange={() => handleToggle('show_caller_id')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="record-circle-outline"
          label="Record Calls"
          subtitle="Automatically record incoming calls"
          value={settings.record_calls}
          onValueChange={() => handleToggle('record_calls')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="text-box-outline"
          label="Store Transcripts"
          subtitle="Save call transcriptions for review"
          value={settings.store_transcripts}
          onValueChange={() => handleToggle('store_transcripts')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="chart-bar"
          label="Share Analytics"
          subtitle="Help improve the service with usage data"
          value={settings.share_analytics}
          onValueChange={() => handleToggle('share_analytics')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
      </View>
    </ScrollView>
  );
}
