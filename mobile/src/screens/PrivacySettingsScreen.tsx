import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';

interface SettingsResponse {
  show_caller_id?: boolean;
  record_calls?: boolean;
  store_transcripts?: boolean;
  share_analytics?: boolean;
  data_retention_days?: number;
  [key: string]: unknown;
}

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const;

export function PrivacySettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCallerId, setShowCallerId] = useState(true);
  const [recordCalls, setRecordCalls] = useState(false);
  const [storeTranscripts, setStoreTranscripts] = useState(true);
  const [shareAnalytics, setShareAnalytics] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState(30);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await apiClient.get<SettingsResponse>('/settings');
      setShowCallerId(data.show_caller_id ?? true);
      setRecordCalls(data.record_calls ?? false);
      setStoreTranscripts(data.store_transcripts ?? true);
      setShareAnalytics(data.share_analytics ?? false);
      setDataRetentionDays(data.data_retention_days ?? 30);
    } catch (error) {
      Alert.alert('Error', extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  async function updateToggle(
    key: keyof SettingsResponse,
    value: boolean | number
  ) {
    setSaving(true);
    try {
      await apiClient.patch('/settings', { [key]: value });
      if (key === 'show_caller_id') setShowCallerId(value as boolean);
      if (key === 'record_calls') setRecordCalls(value as boolean);
      if (key === 'store_transcripts') setStoreTranscripts(value as boolean);
      if (key === 'share_analytics') setShareAnalytics(value as boolean);
      if (key === 'data_retention_days') setDataRetentionDays(value as number);
    } catch (error) {
      Alert.alert('Error', extractApiError(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
            Privacy
          </Text>
        </FadeIn>

        <FadeIn delay={60}>
          <Card>
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                Show Caller ID
              </Text>
              <Switch
                value={showCallerId}
                onValueChange={(v) => updateToggle('show_caller_id', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                disabled={saving}
              />
            </View>
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                Record Calls
              </Text>
              <Switch
                value={recordCalls}
                onValueChange={(v) => updateToggle('record_calls', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                disabled={saving}
              />
            </View>
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                Store Transcripts
              </Text>
              <Switch
                value={storeTranscripts}
                onValueChange={(v) => updateToggle('store_transcripts', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                disabled={saving}
              />
            </View>
            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                Share Analytics
              </Text>
              <Switch
                value={shareAnalytics}
                onValueChange={(v) => updateToggle('share_analytics', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                disabled={saving}
              />
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={100}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            DATA RETENTION
          </Text>
          <Card>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              How long to keep call data before automatic deletion.
            </Text>
            <View style={styles.pickerRow}>
              {RETENTION_OPTIONS.map((opt) => {
                const active = dataRetentionDays === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => updateToggle('data_retention_days', opt.value)}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        {
                          color: active ? colors.onPrimary : colors.textSecondary,
                          fontWeight: active ? '600' : '400',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
