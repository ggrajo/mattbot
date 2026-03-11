import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient, extractApiError } from '../api/client';

type TriggerRule = 'vip_only' | 'urgent_only' | 'vip_and_urgent' | 'always' | 'never';

interface HandoffSettings {
  handoff_enabled: boolean;
  handoff_trigger: TriggerRule;
  handoff_offer_timeout_seconds: number;
  revision: number;
}

const DEFAULTS: HandoffSettings = {
  handoff_enabled: true,
  handoff_trigger: 'vip_only',
  handoff_offer_timeout_seconds: 20,
  revision: 1,
};

const TRIGGER_OPTIONS: {
  value: TriggerRule;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: 'vip_only',
    icon: 'star',
    label: 'VIP only',
    description: 'Offer handoff only for VIP callers',
  },
  {
    value: 'urgent_only',
    icon: 'clock-alert-outline',
    label: 'Urgent only',
    description: 'Offer handoff only when the call is flagged urgent',
  },
  {
    value: 'vip_and_urgent',
    icon: 'star-plus-outline',
    label: 'VIP and Urgent',
    description: 'Offer handoff for VIP callers or urgent calls',
  },
  {
    value: 'always',
    icon: 'phone-forward',
    label: 'Always',
    description: 'Offer handoff for all calls',
  },
  {
    value: 'never',
    icon: 'phone-off',
    label: 'Never',
    description: 'Never offer handoff (even if enabled)',
  },
];

const TIMEOUT_OPTIONS = [10, 15, 20, 30, 45, 60];

export function HandoffSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [settings, setSettings] = useState<HandoffSettings>(DEFAULTS);
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
            handoff_enabled: d.handoff_enabled ?? DEFAULTS.handoff_enabled,
            handoff_trigger: d.handoff_trigger ?? DEFAULTS.handoff_trigger,
            handoff_offer_timeout_seconds: d.handoff_offer_timeout_seconds ?? DEFAULTS.handoff_offer_timeout_seconds,
            revision: d.revision ?? 1,
          });
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function patch(changes: Partial<Omit<HandoffSettings, 'revision'>>) {
    const prev = { ...settings };
    setSettings((s) => ({ ...s, ...changes }));
    try {
      const res = await apiClient.patch('/settings', {
        expected_revision: settings.revision,
        changes,
      });
      if (res.data?.revision) {
        setSettings((s) => ({ ...s, revision: res.data.revision }));
      }
    } catch (err) {
      setSettings(prev);
      setError(extractApiError(err));
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.bodySmall, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {/* Live Handoff card */}
      <FadeIn delay={0} slide="up">
        <View
          style={{
            marginTop: spacing.lg,
            marginHorizontal: spacing.lg,
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.primary + '50',
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <Icon name="phone-forward" size="lg" color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>Live Handoff</Text>
            </View>
          </View>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              marginTop: spacing.md,
            }}
          >
            When enabled, your assistant can offer to transfer important calls to you in real time.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.lg,
              backgroundColor: colors.surfaceVariant,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            }}
          >
            <Text style={{ ...typography.body, color: colors.textPrimary }}>Enable live handoff</Text>
            <Switch
              value={settings.handoff_enabled}
              onValueChange={() => patch({ handoff_enabled: !settings.handoff_enabled })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>
      </FadeIn>

      {/* Trigger Rule card */}
      <FadeIn delay={80} slide="up">
        <View
          style={{
            marginTop: spacing.lg,
            marginHorizontal: spacing.lg,
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <Icon name="filter-variant" size="lg" color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>Trigger Rule</Text>
            </View>
          </View>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
            }}
          >
            When should a handoff be offered?
          </Text>

          {TRIGGER_OPTIONS.map((opt) => {
            const selected = settings.handoff_trigger === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                onPress={() => patch({ handoff_trigger: opt.value })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.lg,
                  borderRadius: radii.md,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '0C' : colors.surfaceVariant,
                  marginBottom: spacing.sm,
                }}
              >
                <Icon name={opt.icon} size="lg" color={selected ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                    {opt.label}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                    {opt.description}
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
      </FadeIn>

      {/* Handoff Timeout */}
      <FadeIn delay={160} slide="up">
        <View
          style={{
            marginTop: spacing.lg,
            marginHorizontal: spacing.lg,
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <Icon name="timer-outline" size="lg" color={colors.primary} />
            </View>
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }}>Handoff Timeout</Text>
          </View>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              marginBottom: spacing.md,
              lineHeight: 22,
            }}
          >
            How long you have to accept a handoff before the assistant continues (10-60 seconds)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TIMEOUT_OPTIONS.map((t) => {
              const selected = settings.handoff_offer_timeout_seconds === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => patch({ handoff_offer_timeout_seconds: t })}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radii.md,
                    backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? '#FFFFFF' : colors.textPrimary }}>
                    {t}s
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </FadeIn>

      {/* Privacy Mode card */}
      <FadeIn delay={240} slide="up">
        <View
          style={{
            marginTop: spacing.lg,
            marginHorizontal: spacing.lg,
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <Icon name="shield-lock-outline" size="lg" color={colors.primary} />
            </View>
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }}>Privacy Mode</Text>
          </View>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              marginTop: spacing.md,
              lineHeight: 22,
            }}
          >
            When notification privacy is set to{' '}
            <Text style={{ fontWeight: '600', color: colors.textPrimary }}>'Private'</Text>, the handoff banner
            will only show{' '}
            <Text style={{ fontWeight: '600', color: colors.textPrimary }}>'Call takeover available'</Text>{' '}
            without caller details. Switch to{' '}
            <Text style={{ fontWeight: '600', color: colors.textPrimary }}>'Preview'</Text> mode in Privacy
            settings to see caller name and reason.
          </Text>
        </View>
      </FadeIn>
    </ScrollView>
  );
}
