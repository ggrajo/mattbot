import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { hapticLight } from '../utils/haptics';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';
import { formatDate, getUserTimezone } from '../utils/formatDate';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanSelection'>;

interface Plan {
  code: string;
  name: string;
  price_usd: string;
  description: string;
  features: string[];
  included_minutes: number;
  icon: string;
  recommended?: boolean;
}

interface FullBillingStatus {
  plan: string | null;
  status: string | null;
  minutes_included: number;
  minutes_used: number;
  minutes_remaining: number;
  minutes_carried_over: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_subscription: boolean;
}

export function PlanSelectionScreen({ route }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const source = route.params?.source;
  const isOnboarding = source === 'onboarding';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingStatus, setBillingStatus] = useState<FullBillingStatus | null>(null);
  const [billingProvider, setBillingProvider] = useState('manual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resubscribing, setResubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const currentPlan = billingStatus?.plan ?? null;
  const tz = getUserTimezone();
  const remainingMinutes = billingStatus?.minutes_remaining ?? 0;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansRes, statusRes] = await Promise.allSettled([
        apiClient.get('/billing/plans'),
        apiClient.get('/billing/status'),
      ]);
      if (plansRes.status === 'fulfilled') {
        const data = plansRes.value.data;
        setPlans(data.plans ?? data ?? []);
        if (data.billing_provider) setBillingProvider(data.billing_provider);
      }
      if (statusRes.status === 'fulfilled') {
        setBillingStatus(statusRes.value.data);
      }
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  function handleSelect(plan: Plan) {
    hapticLight();
    navigation.navigate('PaymentMethod', {
      plan: plan.code,
      planName: plan.name,
      priceUsd: plan.price_usd,
      minutesIncluded: plan.included_minutes,
      description: plan.description,
      icon: plan.icon || undefined,
      features: plan.features ?? [],
      recommended: plan.recommended ?? false,
      billingProvider,
      source: source ?? 'manage',
    });
  }

  async function handleResubscribe() {
    hapticLight();
    setResubscribing(true);
    try {
      await apiClient.post('/billing/subscribe', { plan: currentPlan, payment_method_id: '' });
      await loadData();
      Alert.alert('Success', 'Your subscription has been renewed.');
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to resubscribe');
    } finally {
      setResubscribing(false);
    }
  }

  function handleCancel() {
    hapticLight();
    Alert.alert(
      'Cancel Subscription',
      'Your plan will remain active until the end of the current billing period. You can resubscribe anytime.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Plan',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await apiClient.post('/billing/cancel');
              await loadData();
              Alert.alert('Cancelled', 'Your plan will expire at the end of the billing period. You can resubscribe anytime.');
            } catch (e) {
              Alert.alert('Error', extractApiError(e) || 'Failed to cancel');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }

  const currentPlanObj = plans.find(p => p.code === currentPlan);
  const currentMinutesIncluded = currentPlanObj?.included_minutes ?? 0;

  const displayPlans = isOnboarding
    ? plans
    : plans.filter(p => p.code !== 'free');

  const usagePercent = billingStatus && billingStatus.minutes_included > 0
    ? Math.min(100, Math.round((billingStatus.minutes_used / billingStatus.minutes_included) * 100))
    : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Icon name="crown-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          {isOnboarding ? 'Select a Plan' : 'Change Plan'}
        </Text>
      </View>

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
      )}

      {error && (
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Icon name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.sm }}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadData} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Plan Usage Card */}
      {!loading && !isOnboarding && billingStatus && currentPlan && currentPlan !== 'free' && (
        <FadeIn delay={0} slide="up">
          <View
            style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderRadius: radii.lg,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="shield-check" size={20} color={colors.success} />
                <Text style={{ ...typography.body, fontWeight: '700', color: colors.textPrimary }}>
                  Current: {currentPlanObj?.name ?? currentPlan}
                </Text>
              </View>
              {billingStatus.cancel_at_period_end && (
                <View style={{ backgroundColor: '#F59E0B20', borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B' }}>Cancelling</Text>
                </View>
              )}
            </View>

            {/* Usage bar */}
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 6 }}>
              Minutes used: {billingStatus.minutes_used} of {billingStatus.minutes_included}
            </Text>
            <View style={{ height: 8, backgroundColor: colors.surfaceVariant, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm }}>
              <View
                style={{
                  height: '100%',
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent > 80 ? '#EF4444' : usagePercent > 50 ? '#F59E0B' : colors.success,
                  borderRadius: 4,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {billingStatus.minutes_remaining} min remaining
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {usagePercent}% used
              </Text>
            </View>

            {billingStatus.minutes_carried_over > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
                <Icon name="swap-horizontal" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary }}>
                  {billingStatus.minutes_carried_over} min carried over from previous plan
                </Text>
              </View>
            )}

            {billingStatus.current_period_end && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
                <Icon name="calendar-clock" size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {billingStatus.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                  {formatDate(billingStatus.current_period_end, tz)}
                  <Text style={{ fontSize: 11, color: colors.textDisabled }}> ({tz})</Text>
                </Text>
              </View>
            )}

            {billingStatus.cancel_at_period_end ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleResubscribe}
                disabled={resubscribing}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                  paddingVertical: spacing.sm + 2,
                  alignItems: 'center',
                  marginTop: spacing.md,
                }}
              >
                {resubscribing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ ...typography.button, color: '#FFFFFF' }}>Resubscribe to {currentPlanObj?.name ?? currentPlan}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCancel}
                disabled={cancelling}
                style={{ alignItems: 'center', marginTop: spacing.md }}
              >
                <Text style={{ fontSize: 13, color: colors.error, fontWeight: '600' }}>
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeIn>
      )}

      {!loading && !error && displayPlans.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
          <Icon name="tag-off-outline" size={48} color={colors.textDisabled} />
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
            No plans available
          </Text>
        </View>
      )}

      {!loading &&
        displayPlans.map((plan, planIndex) => {
          const isCurrent = currentPlan === plan.code;
          const isRecommended = plan.recommended && !isCurrent;
          const minutesDiff = plan.included_minutes - currentMinutesIncluded;
          const showMinutesDiff = !isOnboarding && !isCurrent && currentMinutesIncluded > 0 && minutesDiff !== 0;

          return (
            <FadeIn key={plan.code} delay={planIndex * 80} slide="up">
            <View
              style={{
                borderWidth: isCurrent ? 2 : isRecommended ? 2 : 1,
                borderColor: isCurrent
                  ? colors.success
                  : isRecommended
                    ? colors.primary
                    : (theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder),
                borderRadius: radii.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
                backgroundColor: isCurrent
                  ? colors.successContainer
                  : isRecommended
                    ? colors.primaryContainer
                    : (theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
              }}
            >
              {isCurrent && (
                <View
                  style={{
                    position: 'absolute',
                    top: -12,
                    alignSelf: 'center',
                    backgroundColor: colors.success,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, color: '#FFFFFF', fontWeight: '700' }}>
                    CURRENT PLAN
                  </Text>
                </View>
              )}
              {isRecommended && (
                <View
                  style={{
                    position: 'absolute',
                    top: -12,
                    alignSelf: 'center',
                    backgroundColor: colors.primary,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, color: '#FFFFFF', fontWeight: '700' }}>
                    MOST POPULAR
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: isCurrent || isRecommended ? spacing.sm : 0 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.h3, color: colors.textPrimary }}>{plan.name}</Text>
                  {plan.description ? (
                    <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs }}>
                      {plan.description}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ ...typography.h1, color: colors.primary }}>
                    ${parseFloat(plan.price_usd).toFixed(0)}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>/mo</Text>
                </View>
              </View>

              {plan.included_minutes > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }}>
                  <Icon name="clock-outline" size="sm" color={colors.textSecondary} />
                  <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    {plan.included_minutes} minutes included
                  </Text>
                </View>
              )}

              {showMinutesDiff && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: spacing.sm + 16 }}>
                  <Icon
                    name={minutesDiff > 0 ? 'arrow-up-bold' : 'arrow-down-bold'}
                    size="sm"
                    color={minutesDiff > 0 ? colors.success : '#F59E0B'}
                  />
                  <Text style={{ ...typography.caption, color: minutesDiff > 0 ? colors.success : '#F59E0B', fontWeight: '600', marginLeft: spacing.sm }}>
                    {minutesDiff > 0 ? '+' : ''}{minutesDiff} min vs your current plan
                  </Text>
                </View>
              )}

              {/* Carry-over minutes info for non-current plans */}
              {!isOnboarding && !isCurrent && remainingMinutes > 0 && plan.included_minutes > 0 && (
                <View
                  style={{
                    backgroundColor: colors.primary + '15',
                    borderRadius: 10,
                    padding: spacing.md,
                    marginTop: spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Icon name="swap-horizontal" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginLeft: 6 }}>
                      Minutes carry-over
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                    {plan.included_minutes} new + {remainingMinutes} remaining = {plan.included_minutes + remainingMinutes} total minutes
                  </Text>
                </View>
              )}

              {(plan.features ?? []).map((feature, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}
                >
                  <Icon name="check-circle" size="sm" color={colors.success} />
                  <Text style={{ ...typography.bodySmall, color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }}>
                    {feature}
                  </Text>
                </View>
              ))}

              {isCurrent ? (
                billingStatus?.cancel_at_period_end ? (
                  <TouchableOpacity
                    onPress={handleResubscribe}
                    disabled={resubscribing}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: radii.md,
                      paddingVertical: spacing.md,
                      alignItems: 'center',
                      marginTop: spacing.lg,
                    }}
                  >
                    {resubscribing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ ...typography.button, color: '#FFFFFF' }}>Resubscribe</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: spacing.lg }}>
                    <View
                      style={{
                        backgroundColor: colors.success + '20',
                        borderRadius: radii.md,
                        paddingVertical: spacing.md,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ ...typography.button, color: colors.success }}>Active Plan</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleCancel}
                      disabled={cancelling}
                      style={{ alignItems: 'center', marginTop: spacing.sm }}
                    >
                      <Text style={{ fontSize: 13, color: colors.error, fontWeight: '600' }}>
                        {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <TouchableOpacity
                  onPress={() => handleSelect(plan)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isRecommended ? colors.primary : colors.surface,
                    borderWidth: isRecommended ? 0 : 1,
                    borderColor: colors.primary,
                    borderRadius: radii.md,
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                    marginTop: spacing.lg,
                  }}
                >
                  <Text
                    style={{
                      ...typography.button,
                      color: isRecommended ? '#FFFFFF' : colors.primary,
                    }}
                  >
                    {plan.included_minutes > currentMinutesIncluded ? 'Upgrade' : 'Select'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            </FadeIn>
          );
        })}
    </ScrollView>
  );
}
