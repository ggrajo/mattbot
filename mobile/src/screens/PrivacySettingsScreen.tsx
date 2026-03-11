import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const PRIVACY_MODES = [
  { value: 'preview', label: 'Preview', desc: 'Show caller details in notifications' },
  { value: 'private', label: 'Private', desc: 'Hide caller details in notifications' },
];

const TRANSCRIPT_MODES = [
  { value: 'ai_says_it', label: 'AI Discloses', desc: 'Assistant tells caller about recording' },
  { value: 'silent', label: 'Silent', desc: 'No disclosure announcement' },
  { value: 'beep', label: 'Beep', desc: 'Play a beep to indicate recording' },
];

const BIOMETRIC_POLICIES = [
  { value: 'gate_call_details', label: 'Protect Call Details', desc: 'Require biometric to view calls' },
  { value: 'gate_all', label: 'Protect Everything', desc: 'Require biometric for all access' },
  { value: 'off', label: 'Off', desc: 'No biometric protection' },
];

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

interface PrivacySettings {
  notification_privacy_mode: string;
  recording_enabled: boolean;
  recording_announcement_required: boolean;
  biometric_unlock_enabled: boolean;
  biometric_policy: string;
  transcript_disclosure_mode: string;
  data_retention_days: number;
  revision: number;
}

const DEFAULTS: PrivacySettings = {
  notification_privacy_mode: 'preview',
  recording_enabled: false,
  recording_announcement_required: true,
  biometric_unlock_enabled: false,
  biometric_policy: 'gate_call_details',
  transcript_disclosure_mode: 'ai_says_it',
  data_retention_days: 30,
  revision: 1,
};

function ToggleRow({ icon, label, subtitle, value, onValueChange, colors, spacing }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}>
      <Icon name={icon} size="md" color={colors.textSecondary} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontSize: 16, color: colors.textPrimary }}>{label}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

export function PrivacySettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
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
            notification_privacy_mode: d.notification_privacy_mode ?? DEFAULTS.notification_privacy_mode,
            recording_enabled: d.recording_enabled ?? DEFAULTS.recording_enabled,
            recording_announcement_required: d.recording_announcement_required ?? DEFAULTS.recording_announcement_required,
            biometric_unlock_enabled: d.biometric_unlock_enabled ?? DEFAULTS.biometric_unlock_enabled,
            biometric_policy: d.biometric_policy ?? DEFAULTS.biometric_policy,
            transcript_disclosure_mode: d.transcript_disclosure_mode ?? DEFAULTS.transcript_disclosure_mode,
            data_retention_days: d.data_retention_days ?? DEFAULTS.data_retention_days,
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

  async function save(changes: Partial<Omit<PrivacySettings, 'revision'>>) {
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
    }
  }

  function handleToggle(key: 'recording_enabled' | 'recording_announcement_required' | 'biometric_unlock_enabled') {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    save({ [key]: next }).catch(() => {
      setSettings((prev) => ({ ...prev, [key]: !next }));
    });
  }

  function handlePickerChange(key: string, value: string | number) {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    save({ [key]: value });
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

      {/* Recording & Transcripts */}
      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, overflow: 'hidden' }}>
        <ToggleRow
          icon="record-circle-outline"
          label="Record Calls"
          subtitle="Automatically record incoming calls"
          value={settings.recording_enabled}
          onValueChange={() => handleToggle('recording_enabled')}
          colors={colors}
          spacing={spacing}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="bullhorn-outline"
          label="Recording Announcement"
          subtitle="Announce to callers that the call is being recorded"
          value={settings.recording_announcement_required}
          onValueChange={() => handleToggle('recording_announcement_required')}
          colors={colors}
          spacing={spacing}
        />
      </View>

      {/* Notification Privacy */}
      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs }}>Notification Privacy</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>Control what caller info appears in notifications</Text>
        {PRIVACY_MODES.map((opt) => {
          const selected = settings.notification_privacy_mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handlePickerChange('notification_privacy_mode', opt.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                borderRadius: radii.md,
                backgroundColor: selected ? colors.primary + '12' : 'transparent',
                marginBottom: 4,
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? colors.primary : colors.textPrimary }}>{opt.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{opt.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Transcript Disclosure */}
      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs }}>Transcript Disclosure</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>How callers are informed about transcription</Text>
        {TRANSCRIPT_MODES.map((opt) => {
          const selected = settings.transcript_disclosure_mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handlePickerChange('transcript_disclosure_mode', opt.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                borderRadius: radii.md,
                backgroundColor: selected ? colors.primary + '12' : 'transparent',
                marginBottom: 4,
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? colors.primary : colors.textPrimary }}>{opt.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{opt.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Biometric Security */}
      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1 }}>
        <ToggleRow
          icon="fingerprint"
          label="Biometric Unlock"
          subtitle="Require fingerprint or face to access the app"
          value={settings.biometric_unlock_enabled}
          onValueChange={() => handleToggle('biometric_unlock_enabled')}
          colors={colors}
          spacing={spacing}
        />
      </View>

      {settings.biometric_unlock_enabled && (
        <View style={{ marginTop: spacing.md, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>Biometric Policy</Text>
          {BIOMETRIC_POLICIES.map((opt) => {
            const selected = settings.biometric_policy === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handlePickerChange('biometric_policy', opt.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: selected ? colors.primary + '12' : 'transparent',
                  marginBottom: 4,
                }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                  {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? colors.primary : colors.textPrimary }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{opt.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Data Retention */}
      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs }}>Data Retention</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>How long call data is kept before automatic deletion</Text>
        <View style={{ flexDirection: 'row' }}>
          {RETENTION_OPTIONS.map((opt, idx) => {
            const selected = settings.data_retention_days === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => handlePickerChange('data_retention_days', opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: selected ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  alignItems: 'center',
                  marginRight: idx < RETENTION_OPTIONS.length - 1 ? 8 : 0,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? '#FFFFFF' : colors.textPrimary }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
