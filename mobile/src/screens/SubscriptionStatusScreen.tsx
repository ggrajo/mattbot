import React, { useEffect, useState } from 'react';
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
import { getDeviceTimezone } from '../utils/formatDate';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionStatus'>;

export function SubscriptionStatusScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const userTz = useSettingsStore(s => s.settings?.timezone) || getDeviceTimezone();
  const {
    plans,
    loadPlans,
    billingStatus,
    loading,
    error,
    loadBillingStatus,
    cancel,
  } = useBillingStore();

  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadPlans();
    loadBillingStatus();
  }, []);

  async function handleCancel() {
    setCanceling(true);
    const success = await cancel();
    setCanceling(false);
    setCancelSheetVisible(false);
    if (success) {
      setToastMsg({ text: 'Subscription will cancel at end of period', type: 'success' });
    } else {
      setToastMsg({ text: useBillingStore.getState().error ?? 'Cancellation failed', type: 'error' });
    }
  }

  if (loading && !billingStatus) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading subscription status" />
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !billingStatus) {
    return (
      <ScreenWrapper scroll>
        <View style={{ marginTop: spacing.xxl }}>
          <ErrorMessage message={error} action="Retry" onAction={loadBillingStatus} />
        </View>
      </ScreenWrapper>
    );
  }

  const plan = billingStatus?.plan ?? 'free';
  const planData = plans.find((p) => p.code === plan);
  const planLabel = planData?.name ?? plan;
  const price = planData ? parseFloat(planData.price_usd) : 0;
  const minutesUsed = billingStatus?.minutes_used ?? 0;
  const minutesIncluded = billingStatus?.minutes_included ?? 0;
  const minutesCarriedOver = billingStatus?.minutes_carried_over ?? 0;
  const totalMinutes = minutesIncluded + minutesCarriedOver;
  const usageRatio = totalMinutes > 0 ? Math.min(minutesUsed / totalMinutes, 1) : 0;
  const paymentMethod = billingStatus?.payment_method;
  const cancelAtPeriodEnd = billingStatus?.cancel_at_period_end ?? false;

  const periodEndDate = billingStatus?.current_period_end
    ? new Date(billingStatus.current_period_end)
    : null;
  const periodEndFormatted = periodEndDate
    ? periodEndDate.toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: userTz,
      })
    : null;
  const daysUntilExpiry = periodEndDate
    ? Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

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

      <ConfirmSheet
        visible={cancelSheetVisible}
        onDismiss={() => setCancelSheetVisible(false)}
        title="Cancel Subscription"
        message="Your plan will remain active until the end of the current billing period. After that, you'll be moved to the Free plan."
        icon="alert-circle-outline"
        destructive
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep Plan"
        onConfirm={handleCancel}
        loading={canceling}
      />

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xl }}
        accessibilityRole="header"
        allowFontScaling
      >
        Subscription
      </Text>

      {/* Plan badge & price */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radii.sm,
                backgroundColor: colors.primaryContainer,
              }}
            >
              <Text
                style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '700' }}
                allowFontScaling
              >
                {planLabel}
              </Text>
            </View>
            {billingStatus?.status && (
              <Text
                style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' }}
                allowFontScaling
              >
                {billingStatus.status}
              </Text>
            )}
          </View>
          <Text
            style={{ ...typography.h2, color: colors.textPrimary }}
            accessibilityLabel={`${price} dollars per month`}
            allowFontScaling
          >
            ${price}
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>/mo</Text>
          </Text>
        </View>
      </Card>

      {/* Minutes usage */}
      <Card variant="flat" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="clock-outline" size="md" color={colors.textSecondary} />
              <Text
                style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }}
                allowFontScaling
              >
                Minutes Usage
              </Text>
            </View>
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary }}
              accessibilityLabel={`${minutesUsed} of ${totalMinutes} minutes used`}
              allowFontScaling
            >
              {minutesUsed} / {totalMinutes}
            </Text>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 8,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceVariant,
              overflow: 'hidden',
            }}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: totalMinutes, now: minutesUsed }}
          >
            <View
              style={{
                height: '100%',
                width: `${usageRatio * 100}%`,
                borderRadius: radii.full,
                backgroundColor: usageRatio > 0.9 ? colors.error : colors.primary,
              }}
            />
          </View>

          {usageRatio > 0.9 && (
            <Text
              style={{ ...typography.caption, color: colors.error }}
              allowFontScaling
            >
              Approaching minute limit
            </Text>
          )}

          {minutesCarriedOver > 0 && (
            <Text
              style={{ ...typography.caption, color: colors.textSecondary }}
              allowFontScaling
            >
              Includes {minutesCarriedOver} minutes carried over from your previous plan.
            </Text>
          )}
        </View>
      </Card>

      {/* Current period ends */}
      {periodEndFormatted && (
        <Card variant="flat" style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon name="calendar-outline" size="md" color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary }}
                allowFontScaling
              >
                {cancelAtPeriodEnd ? 'Subscription ends' : 'Current period ends'}
              </Text>
              <Text
                style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }}
                allowFontScaling
              >
                {periodEndFormatted}
              </Text>
            </View>
            {daysUntilExpiry !== null && (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.full,
                  backgroundColor: daysUntilExpiry <= 3
                    ? colors.errorContainer
                    : daysUntilExpiry <= 7
                      ? colors.warningContainer
                      : colors.primaryContainer,
                }}
              >
                <Text
                  style={{
                    ...typography.caption,
                    fontWeight: '700',
                    color: daysUntilExpiry <= 3
                      ? colors.error
                      : daysUntilExpiry <= 7
                        ? colors.warning
                        : colors.primary,
                  }}
                  allowFontScaling
                >
                  {daysUntilExpiry === 0 ? 'Today' : `${daysUntilExpiry}d left`}
                </Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Payment method */}
      {paymentMethod?.brand && paymentMethod?.last4 && (
        <Card variant="flat" style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon name="credit-card-outline" size="md" color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary }}
                allowFontScaling
              >
                Payment method
              </Text>
              <Text
                style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500', textTransform: 'capitalize' }}
                accessibilityLabel={`${paymentMethod.brand} ending in ${paymentMethod.last4}`}
                allowFontScaling
              >
                {paymentMethod.brand} •••• {paymentMethod.last4}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Cancellation warning */}
      {cancelAtPeriodEnd && (
        <View style={{ marginBottom: spacing.lg }}>
          <Card
            variant="flat"
            style={{ borderColor: colors.warning, backgroundColor: colors.warningContainer }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name="alert-outline" size="lg" color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.warning, fontWeight: '600' }}
                  allowFontScaling
                >
                  Canceling at end of period
                </Text>
                <Text
                  style={{ ...typography.bodySmall, color: colors.warning }}
                  allowFontScaling
                >
                  Your subscription will end{periodEndFormatted ? ` on ${periodEndFormatted}` : ' soon'}.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Actions */}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          title="Change Plan"
          icon="swap-horizontal"
          onPress={() => navigation.navigate('ManageSubscription')}
          variant="primary"
          accessibilityLabel="Change subscription plan"
        />
        {!cancelAtPeriodEnd && billingStatus?.has_subscription && plan !== 'free' && (
          <Button
            title="Cancel Subscription"
            icon="close-circle-outline"
            onPress={() => setCancelSheetVisible(true)}
            variant="outline"
            accessibilityLabel="Cancel your subscription"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
