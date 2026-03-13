import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BotLoader } from '../components/ui/BotLoader';
import { Toast } from '../components/ui/Toast';
import { PhoneInput } from '../components/ui/PhoneInput';
import { FadeIn } from '../components/ui/FadeIn';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticMedium } from '../utils/haptics';
import { updateProfile } from '../api/auth';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingSettings'>;

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export function OnboardingSettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, error, loadSettings, updateSettings, completeStep } = useSettingsStore();
  const [nickname, setNickname] = useState('');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [personalPhone, setPersonalPhone] = useState('');
  const [urgentSms, setUrgentSms] = useState(false);
  const [urgentEmail, setUrgentEmail] = useState(false);
  const [urgentCall, setUrgentCall] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!settings) {
      loadSettings();
    }
  }, []);

  useEffect(() => {
    if (settings) {
      setMemoryEnabled(settings.memory_enabled);
      setQuietHoursEnabled(settings.quiet_hours_enabled);
      setRetentionDays(settings.data_retention_days);
    }
  }, [settings]);

  const [stepError, setStepError] = useState<string | null>(null);

  async function handleFinish() {
    setSaving(true);
    setStepError(null);
    if (nickname.trim()) {
      try {
        await updateProfile({ nickname: nickname.trim() });
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().loadProfile();
      } catch {
        // best-effort, non-blocking
      }
    }
    const payload: Record<string, unknown> = {
      memory_enabled: memoryEnabled,
      quiet_hours_enabled: quietHoursEnabled,
      data_retention_days: retentionDays,
      urgent_notify_sms: urgentSms,
      urgent_notify_email: urgentEmail,
      urgent_notify_call: urgentCall,
    };
    if (personalPhone) {
      payload.personal_phone = personalPhone;
    }
    const ok = await updateSettings(payload);
    if (ok) {
      const step1 = await completeStep('settings_configured');
      if (step1) {
        hapticMedium();
        navigation.navigate('OnboardingAssistantSetup');
        return;
      }
    }
    setStepError(useSettingsStore.getState().error ?? 'Failed to save. Please try again.');
    setSaving(false);
  }

  if (!settings && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BotLoader color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type="success" visible={!!toast} onDismiss={() => setToast('')} />

      <OnboardingProgress currentStep={2} totalSteps={7} label="Basic Settings" />

      {/* Hero */}
      <FadeIn delay={0} slide="up">
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="cog-outline" size={36} color={colors.primary} />
          </View>
          <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
            Basic Settings
          </Text>
          <Text
            style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
            allowFontScaling
          >
            Configure how MattBot works for you. You can change these later.
          </Text>
        </View>
      </FadeIn>

      {(error || stepError) && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage
            message={stepError ?? error!}
            action={error ? 'Retry' : undefined}
            onAction={error ? loadSettings : undefined}
          />
        </View>
      )}

      {/* Nickname */}
      <FadeIn delay={60}>
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="account-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              What should we call you?
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            This is optional. Your AI assistant will use this name when greeting callers.
          </Text>
          <TextInput
            label="Nickname"
            placeholder="e.g. Matt"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
          />
        </View>
      </Card>
      </FadeIn>

      {/* Personal phone */}
      <FadeIn delay={90}>
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="phone-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Your Phone Number
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Your personal number for live call handoff and urgent alerts. You can update this in Settings later.
          </Text>
          <PhoneInput
            value={personalPhone}
            onChangeE164={setPersonalPhone}
            placeholder="Your phone number"
          />
        </View>
      </Card>
      </FadeIn>

      {/* Memory toggle */}
      <FadeIn delay={150}>
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="brain" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Memory
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Allow MattBot to remember context from previous calls to provide smarter responses.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Enable memory
            </Text>
            <Switch
              value={memoryEnabled}
              onValueChange={setMemoryEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable memory"
              accessibilityRole="switch"
              accessibilityState={{ checked: memoryEnabled }}
            />
          </View>
        </View>
      </Card>
      </FadeIn>

      {/* Data retention */}
      <FadeIn delay={180}>
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="clock-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Data Retention
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            How long call data is kept before automatic deletion.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {RETENTION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setRetentionDays(opt.value)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: retentionDays === opt.value ? colors.primary : colors.border,
                  backgroundColor: retentionDays === opt.value ? colors.primary + '14' : 'transparent',
                  alignItems: 'center',
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: retentionDays === opt.value }}
                accessibilityLabel={`${opt.label} data retention`}
              >
                <Text
                  style={{
                    ...typography.bodySmall,
                    color: retentionDays === opt.value ? colors.primary : colors.textSecondary,
                    fontWeight: retentionDays === opt.value ? '600' : '400',
                  }}
                  allowFontScaling
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
      </FadeIn>

      {/* Quiet hours toggle */}
      <FadeIn delay={240}>
      <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="moon-waning-crescent" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Quiet Hours
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Mute non-urgent notifications during specified hours. You can configure the exact times in Settings later.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Enable quiet hours
            </Text>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable quiet hours"
              accessibilityRole="switch"
              accessibilityState={{ checked: quietHoursEnabled }}
            />
          </View>
        </View>
      </Card>
      </FadeIn>

      {/* Urgent call alerts (optional) */}
      <FadeIn delay={300}>
      <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="alert-octagon-outline" size="md" color={colors.error} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Urgent Call Alerts
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Get notified when a call is urgent. All disabled by default. You can add phone/email in Settings later.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              SMS alert
            </Text>
            <Switch
              value={urgentSms}
              onValueChange={setUrgentSms}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable urgent SMS alerts"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Email alert
            </Text>
            <Switch
              value={urgentEmail}
              onValueChange={setUrgentEmail}
              trackColor={{ false: colors.border, true: '#F59E0B' }}
              accessibilityLabel="Enable urgent email alerts"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Phone call alert
            </Text>
            <Switch
              value={urgentCall}
              onValueChange={setUrgentCall}
              trackColor={{ false: colors.border, true: colors.error }}
              accessibilityLabel="Enable urgent phone call alerts"
            />
          </View>
          {urgentCall && (
            <View style={{
              padding: spacing.sm,
              borderRadius: radii.sm,
              backgroundColor: colors.error + '08',
              borderLeftWidth: 3, borderLeftColor: colors.error,
            }}>
              <Text style={{ ...typography.caption, color: colors.error }}>
                Alert calls use your call minutes.
              </Text>
            </View>
          )}
          {(urgentSms || urgentEmail || urgentCall) && (
            <Text style={{ ...typography.caption, color: colors.textDisabled }} allowFontScaling>
              You can configure the phone number and email in Settings after onboarding.
            </Text>
          )}
        </View>
      </Card>
      </FadeIn>

      <FadeIn delay={360}>
        <Button
          title="Continue"
          icon="arrow-right"
          onPress={handleFinish}
          loading={saving}
          disabled={saving}
        />
      </FadeIn>
    </ScreenWrapper>
  );
}
