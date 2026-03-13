import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { BotLoader } from '../components/ui/BotLoader';
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
  const { billingStatus, loadBillingStatus, subscribe, paymentMethods, loadPaymentMethods } = useBillingStore();

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
      await loadPaymentMethods();
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
      const defaultPm = paymentMethods.find(m => m.is_default) ?? paymentMethods[0];
      const pmId = defaultPm?.id ?? 'pm_card_visa';
      const ok = await subscribe(plan, pmId);
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
          <BotLoader color={colors.primary} />
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

          {/* Payment method info */}
          <Card
            variant="flat"
            style={{
              marginBottom: spacing.xl,
              borderWidth: 1.5,
              borderColor: paymentMethods.length > 0 ? colors.success : colors.border,
              borderStyle: paymentMethods.length > 0 ? 'solid' : 'dashed',
            }}
          >
            {paymentMethods.length > 0 ? (
              <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
                {paymentMethods
                  .filter(m => m.is_default)
                  .concat(paymentMethods.filter(m => !m.is_default))
                  .slice(0, 1)
                  .map(pm => (
                    <View key={pm.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <Icon name="credit-card-outline" size={24} color={colors.success} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
                          {pm.brand ? `${pm.brand} ••••${pm.last4}` : `Card ••••${pm.last4 ?? '????'}`}
                        </Text>
                        <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                          {pm.is_default ? 'Default payment method' : 'Payment method on file'}
                        </Text>
                      </View>
                      <Icon name="check-circle" size={20} color={colors.success} />
                    </View>
                  ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md }}>
                <Icon name="credit-card-outline" size={28} color={colors.primary} />
                <Text
                  style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
                  allowFontScaling
                >
                  Using default test payment method
                </Text>
                <Text
                  style={{ ...typography.caption, color: colors.textDisabled, textAlign: 'center' }}
                  allowFontScaling
                >
                  Secure payments powered by Stripe
                </Text>
              </View>
            )}
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
