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
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

interface BillingStatus {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  minutes_used: number;
  minutes_included: number;
  minutes_remaining: number;
  minutes_carried_over: number;
  cancel_at_period_end: boolean;
  has_subscription: boolean;
}

export function ManageSubscriptionScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  function handleChangePlan() {
    navigation.navigate('PlanSelection', { source: 'manage' });
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access at the end of the current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: performCancel,
        },
      ],
    );
  }

  async function performCancel() {
    try {
      setCancelling(true);
      await apiClient.post('/billing/cancel');
      Alert.alert('Cancelled', 'Your subscription has been cancelled.');
      loadStatus();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    } finally {
      setCancelling(false);
    }
  }

  const renewalDate = status?.current_period_end
    ? new Date(status.current_period_end).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

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
        <Icon name="cog-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          Manage Subscription
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <Icon name="crown-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>Current Plan</Text>
            </View>

            <InfoRow label="Plan" value={status.plan.charAt(0).toUpperCase() + status.plan.slice(1)} colors={colors} typography={typography} spacing={spacing} />
            <InfoRow
              label="Price"
              value={`$${parseFloat(status.price_usd).toFixed(2)}/month`}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
            {renewalDate && (
              <InfoRow label="Renewal Date" value={renewalDate} colors={colors} typography={typography} spacing={spacing} />
            )}
            <InfoRow
              label="Status"
              value={status.status.charAt(0).toUpperCase() + status.status.slice(1)}
              valueColor={status.status === 'active' ? colors.success : colors.warning}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
          </View>

          <TouchableOpacity
            onPress={handleChangePlan}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ ...typography.button, color: colors.onPrimary }}>Change Plan</Text>
          </TouchableOpacity>

          {status.status === 'active' && (
            <TouchableOpacity
              onPress={handleCancel}
              disabled={cancelling}
              style={{
                backgroundColor: colors.errorContainer,
                borderRadius: radii.md,
                paddingVertical: spacing.md,
                alignItems: 'center',
                opacity: cancelling ? 0.6 : 1,
              }}
              activeOpacity={0.8}
            >
              {cancelling ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={{ ...typography.button, color: colors.error }}>Cancel Subscription</Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  colors,
  typography,
  spacing,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
  typography: any;
  spacing: any;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ ...typography.body, color: valueColor ?? colors.textPrimary, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}
