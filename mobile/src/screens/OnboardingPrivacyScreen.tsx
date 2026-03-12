import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Platform } from 'react-native';
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

export function OnboardingPrivacyScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { settings, loading, error, loadSettings, updateSettings, completeStep } = useSettingsStore();
  const { available: biometricAvailable, biometryType, loading: biometricLoading, authenticate } = useBiometric();

  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [transcriptDisclosure, setTranscriptDisclosure] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (!settings) loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setRecordingEnabled(settings.recording_enabled);
      setTranscriptDisclosure(settings.transcript_disclosure_mode === 'always');
      setBiometricEnabled(settings.biometric_unlock_enabled ?? false);
    }
  }, [settings]);

  async function handleRequestNotifications() {
    hapticLight();
    if (Platform.OS === 'ios') {
      try {
        const { default: messaging } = await import('@react-native-firebase/messaging');
        const authStatus = await messaging().requestPermission();
        const granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
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
    } else {
      setToastType('success');
      setToast('Notifications enabled');
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
      recording_enabled: recordingEnabled,
      transcript_disclosure_mode: transcriptDisclosure ? 'always' : 'never',
      biometric_unlock_enabled: biometricEnabled,
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
      navigation.navigate('OnboardingSettings');
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

      <OnboardingProgress currentStep={1} totalSteps={6} label="Privacy & Permissions" />

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
            Privacy & Permissions
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
            Review how MattBot handles your data. You can change these anytime in Settings.
          </Text>
        </View>
      </FadeIn>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      {/* Privacy Policy */}
      <FadeIn delay={60}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
                <Icon name="file-document-outline" size="lg" color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  allowFontScaling
                >
                  Privacy Policy
                </Text>
              </View>
            </View>
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 }}
              allowFontScaling
            >
              MattBot processes your calls using AI to provide transcription, screening, and smart
              responses. Call data is encrypted at rest and in transit. You control recording,
              memory retention, and data deletion at any time.
            </Text>
          </View>
        </Card>
      </FadeIn>

      {/* Recording & Disclosure */}
      <FadeIn delay={120}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  backgroundColor: colors.warning + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="microphone-outline" size="lg" color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  allowFontScaling
                >
                  Call Recording
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}
                  allowFontScaling
                >
                  Allow MattBot to record calls for transcription
                </Text>
              </View>
              <Switch
                value={recordingEnabled}
                onValueChange={(v) => { hapticLight(); setRecordingEnabled(v); }}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={recordingEnabled ? colors.primary : colors.surface}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  backgroundColor: colors.accent + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="text-box-outline" size="lg" color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  allowFontScaling
                >
                  Transcript Disclosure
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}
                  allowFontScaling
                >
                  Inform callers that calls may be transcribed
                </Text>
              </View>
              <Switch
                value={transcriptDisclosure}
                onValueChange={(v) => { hapticLight(); setTranscriptDisclosure(v); }}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={transcriptDisclosure ? colors.primary : colors.surface}
              />
            </View>
          </View>
        </Card>
      </FadeIn>

      {/* Push Notifications */}
      <FadeIn delay={180}>
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

      {/* Biometric Setup */}
      <FadeIn delay={240}>
        <Card
          variant="elevated"
          style={{
            marginBottom: spacing.xl,
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

      <FadeIn delay={300}>
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
