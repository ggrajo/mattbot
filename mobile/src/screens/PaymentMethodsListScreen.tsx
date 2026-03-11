import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import type { Theme } from '../theme/tokens';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

const BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
};

export function PaymentMethodsListScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaymentMethod[]>('/billing/payment-methods');
      setMethods(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.post(`/billing/payment-methods/${id}/default`);
      setMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })));
    } catch {
      Alert.alert('Error', 'Could not set default payment method.');
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/billing/payment-methods/${id}`);
            setMethods((prev) => prev.filter((m) => m.id !== id));
          } catch {
            Alert.alert('Error', 'Could not remove payment method.');
          }
        },
      },
    ]);
  };

  const renderMethod = ({ item }: { item: PaymentMethod }) => (
    <Card>
      <View style={s.methodRow}>
        <Text style={s.brandIcon}>{BRAND_ICONS[item.brand.toLowerCase()] ?? '💳'}</Text>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.brandName}>
              {item.brand.charAt(0).toUpperCase() + item.brand.slice(1)} ····{item.last4}
            </Text>
            {item.is_default && <Text style={s.defaultBadge}>Default</Text>}
          </View>
          <Text style={s.expiry}>
            Expires {item.exp_month.toString().padStart(2, '0')}/{item.exp_year}
          </Text>
        </View>
      </View>
      <View style={s.actions}>
        {!item.is_default && (
          <TouchableOpacity onPress={() => handleSetDefault(item.id)}>
            <Text style={[s.actionText, { color: theme.colors.primary }]}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleRemove(item.id)}>
          <Text style={[s.actionText, { color: theme.colors.error }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FadeIn delay={0}>
        <View style={s.header}>
          <Text style={s.title}>Payment Methods</Text>
        </View>
      </FadeIn>

      {loading && methods.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(item) => item.id}
          renderItem={renderMethod}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <FadeIn delay={100}>
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>💳</Text>
                <Text style={s.emptyText}>No payment methods added yet.</Text>
              </View>
            </FadeIn>
          }
          ListFooterComponent={
            <FadeIn delay={200}>
              <Button
                title="Add Payment Method"
                variant="outline"
                onPress={() => navigation.navigate('PaymentMethod')}
                style={{ marginTop: theme.spacing.md }}
              />
            </FadeIn>
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    title: { ...typography.h1, color: colors.textPrimary },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brandIcon: { fontSize: 28 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    defaultBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    expiry: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    actions: {
      flexDirection: 'row',
      gap: 20,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    actionText: { fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 64 },
    emptyEmoji: { fontSize: 36, marginBottom: 12 },
    emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  });
}
