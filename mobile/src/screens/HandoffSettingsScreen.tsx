import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HandoffSettings'>;

type HandoffTrigger = 'vip_only' | 'urgent_only' | 'vip_and_urgent';

const TRIGGER_OPTIONS: { value: HandoffTrigger; label: string; desc: string; icon: string }[] = [
  { value: 'vip_only', label: 'VIP only', desc: 'Offer handoff only for VIP callers', icon: 'star-outline' },
  { value: 'urgent_only', label: 'Urgent only', desc: 'Offer handoff only when the call is flagged urgent', icon: 'alert-circle-outline' },
  { value: 'vip_and_urgent', label: 'VIP and Urgent', desc: 'Offer handoff for VIP callers or urgent calls', icon: 'shield-star-outline' },
];

export function HandoffSettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, saving, error, loadSettings, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = useState(false);
  const [trigger, setTrigger] = useState<HandoffTrigger>('vip_only');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.handoff_enabled);
      if (settings.handoff_trigger) setTrigger(settings.handoff_trigger as HandoffTrigger);
    }
  }, [settings]);

  async function handleSave() {
    const ok = await updateSettings({
      handoff_enabled: enabled,
      handoff_trigger: trigger,
    });
    if (ok) {
      setToastType('success');
      setToast('Handoff settings saved');
      setTimeout(() => navigation.goBack(), 500);
    } else {
      setToastType('error');
      setToast(useSettingsStore.getState().error ?? 'Failed to save handoff settings.');
    }
  }

  if (!settings && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {error && <ErrorMessage message={error} action="Retry" onAction={loadSettings} />}

      {/* Master toggle */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="phone-forward-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Live Handoff
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            When enabled, your assistant can offer to transfer important calls to you in real time.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Enable live handoff
            </Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable live handoff"
            />
          </View>
        </View>
      </Card>

      {enabled && (
        <>
          {/* Trigger rule */}
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="filter-outline" size="md" color={colors.accent} />
                <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                  Trigger Rule
                </Text>
              </View>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
                When should a handoff be offered?
              </Text>

              {TRIGGER_OPTIONS.map((opt) => {
                const selected = trigger === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTrigger(opt.value)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '14' : 'transparent',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={opt.label}
                  >
                    <Icon
                      name={opt.icon}
                      size="md"
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          ...typography.body,
                          color: colors.textPrimary,
                          fontWeight: selected ? '600' : '400',
                        }}
                        allowFontScaling
                      >
                        {opt.label}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                        {opt.desc}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.primary : colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && (
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Timeout info */}
          <Card
            variant="flat"
            style={{
              marginBottom: spacing.lg,
              backgroundColor: colors.primaryContainer,
              borderColor: colors.primary,
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="timer-outline" size="md" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.primary, fontWeight: '500' }}
                  allowFontScaling
                >
                  Handoff Timeout
                </Text>
                <Text style={{ ...typography.caption, color: colors.primary }} allowFontScaling>
                  You have 20 seconds to accept a handoff before the assistant continues the call.
                </Text>
              </View>
            </View>
          </Card>

          {/* Privacy mode interaction */}
          <Card variant="flat" style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <Icon name="shield-lock-outline" size="md" color={colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }}
                  allowFontScaling
                >
                  Privacy Mode
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }} allowFontScaling>
                  When notification privacy is set to "Private", the handoff banner will only show "Call takeover available" without caller details. Switch to "Preview" mode in Privacy settings to see caller name and reason.
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}

      <Button
        title="Save"
        icon="content-save-outline"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
      />
    </ScreenWrapper>
  );
}
