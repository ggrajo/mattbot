import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanSelection'>;

interface Plan {
  code: string;
  name: string;
  price_usd: string;
  description: string;
  features: string[];
  minutes_included: number;
  recommended?: boolean;
}

interface BillingStatus {
  plan: string;
  status: string;
}

export function PlanSelectionScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const source = route.params?.source;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansRes, statusRes] = await Promise.allSettled([
        apiClient.get('/billing/plans'),
        apiClient.get('/billing/status'),
      ]);
      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data.plans ?? plansRes.value.data ?? []);
      }
      if (statusRes.status === 'fulfilled') {
        const status: BillingStatus = statusRes.value.data;
        setCurrentPlan(status.plan);
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
    navigation.navigate('PaymentMethod', {
      plan: plan.code,
      source: source ?? 'manage',
    });
  }

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Icon name="crown-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          {source === 'manage' ? 'Change Plan' : 'Select a Plan'}
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

      {!loading && !error && plans.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
          <Icon name="tag-off-outline" size={48} color={colors.textDisabled} />
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
            No plans available
          </Text>
        </View>
      )}

      {!loading &&
        plans.map((plan) => {
          const isCurrent = currentPlan === plan.code;
          const isRecommended = plan.recommended && !isCurrent;
          return (
            <View
              key={plan.code}
              style={{
                borderWidth: isCurrent ? 2 : isRecommended ? 2 : 1,
                borderColor: isCurrent
                  ? colors.success
                  : isRecommended
                    ? colors.primary
                    : colors.border,
                borderRadius: radii.lg,
                padding: spacing.lg,
                marginBottom: spacing.md,
                backgroundColor: isCurrent
                  ? colors.successContainer
                  : isRecommended
                    ? colors.primaryContainer
                    : colors.surface,
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
                  <Text style={{ ...typography.caption, color: colors.onPrimary, fontWeight: '700' }}>
                    RECOMMENDED
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
                  <Text style={{ ...typography.h2, color: colors.primary }}>
                    ${parseFloat(plan.price_usd).toFixed(2)}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>/month</Text>
                </View>
              </View>

              {plan.minutes_included > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }}>
                  <Icon name="clock-outline" size="sm" color={colors.textSecondary} />
                  <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    {plan.minutes_included} minutes included
                  </Text>
                </View>
              )}

              {(plan.features ?? []).map((feature, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm }}
                >
                  <Icon name="check-circle" size="sm" color={colors.success} />
                  <Text style={{ ...typography.bodySmall, color: colors.textPrimary, flex: 1 }}>
                    {feature}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => handleSelect(plan)}
                disabled={isCurrent}
                style={{
                  backgroundColor: isCurrent
                    ? colors.textDisabled
                    : isRecommended
                      ? colors.primary
                      : colors.surface,
                  borderWidth: isCurrent || isRecommended ? 0 : 1,
                  borderColor: colors.primary,
                  borderRadius: radii.md,
                  paddingVertical: spacing.md,
                  alignItems: 'center',
                  marginTop: spacing.lg,
                  opacity: isCurrent ? 0.5 : 1,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    ...typography.button,
                    color: isCurrent || isRecommended ? '#FFFFFF' : colors.primary,
                  }}
                >
                  {isCurrent ? 'Current Plan' : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
    </ScrollView>
  );
}
