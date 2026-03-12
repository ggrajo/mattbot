import React, { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MemorySettings'>;

export function MemorySettingsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();

  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setMemoryEnabled(settings.memory_enabled);
    }
  }, [settings]);

  async function handleSave() {
    const ok = await updateSettings({ memory_enabled: memoryEnabled });
    if (ok) {
      setDirty(false);
      setToast({ message: 'Memory settings saved', type: 'success' });
    } else {
      setToast({ message: 'Failed to save settings', type: 'error' });
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      await apiClient.delete('/memory/all');
      setShowClearConfirm(false);
      setToast({ message: 'All memories cleared', type: 'success' });
    } catch (e) {
      setToast({ message: extractApiError(e), type: 'error' });
    } finally {
      setClearing(false);
    }
  }

  return (
    <ScreenWrapper>
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />

      <ConfirmSheet
        visible={showClearConfirm}
        onDismiss={() => setShowClearConfirm(false)}
        title="Clear All Memories"
        message="This will permanently delete all stored memories. Your AI assistant will lose all learned context about your callers. This cannot be undone."
        icon="brain"
        destructive
        confirmLabel="Clear All"
        onConfirm={handleClearAll}
        loading={clearing}
      />

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}
        allowFontScaling
      >
        AI Memory
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      {/* Info card */}
      <Card variant="flat" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="brain" size="lg" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.xs }} allowFontScaling>
              How AI Memory Works
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 }} allowFontScaling>
              Your AI assistant remembers key details from previous calls — names, preferences,
              and conversation context — to provide more personalized responses. Memories are
              stored securely and only used to improve your experience.
            </Text>
          </View>
        </View>
      </Card>

      {/* Memory toggle */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <Icon name="database-outline" size="md" color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Enable Memory
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Allow the assistant to remember caller details
              </Text>
            </View>
          </View>
          <Switch
            value={memoryEnabled}
            onValueChange={(v) => { setMemoryEnabled(v); setDirty(true); }}
            trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
            thumbColor={memoryEnabled ? colors.primary : colors.textDisabled}
          />
        </View>
      </Card>

      {/* Clear all memories */}
      <Card style={{ marginBottom: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon name="delete-sweep-outline" size="md" color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Clear All Memories
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Permanently erase all stored memories
              </Text>
            </View>
          </View>
          <Button
            title="Clear All Memories"
            onPress={() => setShowClearConfirm(true)}
            variant="destructive"
            icon="delete-outline"
          />
        </View>
      </Card>

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={loading}
        disabled={!dirty}
        icon="content-save-outline"
      />
    </ScreenWrapper>
  );
}
