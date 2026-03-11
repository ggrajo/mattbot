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
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

interface BillingStatus {
  plan: string | null;
  status: string | null;
  minutes_used: number;
  minutes_included: number;
  minutes_remaining: number;
  minutes_carried_over: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_subscription: boolean;
  payment_method?: {
    brand?: string | null;
    last4?: string | null;
    exp_month?: number | null;
    exp_year?: number | null;
  } | null;
}

function statusColor(status: string, colors: any): string {
  switch (status) {
    case 'active':
      return colors.success;
    case 'cancelled':
      return colors.error;
    case 'past_due':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

export function SubscriptionStatusScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/billing/status');
      setStatus(data);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus]),
  );

  const minutesUsed = status?.minutes_used ?? 0;
  const minutesIncluded = status?.minutes_included ?? 0;
  const usagePercent = minutesIncluded > 0 ? Math.min(1, minutesUsed / minutesIncluded) : 0;

  const periodEnd = status?.current_period_end
    ? new Date(status.current_period_end).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

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
        <Icon name="chart-bar" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          Subscription Status
        </Text>
      </View>

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
      )}

      {error && !loading && (
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Icon name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.sm }}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadStatus} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status && !loading && (
        <>
          {/* Plan + Status */}
          <View
            style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderRadius: radii.lg,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>Plan</Text>
                <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                  {(status.plan ?? 'none').charAt(0).toUpperCase() + (status.plan ?? 'none').slice(1)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: statusColor(status.status, colors) + '20',
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text
                  style={{
                    ...typography.caption,
                    color: statusColor(status.status, colors),
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                >
                  {(status.status ?? 'unknown').replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Usage */}
          <View
            style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderRadius: radii.lg,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>
              Minutes Usage
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                {minutesUsed} used
              </Text>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                {minutesIncluded} included
              </Text>
            </View>

            {/* Progress bar */}
            <View
              style={{
                height: 10,
                backgroundColor: colors.surfaceVariant,
                borderRadius: radii.full,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${usagePercent * 100}%`,
                  backgroundColor:
                    usagePercent >= 1
                      ? colors.error
                      : usagePercent >= 0.8
                        ? colors.warning
                        : colors.primary,
                  borderRadius: radii.full,
                }}
              />
            </View>
            <Text
              style={{
                ...typography.caption,
                color: colors.textDisabled,
                textAlign: 'center',
                marginTop: spacing.sm,
              }}
            >
              {Math.round(usagePercent * 100)}% used
            </Text>
          </View>

          {/* Period */}
          <View
            style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderRadius: radii.lg,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              marginBottom: spacing.xl,
            }}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>
              Billing Period
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>Period End</Text>
                <Text style={{ ...typography.body, color: colors.textPrimary }}>{periodEnd}</Text>
              </View>
              {status.cancel_at_period_end && (
                <View
                  style={{
                    backgroundColor: colors.warning + '20',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    alignSelf: 'center',
                  }}
                >
                  <Text style={{ ...typography.caption, color: colors.warning, fontWeight: '700' }}>
                    CANCELS AT PERIOD END
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ManageSubscription')}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ ...typography.button, color: colors.onPrimary }}>Manage Subscription</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
