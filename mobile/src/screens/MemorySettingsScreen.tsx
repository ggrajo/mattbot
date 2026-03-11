import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { FadeIn } from '../components/ui/FadeIn';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

const RETENTION_OPTIONS = [7, 30, 90] as const;

interface SettingsResponse {
  memory_enabled?: boolean;
  memory_auto_learn?: boolean;
  data_retention_days?: number;
}

interface MemoryStatsResponse {
  total_items?: number;
}

export function MemorySettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [autoLearn, setAutoLearn] = useState(true);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await apiClient.get<SettingsResponse>('/settings');
      setMemoryEnabled(data.memory_enabled ?? true);
      setAutoLearn(data.memory_auto_learn ?? true);
      setRetentionDays(data.data_retention_days ?? 30);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get<MemoryStatsResponse>('/memory/stats');
      setTotalItems(data.total_items ?? 0);
    } catch {
      setTotalItems(null);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (memoryEnabled) {
      fetchStats();
    } else {
      setTotalItems(null);
    }
  }, [memoryEnabled, fetchStats]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/settings', {
        memory_enabled: memoryEnabled,
        memory_auto_learn: autoLearn,
        data_retention_days: retentionDays,
      });
      Alert.alert('Saved', 'Memory settings updated.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Memory',
      'This will permanently delete all AI memory. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await apiClient.delete('/memory');
              setTotalItems(0);
              Alert.alert('Done', 'All memory has been cleared.');
            } catch (err) {
              Alert.alert('Error', extractApiError(err));
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.heading}>AI Memory</Text>
          <Text style={styles.subtitle}>
            The AI remembers callers and context for better conversations. Control what gets stored.
          </Text>
        </FadeIn>

        <FadeIn delay={40}>
          <Card>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Enable AI memory</Text>
              <Switch
                value={memoryEnabled}
                onValueChange={setMemoryEnabled}
                trackColor={{
                  false: theme.colors.surfaceVariant,
                  true: theme.colors.primaryContainer,
                }}
                thumbColor={memoryEnabled ? theme.colors.primary : theme.colors.textDisabled}
              />
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={80}>
          <Card style={{ opacity: memoryEnabled ? 1 : 0.5 }}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelWrap}>
                <Text style={styles.toggleLabel}>Auto-learn from calls</Text>
                <Text style={styles.toggleHint}>AI learns from conversations automatically</Text>
              </View>
              <Switch
                value={autoLearn}
                onValueChange={setAutoLearn}
                disabled={!memoryEnabled}
                trackColor={{
                  false: theme.colors.surfaceVariant,
                  true: theme.colors.primaryContainer,
                }}
                thumbColor={autoLearn ? theme.colors.primary : theme.colors.textDisabled}
              />
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <Card style={{ opacity: memoryEnabled ? 1 : 0.5 }}>
            <Text style={styles.sectionLabel}>Data retention</Text>
            <View style={styles.retentionRow}>
              {RETENTION_OPTIONS.map((days) => {
                const selected = retentionDays === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => memoryEnabled && setRetentionDays(days)}
                    style={[
                      styles.retentionChip,
                      selected && styles.retentionChipActive,
                      {
                        backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.retentionChipText,
                        { color: selected ? theme.colors.primary : theme.colors.textSecondary },
                      ]}
                    >
                      {days} days
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </FadeIn>

        {memoryEnabled && totalItems !== null && (
          <FadeIn delay={160}>
            <Card>
              <Text style={styles.sectionLabel}>Memory stats</Text>
              <Text style={styles.statsText}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} stored
              </Text>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={200}>
          <Button
            title="Clear All Memory"
            onPress={handleClearAll}
            loading={clearing}
            variant="destructive"
            style={styles.clearButton}
          />
        </FadeIn>

        <FadeIn delay={240}>
          <Button
            title="Save"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    loader: { marginTop: spacing.xxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    toggleLabelWrap: { flex: 1 },
    toggleHint: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    sectionLabel: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    retentionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    retentionChip: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.full,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    retentionChipActive: {},
    retentionChipText: { ...typography.bodySmall, fontWeight: '600' },
    statsText: { ...typography.body, color: colors.textSecondary },
    clearButton: { marginTop: spacing.xl },
    saveButton: { marginTop: spacing.md },
  });
}
