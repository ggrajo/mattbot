import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient, extractApiError } from '../api/client';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

function cardIcon(brand: string): string {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'credit-card-outline';
    case 'mastercard':
      return 'credit-card-outline';
    case 'amex':
      return 'credit-card-outline';
    default:
      return 'credit-card-outline';
  }
}

export function PaymentMethodsListScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/billing/payment-methods');
      setMethods(data.payment_methods ?? data ?? []);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMethods();
    }, [loadMethods]),
  );

  async function handleSetDefault(pm: PaymentMethod) {
    try {
      setActionLoading(pm.id);
      await apiClient.put(`/billing/payment-methods/${pm.id}/default`);
      await loadMethods();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    } finally {
      setActionLoading(null);
    }
  }

  function handleDelete(pm: PaymentMethod) {
    Alert.alert(
      'Remove Card',
      `Remove card ending in ${pm.last4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(pm.id);
              await apiClient.delete(`/billing/payment-methods/${pm.id}`);
              await loadMethods();
            } catch (e) {
              Alert.alert('Error', extractApiError(e));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }

  function renderItem({ item, index }: { item: PaymentMethod; index: number }) {
    const isActioning = actionLoading === item.id;
    return (
      <FadeIn delay={index * 40} slide="up">
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.sm,
            borderWidth: item.is_default ? 2 : 1,
            borderColor: item.is_default ? colors.primary : colors.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.md,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={cardIcon(item.brand)} size="lg" color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                {item.brand.charAt(0).toUpperCase() + item.brand.slice(1)} ┬╖┬╖┬╖┬╖{item.last4}
              </Text>
              {item.is_default && (
                <View
                  style={{
                    backgroundColor: colors.primaryContainer,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700' }}>
                    DEFAULT
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
              Expires {String(item.exp_month).padStart(2, '0')}/{item.exp_year}
            </Text>
          </View>

          {isActioning ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {!item.is_default && (
                <TouchableOpacity onPress={() => handleSetDefault(item)} hitSlop={8}>
                  <Icon name="check-circle-outline" size="lg" color={colors.success} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                <Icon name="trash-can-outline" size="lg" color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </FadeIn>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
      }}
    >
      <FadeIn delay={0} slide="up">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Icon name="credit-card-multiple-outline" size="lg" color={colors.primary} />
          <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>Payment Methods</Text>
        </View>
      </FadeIn>

      {error && (
        <View
          style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
          <TouchableOpacity onPress={loadMethods}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={methods}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadMethods}
        contentContainerStyle={
          methods.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: insets.bottom + spacing.xxl }
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: radii.xxl,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <Icon name="credit-card-off-outline" size={32} color={colors.primary} />
              </View>
              <Text
                style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }}
              >
                No payment methods
              </Text>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}
              >
                Add a payment method to manage your subscription
              </Text>
            </View>
          ) : null
        }
      />

      <FadeIn delay={200} slide="up">
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.lg,
            paddingVertical: spacing.md,
            alignItems: 'center',
            marginBottom: insets.bottom + spacing.lg,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.button, color: colors.onPrimary }}>Add Payment Method</Text>
        </TouchableOpacity>
      </FadeIn>
    </View>
  );
}
