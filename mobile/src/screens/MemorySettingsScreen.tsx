import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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

interface MemorySettings {
  memory_enabled: boolean;
  auto_learn_from_calls: boolean;
}

const DEFAULTS: MemorySettings = {
  memory_enabled: true,
  auto_learn_from_calls: true,
};

export function MemorySettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const [settings, setSettings] = useState<MemorySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
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
            memory_enabled: d.memory_enabled ?? DEFAULTS.memory_enabled,
            auto_learn_from_calls: d.auto_learn_from_calls ?? DEFAULTS.auto_learn_from_calls,
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

  function handleToggle(key: keyof MemorySettings) {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    apiClient.patch('/settings', { [key]: next }).catch((err) => {
      setSettings((prev) => ({ ...prev, [key]: !next }));
      setError(extractApiError(err));
    });
  }

  function handleClearMemory() {
    Alert.alert(
      'Clear All Memory',
      'This will permanently delete all AI memory data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await apiClient.delete('/memory');
              Alert.alert('Done', 'All memory has been cleared.');
            } catch (err) {
              Alert.alert('Error', extractApiError(err));
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
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
          icon="brain"
          label="Enable AI Memory"
          subtitle="Allow the assistant to remember context between calls"
          value={settings.memory_enabled}
          onValueChange={() => handleToggle('memory_enabled')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="lightbulb-on-outline"
          label="Auto-Learn from Calls"
          subtitle="Automatically extract and store key information"
          value={settings.auto_learn_from_calls}
          onValueChange={() => handleToggle('auto_learn_from_calls')}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <TouchableOpacity
          onPress={handleClearMemory}
          disabled={clearing}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            opacity: clearing ? 0.6 : 1,
          }}
        >
          {clearing ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Icon name="delete-sweep-outline" size="md" color={colors.error} />
          )}
          <Text style={{ ...typography.button, color: colors.error }}>Clear All Memory</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
