import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import { useSettingsStore } from '../store/settingsStore';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethod'>;

export function PaymentMethodScreen({ route, navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { plan, source } = route.params;
  const { completeStep } = useSettingsStore();
  const { billingStatus, loadBillingStatus, subscribe } = useBillingStore();

  const [checking, setChecking] = useState(true);
  const [alreadyActive, setAlreadyActive] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    checkExistingSubscription();
  }, []);

  async function checkExistingSubscription() {
    setChecking(true);
    try {
      await loadBillingStatus();
      const status = useBillingStore.getState().billingStatus;
      if (status?.has_subscription && status.status === 'active' && status.plan === plan) {
        setAlreadyActive(true);
      }
    } catch (e: unknown) {
      setError(extractApiError(e));
    } finally {
      setChecking(false);
    }
  }

  async function handleSubscribe() {
    hapticMedium();
    setSubscribing(true);
    setError(null);
    try {
      const ok = await subscribe(plan);
      if (!ok) {
        setError(useBillingStore.getState().error ?? 'Subscription failed');
        setSubscribing(false);
        return;
      }

      setToastType('success');
      setToast('Subscription activated!');

      if (source === 'onboarding') {
        await completeStep('payment_method_added');
        navigation.navigate('NumberProvision', { onboarding: true });
      } else {
        navigation.goBack();
      }
    } catch (e: unknown) {
      setError(extractApiError(e));
    } finally {
      setSubscribing(false);
    }
  }

  function handleSkipAlreadyActive() {
    hapticLight();
    if (source === 'onboarding') {
      navigation.navigate('NumberProvision', { onboarding: true });
    } else {
      navigation.goBack();
    }
  }

  if (checking) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Checking subscription" />
        </View>
      </ScreenWrapper>
    );
  }

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

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
          <Icon name="credit-card-outline" size={36} color={colors.primary} />
        </View>
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Payment Method
        </Text>
        <Text
          style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
          allowFontScaling
        >
          Complete your subscription to the {planLabel} plan.
        </Text>
      </View>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={handleSubscribe} />
        </View>
      )}

      {alreadyActive ? (
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
              <Icon name="check-circle" size={32} color={colors.success} />
            </View>
            <Text
              style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}
              allowFontScaling
            >
              Subscription Already Active
            </Text>
            <Text
              style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
              allowFontScaling
            >
              You're already subscribed to the {planLabel} plan.
            </Text>
          </View>
        </Card>
      ) : (
        <>
          {/* Plan summary */}
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name="star-outline" size="lg" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.h3, color: colors.textPrimary }}
                  allowFontScaling
                >
                  {planLabel} Plan
                </Text>
                <Text
                  style={{ ...typography.bodySmall, color: colors.textSecondary }}
                  allowFontScaling
                >
                  You'll be charged after adding a payment method.
                </Text>
              </View>
            </View>
          </Card>

          {/* Stripe placeholder */}
          <Card
            variant="flat"
            style={{
              marginBottom: spacing.xl,
              borderStyle: 'dashed',
              borderWidth: 1.5,
              borderColor: colors.border,
            }}
          >
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md }}>
              <Icon name="lock-outline" size={28} color={colors.textDisabled} />
              <Text
                style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
                allowFontScaling
              >
                Stripe payment form will appear here
              </Text>
              <Text
                style={{ ...typography.caption, color: colors.textDisabled, textAlign: 'center' }}
                allowFontScaling
              >
                Secure payments powered by Stripe
              </Text>
            </View>
          </Card>
        </>
      )}

      <View style={{ gap: spacing.sm }}>
        {alreadyActive ? (
          <Button
            title="Continue"
            icon="arrow-right"
            onPress={handleSkipAlreadyActive}
            accessibilityLabel="Continue to next step"
          />
        ) : (
          <Button
            title="Subscribe"
            icon="check"
            onPress={handleSubscribe}
            loading={subscribing}
            disabled={subscribing}
            accessibilityLabel={`Subscribe to ${planLabel} plan`}
          />
        )}

        {source === 'manage' && (
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="ghost"
            accessibilityLabel="Go back"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
