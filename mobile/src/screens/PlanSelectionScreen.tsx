import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import { useSettingsStore } from '../store/settingsStore';
import type { BillingPlan, BillingStatus } from '../api/billing';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanSelection'>;

const PLAN_ICONS: Record<string, string> = {
  free: 'gift-outline',
  starter: 'rocket-launch-outline',
  pro: 'star-outline',
  enterprise: 'shield-crown-outline',
};

const RECOMMENDED_PLAN = 'pro';

function formatPrice(priceUsd: string): string {
  const n = parseFloat(priceUsd);
  if (n === 0) return 'Free';
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function buildConfirmMessage(
  target: BillingPlan,
  billingStatus: BillingStatus | null,
): string {
  const remaining = billingStatus?.minutes_remaining ?? 0;
  const lines: string[] = [];

  if (remaining > 0) {
    lines.push(
      `Your ${remaining} unused minute${remaining === 1 ? '' : 's'} will carry over to your new plan.`,
    );
  }

  lines.push(
    `You'll be switched to ${target.name} at ${formatPrice(target.price_usd)}/mo with ${target.included_minutes} minutes included.`,
  );

  return lines.join('\n\n');
}

export function PlanSelectionScreen({ route, navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const source = route.params?.source;
  const isOnboarding = source === 'onboarding';

  const {
    plans,
    billingStatus,
    loading,
    error,
    loadPlans,
    loadBillingStatus,
    loadPaymentMethods,
    paymentMethods,
    subscribe,
    changePlan,
  } = useBillingStore();
  const { completeStep } = useSettingsStore();

  const [confirmPlan, setConfirmPlan] = useState<BillingPlan | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    loadPlans();
    loadBillingStatus();
    loadPaymentMethods();
  }, []);

  const currentPlanCode = billingStatus?.plan ?? null;
  const hasSubscription = billingStatus?.has_subscription ?? false;
  const defaultPaymentMethod = paymentMethods.find((pm) => pm.is_default) ?? paymentMethods[0];
  const hasPaymentMethod = !!defaultPaymentMethod || !!billingStatus?.payment_method?.last4;
  const minutesRemaining = billingStatus?.minutes_remaining ?? 0;

  const visiblePlans = [...plans]
    .filter((p) => {
      if (p.limited && !isOnboarding) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const showToast = useCallback(
    (text: string, type: 'success' | 'error') => setToastMsg({ text, type }),
    [],
  );

  async function handleResubscribe(plan: BillingPlan) {
    if (!defaultPaymentMethod) {
      showToast('Please add a payment method first', 'error');
      navigation.navigate('PaymentMethodsList');
      return;
    }
    setProcessingPlan(plan.code);
    const ok = await subscribe(plan.code, defaultPaymentMethod.id);
    setProcessingPlan(null);
    if (ok) {
      showToast(`Resubscribed to ${plan.name}`, 'success');
      navigation.goBack();
    } else {
      showToast(
        useBillingStore.getState().error ?? 'Resubscription failed',
        'error',
      );
    }
  }

  function handleSelectPlan(plan: BillingPlan) {
    if (isCurrentPlan(plan) && hasSubscription) {
      handleResubscribe(plan);
      return;
    }

    if (hasSubscription) {
      setConfirmPlan(plan);
      return;
    }

    if (!plan.requires_credit_card) {
      handleFreePlan(plan);
      return;
    }

    if (!hasPaymentMethod) {
      navigation.navigate('PaymentMethod', { plan: plan.code, source });
      return;
    }

    setConfirmPlan(plan);
  }

  async function handleFreePlan(plan: BillingPlan) {
    setProcessingPlan(plan.code);
    const ok = await subscribe(plan.code, defaultPaymentMethod?.id ?? '');
    setProcessingPlan(null);
    if (ok && isOnboarding) {
      await completeStep('plan_selected');
      navigation.navigate('NumberProvision', { onboarding: true });
    } else if (ok) {
      navigation.navigate('SubscriptionStatus');
    } else {
      showToast(
        useBillingStore.getState().error ?? 'Subscription failed',
        'error',
      );
    }
  }

  async function handleConfirm() {
    if (!confirmPlan) return;
    const planName = confirmPlan.name;
    if (!hasSubscription && !defaultPaymentMethod) {
      showToast('Please add a payment method first', 'error');
      setConfirmPlan(null);
      navigation.navigate('PaymentMethodsList');
      return;
    }
    setProcessingPlan(confirmPlan.code);

    let ok: boolean;
    if (hasSubscription) {
      ok = await changePlan(confirmPlan.code);
    } else {
      ok = await subscribe(confirmPlan.code, defaultPaymentMethod!.id);
    }

    setProcessingPlan(null);
    setConfirmPlan(null);

    if (ok && isOnboarding) {
      await completeStep('plan_selected');
      navigation.navigate('NumberProvision', { onboarding: true });
    } else if (ok) {
      showToast(`Switched to ${planName}`, 'success');
      navigation.goBack();
    } else {
      showToast(
        useBillingStore.getState().error ?? 'Plan change failed',
        'error',
      );
    }
  }

  function isCurrentPlan(plan: BillingPlan): boolean {
    return currentPlanCode === plan.code;
  }

  if (loading && plans.length === 0) {
    return (
      <ScreenWrapper scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator
            size="large"
            color={colors.primary}
            accessibilityLabel="Loading plans"
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll>
      {toastMsg && (
        <Toast
          message={toastMsg.text}
          type={toastMsg.type}
          visible={!!toastMsg}
          onDismiss={() => setToastMsg(null)}
        />
      )}

      {isOnboarding && (
        <OnboardingProgress currentStep={5} totalSteps={7} label="Plan & Payment" />
      )}

      <ConfirmSheet
        visible={!!confirmPlan}
        onDismiss={() => setConfirmPlan(null)}
        title={
          hasSubscription
            ? `Switch to ${confirmPlan?.name ?? ''}?`
            : `Subscribe to ${confirmPlan?.name ?? ''}?`
        }
        message={
          confirmPlan
            ? buildConfirmMessage(confirmPlan, billingStatus)
            : undefined
        }
        icon="swap-horizontal"
        confirmLabel={hasSubscription ? 'Change Plan' : 'Subscribe'}
        cancelLabel="Go Back"
        onConfirm={handleConfirm}
        loading={!!processingPlan}
      />

      <View style={{ gap: spacing.xl }}>
        {/* Header */}
        <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
          <Text
            style={{ ...typography.h1, color: colors.textPrimary }}
            accessibilityRole="header"
            allowFontScaling
          >
            {isOnboarding ? 'Pick Your Plan' : 'Choose a Plan'}
          </Text>
          <Text
            style={{ ...typography.body, color: colors.textSecondary }}
            allowFontScaling
          >
            {isOnboarding
              ? 'Start with the plan that fits you best. Upgrade anytime.'
              : 'Select the plan that best fits your needs.'}
          </Text>
        </View>

        {error && <ErrorMessage message={error} action="Retry" onAction={() => { loadPlans(); loadBillingStatus(); }} />}

        {/* Carry-over banner */}
        {hasSubscription && minutesRemaining > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: colors.primaryContainer,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.md,
            }}
          >
            <Icon name="information-outline" size="md" color={colors.primary} />
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.primary,
                flex: 1,
                fontWeight: '500',
              }}
              allowFontScaling
            >
              {minutesRemaining} minute{minutesRemaining === 1 ? '' : 's'}{' '}
              remaining — these carry over when you change plans.
            </Text>
          </View>
        )}

        {/* Plan cards */}
        {visiblePlans.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const isRecommended = plan.code === RECOMMENDED_PLAN && !isCurrent;
          const iconName = PLAN_ICONS[plan.code] ?? 'card-outline';
          const features = plan.description.split('\n').filter(Boolean);
          const isFree =
            plan.price_usd === '0' || plan.price_usd === '0.00';

          return (
            <View key={plan.code}>
              {/* Recommended badge — sits above the card */}
              {isRecommended && (
                <View
                  style={{
                    alignSelf: 'center',
                    backgroundColor: colors.primary,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.xs,
                    borderTopLeftRadius: radii.md,
                    borderTopRightRadius: radii.md,
                  }}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.onPrimary,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                    allowFontScaling
                  >
                    Recommended
                  </Text>
                </View>
              )}

              <Card
                variant="elevated"
                style={{
                  gap: spacing.md,
                  borderWidth: isCurrent ? 2 : isRecommended ? 1.5 : 0,
                  borderColor: isCurrent
                    ? colors.primary
                    : isRecommended
                      ? colors.primary + '80'
                      : 'transparent',
                  ...(isRecommended && !isCurrent
                    ? {
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                      }
                    : {}),
                }}
              >
                {/* Plan header row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  {/* Icon circle */}
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: radii.lg,
                      backgroundColor: isCurrent
                        ? colors.primary + '1A'
                        : colors.surfaceVariant,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={iconName}
                      size="lg"
                      color={isCurrent ? colors.primary : colors.textSecondary}
                    />
                  </View>

                  {/* Name + price */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <Text
                        style={{ ...typography.h3, color: colors.textPrimary }}
                        allowFontScaling
                      >
                        {plan.name}
                      </Text>
                      {isCurrent && (
                        <View
                          style={{
                            backgroundColor: colors.primaryContainer,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 2,
                            borderRadius: radii.sm,
                          }}
                        >
                          <Text
                            style={{
                              ...typography.caption,
                              color: colors.primary,
                              fontWeight: '700',
                            }}
                            allowFontScaling
                          >
                            Current Plan
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: colors.textSecondary,
                      }}
                      allowFontScaling
                    >
                      {plan.included_minutes} min/mo included
                    </Text>
                  </View>

                  {/* Price */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        ...typography.h2,
                        color: isFree ? colors.success : colors.textPrimary,
                      }}
                      accessibilityLabel={
                        isFree
                          ? 'Free'
                          : `${formatPrice(plan.price_usd)} per month`
                      }
                      allowFontScaling
                    >
                      {formatPrice(plan.price_usd)}
                    </Text>
                    {!isFree && (
                      <Text
                        style={{
                          ...typography.caption,
                          color: colors.textSecondary,
                        }}
                        allowFontScaling
                      >
                        /month
                      </Text>
                    )}
                  </View>
                </View>

                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: spacing.xs,
                  }}
                />

                {/* Feature list */}
                {features.length > 0 && (
                  <View style={{ gap: spacing.sm }}>
                    {features.map((feat, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: spacing.sm,
                        }}
                      >
                        <Icon
                          name="check-circle"
                          size="sm"
                          color={isCurrent ? colors.primary : colors.success}
                        />
                        <Text
                          style={{
                            ...typography.bodySmall,
                            color: colors.textSecondary,
                            flex: 1,
                          }}
                          allowFontScaling
                        >
                          {feat}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Carry-over hint for non-current plans */}
                {hasSubscription &&
                  !isCurrent &&
                  minutesRemaining > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                        backgroundColor: colors.successContainer,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radii.sm,
                      }}
                    >
                      <Icon
                        name="arrow-right-circle-outline"
                        size="sm"
                        color={colors.success}
                      />
                      <Text
                        style={{
                          ...typography.caption,
                          color: colors.success,
                          fontWeight: '500',
                        }}
                        allowFontScaling
                      >
                        +{minutesRemaining} min carry over
                      </Text>
                    </View>
                  )}

                {/* Action button */}
                <Button
                  title={
                    isCurrent && hasSubscription
                      ? 'Resubscribe'
                      : isCurrent
                        ? 'Current Plan'
                        : plan.requires_credit_card
                          ? 'Select Plan'
                          : 'Get Started Free'
                  }
                  onPress={() => handleSelectPlan(plan)}
                  variant={
                    isCurrent && hasSubscription
                      ? 'secondary'
                      : isCurrent
                        ? 'outline'
                        : isRecommended
                          ? 'primary'
                          : 'outline'
                  }
                  icon={
                    isCurrent && hasSubscription
                      ? 'refresh'
                      : undefined
                  }
                  loading={processingPlan === plan.code}
                  disabled={isCurrent && !hasSubscription}
                />
              </Card>
            </View>
          );
        })}

        {/* Cancel / back */}
        {source === 'manage' && (
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="ghost"
            icon="arrow-left"
          />
        )}

        <View style={{ height: spacing.xl }} />
      </View>
    </ScreenWrapper>
  );
}
