import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Toast } from '../components/ui/Toast';
import { BotLoader } from '../components/ui/BotLoader';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import { useSettingsStore } from '../store/settingsStore';
import { formatDate } from '../utils/formatDate';
import { getDeviceTimezone } from '../utils/formatDate';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageSubscription'>;

export function ManageSubscriptionScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const userTz = useSettingsStore(s => s.settings?.timezone) || getDeviceTimezone();
  const {
    billingStatus,
    loading,
    error,
    loadBillingStatus,
    cancelSubscription,
  } = useBillingStore();

  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadBillingStatus();
    }, []),
  );

  async function handleCancel() {
    hapticMedium();
    setCanceling(true);
    const success = await cancelSubscription();
    setCanceling(false);
    setCancelSheetVisible(false);
    if (success) {
      setToastMsg({ text: 'Subscription will cancel at end of billing period', type: 'success' });
    } else {
      setToastMsg({ text: useBillingStore.getState().error ?? 'Cancellation failed', type: 'error' });
    }
  }

  if (loading && !billingStatus) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BotLoader color={colors.primary} />
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
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const statusLabel = billingStatus?.status ?? 'inactive';
  const minutesUsed = billingStatus?.minutes_used ?? 0;
  const minutesIncluded = billingStatus?.minutes_included ?? 0;
  const minutesRemaining = billingStatus?.minutes_remaining ?? 0;
  const cancelAtPeriodEnd = billingStatus?.cancel_at_period_end ?? false;
  const periodEnd = billingStatus?.current_period_end;
  const renewalDate = periodEnd ? formatDate(periodEnd, userTz) : null;

  const usageRatio = minutesIncluded > 0 ? Math.min(minutesUsed / minutesIncluded, 1) : 0;

  return (
    <ScreenWrapper>
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
        title="Cancel Subscription?"
        message="Your plan will remain active until the end of the current billing period. After that, you'll be moved to the Free plan."
        icon="alert-circle-outline"
        destructive
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep Plan"
        onConfirm={handleCancel}
        loading={canceling}
      />

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
          <Icon name="credit-card-settings-outline" size={36} color={colors.primary} />
        </View>
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Manage Subscription
        </Text>
      </View>

      {/* Current plan */}
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
            <Text
              style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' }}
              allowFontScaling
            >
              {statusLabel}
            </Text>
          </View>
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
                Minutes
              </Text>
            </View>
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary }}
              accessibilityLabel={`${minutesUsed} of ${minutesIncluded} minutes used, ${minutesRemaining} remaining`}
              allowFontScaling
            >
              {minutesUsed} / {minutesIncluded}
            </Text>
          </View>

          <View
            style={{
              height: 8,
              borderRadius: radii.full,
              backgroundColor: colors.surfaceVariant,
              overflow: 'hidden',
            }}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: minutesIncluded, now: minutesUsed }}
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

          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {minutesRemaining} minutes remaining this period
          </Text>
        </View>
      </Card>

      {/* Renewal date */}
      {renewalDate && (
        <Card variant="flat" style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon name="calendar-outline" size="md" color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary }}
                allowFontScaling
              >
                {cancelAtPeriodEnd ? 'Subscription ends' : 'Renews on'}
              </Text>
              <Text
                style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }}
                allowFontScaling
              >
                {renewalDate}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Cancellation warning */}
      {cancelAtPeriodEnd && (
        <Card
          variant="flat"
          style={{
            marginBottom: spacing.lg,
            backgroundColor: colors.warningContainer,
            borderColor: colors.warning,
            borderWidth: 1,
          }}
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
                You'll be moved to the Free plan{renewalDate ? ` on ${renewalDate}` : ' soon'}.
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Actions */}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          title="Change Plan"
          icon="swap-horizontal"
          onPress={() => {
            hapticLight();
            navigation.navigate('PlanSelection', { source: 'manage' });
          }}
          variant="primary"
          accessibilityLabel="Change subscription plan"
        />

        {!cancelAtPeriodEnd && billingStatus?.has_subscription && plan !== 'free' && (
          <Button
            title="Cancel Subscription"
            icon="close-circle-outline"
            onPress={() => {
              hapticLight();
              setCancelSheetVisible(true);
            }}
            variant="outline"
            accessibilityLabel="Cancel your subscription"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
