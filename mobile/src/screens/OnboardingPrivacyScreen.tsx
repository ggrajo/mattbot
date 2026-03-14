import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Platform, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { FadeIn } from '../components/ui/FadeIn';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useBiometric } from '../hooks/useBiometric';
import { apiClient, extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingPrivacy'>;

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const PRIVACY_MODE_OPTIONS: { value: string; label: string; desc: string; icon: string }[] = [
  { value: 'private', label: 'Private', desc: 'Hide notification content', icon: 'eye-off-outline' },
  { value: 'preview', label: 'Preview', desc: 'Show caller info in notifications', icon: 'eye-outline' },
];

export function OnboardingPrivacyScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { settings, loading, error, loadSettings, updateSettings, completeStep } = useSettingsStore();
  const { available: biometricAvailable, biometryType, loading: biometricLoading, authenticate } = useBiometric();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);
  const [notificationPrivacy, setNotificationPrivacy] = useState('private');
  const [pushTesting, setPushTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!settings) loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setBiometricEnabled(settings.biometric_unlock_enabled ?? false);
      setMemoryEnabled(settings.memory_enabled ?? true);
      setRetentionDays(settings.data_retention_days ?? 30);
      setNotificationPrivacy(settings.notification_privacy_mode ?? 'private');
    }
  }, [settings]);

  async function handleRequestNotifications() {
    hapticLight();
    try {
      let granted = false;

      if (Platform.OS === 'ios') {
        const { default: messaging } = await import('@react-native-firebase/messaging');
        const authStatus = await messaging().requestPermission();
        granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const { PermissionsAndroid } = require('react-native');
          const result = await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS',
            {
              title: 'Notification Permission',
              message:
                'MattBot needs notifications to alert you about incoming calls, messages, and reminders.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            },
          );
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          granted = true;
        }
      }

      if (granted) {
        setToastType('success');
        setToast('Notifications enabled');
      } else {
        setToastType('error');
        setToast('Notification permission denied. Enable in device settings.');
      }
    } catch {
      setToastType('error');
      setToast('Failed to request notification permission');
    }
  }

  async function handleTestNotification() {
    hapticLight();
    setPushTesting(true);
    try {
      await apiClient.post('/push/test');
      setToastType('success');
      setToast('Test notification sent!');
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    } finally {
      setPushTesting(false);
    }
  }

  async function handleBiometricToggle(value: boolean) {
    if (value && biometricAvailable) {
      const ok = await authenticate('Verify to enable biometric lock');
      if (!ok) return;
    }
    hapticLight();
    setBiometricEnabled(value);
  }

  async function handleContinue() {
    setSaving(true);
    const ok = await updateSettings({
      biometric_unlock_enabled: biometricEnabled,
      memory_enabled: memoryEnabled,
      data_retention_days: retentionDays,
      notification_privacy_mode: notificationPrivacy,
    });

    if (!ok) {
      setSaving(false);
      setToastType('error');
      setToast('Failed to save settings');
      return;
    }

    const stepOk = await completeStep('privacy_review');
    if (stepOk) {
      hapticMedium();
      navigation.navigate('OnboardingAssistantSetup');
    } else {
      setToastType('error');
      setToast('Failed to save progress');
    }
    setSaving(false);
  }

  const biometricLabel =
    biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'Biometric Unlock';
  const biometricIcon =
    biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint';

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      <OnboardingProgress currentStep={2} totalSteps={6} label="Privacy & Data" />

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
            <Icon name="shield-check-outline" size={36} color={colors.primary} />
          </View>
          <Text
            style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
            allowFontScaling
          >
            Privacy & Data
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
            allowFontScaling
          >
            Configure how MattBot handles your data and notifications. You can change these anytime in Settings.
          </Text>
        </View>
      </FadeIn>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      {/* Push Notifications */}
      <FadeIn delay={60}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  backgroundColor: colors.secondary + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="bell-ring-outline" size="lg" color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  allowFontScaling
                >
                  Push Notifications
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}
                  allowFontScaling
                >
                  Get notified about incoming calls, messages, and alerts
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Enable Notifications"
                icon="bell-outline"
                onPress={handleRequestNotifications}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Test"
                icon="send-outline"
                onPress={handleTestNotification}
                loading={pushTesting}
                variant="ghost"
              />
            </View>
          </View>
        </Card>
      </FadeIn>

      {/* Notification Privacy Mode */}
      <FadeIn delay={120}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="bell-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                Notification Privacy
              </Text>
            </View>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              Choose how much detail appears in your push notifications.
            </Text>
            {PRIVACY_MODE_OPTIONS.map((opt) => {
              const selected = notificationPrivacy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { hapticLight(); setNotificationPrivacy(opt.value); }}
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
                >
                  <Icon name={opt.icon} size="md" color={selected ? colors.primary : colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        ...typography.body,
                        color: colors.textPrimary,
                        fontWeight: selected ? '600' : '500',
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
                        style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </FadeIn>

      {/* Biometric Setup */}
      <FadeIn delay={180}>
        <Card
          variant="elevated"
          style={{
            marginBottom: spacing.lg,
            opacity: biometricAvailable ? 1 : 0.5,
          }}
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  backgroundColor: (biometricAvailable ? colors.primary : colors.textDisabled) + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={biometricIcon}
                  size="lg"
                  color={biometricAvailable ? colors.primary : colors.textDisabled}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  allowFontScaling
                >
                  {biometricLabel}
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}
                  allowFontScaling
                >
                  {biometricAvailable
                    ? `Require ${biometricLabel} to view sensitive content`
                    : biometricLoading
                      ? 'Checking availability...'
                      : 'Not available on this device'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={biometricEnabled ? colors.primary : colors.surface}
              />
            </View>
          </View>
        </Card>
      </FadeIn>

      {/* Memory */}
      <FadeIn delay={240}>
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
              />
            </View>
          </View>
        </Card>
      </FadeIn>

      {/* Data Retention */}
      <FadeIn delay={300}>
        <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
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
              {RETENTION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { hapticLight(); setRetentionDays(opt.value); }}
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

      <FadeIn delay={360}>
        <Button
          title="Continue"
          icon="arrow-right"
          onPress={handleContinue}
          loading={saving || loading}
          disabled={saving}
        />
      </FadeIn>
    </ScreenWrapper>
  );
}
