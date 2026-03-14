import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BotLoader } from '../components/ui/BotLoader';
import { Toast } from '../components/ui/Toast';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { verifyForwarding, getForwardingVerifyStatus } from '../api/telephony';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium, hapticError } from '../utils/haptics';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForwardingVerify'>;

type VerifyState = 'idle' | 'verifying' | 'success' | 'failed';

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 60000;

export function ForwardingVerifyScreen({ route, navigation }: Props) {
  const isOnboarding = route.params?.onboarding ?? false;
  const { colors, spacing, typography, radii } = useTheme();
  const { completeStep } = useSettingsStore();

  const [status, setStatus] = useState<VerifyState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function pollStatus() {
    try {
      const result = await getForwardingVerifyStatus();
      if (result.latest_attempt_status === 'verified' || result.verification_status === 'verified') {
        stopPolling();
        setStatus('success');
        hapticMedium();
        setToastType('success');
        setToast('Forwarding verified!');
        await handleVerificationSuccess();
      } else if (result.latest_attempt_status === 'failed') {
        stopPolling();
        setStatus('failed');
        hapticError();
      }
    } catch {
      // Polling failures are non-fatal; keep trying until timeout
    }
  }

  async function handleVerificationSuccess() {
    if (isOnboarding) {
      await completeStep('forwarding_configured');
      navigation.navigate('CallModes', { onboarding: true });
    }
  }

  async function handleStartVerification() {
    hapticMedium();
    setStatus('verifying');
    setError(null);
    try {
      await verifyForwarding();

      pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL);

      timeoutRef.current = setTimeout(() => {
        stopPolling();
        if (status === 'verifying') {
          setStatus('failed');
          setError('Verification timed out. Please make sure forwarding is configured and try again.');
          hapticError();
        }
      }, POLL_TIMEOUT);
    } catch (e: unknown) {
      setStatus('idle');
      setError(extractApiError(e));
    }
  }

  function handleRetry() {
    hapticLight();
    setStatus('idle');
    setError(null);
  }

  function handleContinue() {
    hapticLight();
    if (isOnboarding) {
      navigation.navigate('CallModes', { onboarding: true });
    } else {
      navigation.goBack();
    }
  }

  const statusConfig = {
    idle: {
      icon: 'phone-forward-outline' as const,
      iconColor: colors.primary,
      bgColor: colors.primary + '14',
      title: 'Verify Forwarding',
      subtitle: 'Test that calls are being forwarded correctly to your AI assistant.',
    },
    verifying: {
      icon: 'phone-sync-outline' as const,
      iconColor: colors.primary,
      bgColor: colors.primary + '14',
      title: 'Verifying...',
      subtitle: 'We\'re placing a test call. This may take up to a minute.',
    },
    success: {
      icon: 'check-circle' as const,
      iconColor: colors.success,
      bgColor: colors.success + '14',
      title: 'Forwarding Verified!',
      subtitle: 'Calls to your personal number will now forward to your AI assistant when you\'re unavailable.',
    },
    failed: {
      icon: 'close-circle-outline' as const,
      iconColor: colors.error,
      bgColor: colors.error + '14',
      title: 'Verification Failed',
      subtitle: 'We couldn\'t verify forwarding. Please double-check your settings and try again.',
    },
  };

  const config = statusConfig[status];

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {isOnboarding && (
        <OnboardingProgress currentStep={7} totalSteps={7} label="Call Setup" />
      )}

      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.xl,
            backgroundColor: config.bgColor,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          {status === 'verifying' ? (
            <BotLoader color={config.iconColor} />
          ) : (
            <Icon name={config.icon} size={36} color={config.iconColor} />
          )}
        </View>
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          {config.title}
        </Text>
        <Text
          style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
          allowFontScaling
        >
          {config.subtitle}
        </Text>
      </View>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} />
        </View>
      )}

      {status === 'verifying' && (
        <FadeIn>
          <Card
            variant="flat"
            style={{
              marginBottom: spacing.xl,
              backgroundColor: colors.primaryContainer,
              borderColor: colors.primary,
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <BotLoader size="small" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.primary, fontWeight: '500' }}
                  allowFontScaling
                >
                  Test call in progress
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.primary }}
                  allowFontScaling
                >
                  Please don't answer calls on your personal number during this test.
                </Text>
              </View>
            </View>
          </Card>
        </FadeIn>
      )}

      {status === 'success' && (
        <FadeIn>
          <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
            <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.success + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check-decagram" size={32} color={colors.success} />
              </View>
              <Text
                style={{ ...typography.h3, color: colors.success, textAlign: 'center' }}
                allowFontScaling
              >
                All Set!
              </Text>
              <Text
                style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
                allowFontScaling
              >
                Your forwarding is working correctly.
              </Text>
            </View>
          </Card>
        </FadeIn>
      )}

      {status === 'failed' && (
        <FadeIn>
          <Card
            variant="flat"
            style={{
              marginBottom: spacing.xl,
              backgroundColor: colors.errorContainer,
              borderColor: colors.error,
              borderWidth: 1,
            }}
          >
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="alert-outline" size="md" color={colors.error} />
                <Text
                  style={{ ...typography.body, color: colors.error, fontWeight: '600', flex: 1 }}
                  allowFontScaling
                >
                  Troubleshooting Tips
                </Text>
              </View>
              <View style={{ gap: spacing.xs }}>
                {[
                  'Make sure call forwarding is enabled on your carrier.',
                  'Verify the forwarding number matches your AI number.',
                  'Try disabling and re-enabling forwarding.',
                  'Wait a few minutes and try again.',
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                    <Icon name="circle-small" size="sm" color={colors.error} />
                    <Text
                      style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}
                      allowFontScaling
                    >
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </FadeIn>
      )}

      <View style={{ gap: spacing.sm }}>
        {status === 'idle' && (
          <Button
            title="Start Verification"
            icon="phone-ring-outline"
            onPress={handleStartVerification}
            accessibilityLabel="Start forwarding verification"
          />
        )}

        {status === 'failed' && (
          <Button
            title="Try Again"
            icon="refresh"
            onPress={handleRetry}
            accessibilityLabel="Retry forwarding verification"
          />
        )}

        {status === 'success' && (
          <Button
            title={isOnboarding ? 'Finish Setup' : 'Done'}
            icon={isOnboarding ? 'check-all' : 'check'}
            onPress={handleContinue}
            accessibilityLabel={isOnboarding ? 'Complete onboarding' : 'Go back'}
          />
        )}

        {isOnboarding && status !== 'success' && (
          <Button
            title="Skip for Now"
            onPress={async () => {
              hapticLight();
              await completeStep('forwarding_configured');
              navigation.navigate('CallModes', { onboarding: true });
            }}
            variant="ghost"
            accessibilityLabel="Skip verification and continue"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
