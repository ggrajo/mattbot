import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import Config from 'react-native-config';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { BotLoader } from '../components/ui/BotLoader';
import { useTheme } from '../theme/ThemeProvider';
import {
  listPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  createSetupIntent,
  type PaymentMethodItem,
} from '../api/billing';
import { extractApiError } from '../api/client';

const BRAND_ICONS: Record<string, string> = {
  visa: 'credit-card-outline',
  mastercard: 'credit-card-outline',
  amex: 'credit-card-outline',
  discover: 'credit-card-outline',
  card: 'credit-card-outline',
};

function brandLabel(brand: string | null): string {
  if (!brand) return 'Card';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function PaymentMethodsListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'info' | 'error'>('info');

  const isDevMode = Config.ENVIRONMENT === 'development' || !Config.STRIPE_PUBLISHABLE_KEY;

  const load = useCallback(async () => {
    try {
      const data = await listPaymentMethods();
      setMethods(data.items);
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      if (isDevMode) {
        const pm = await addPaymentMethod('pm_card_visa_dev');
        setMethods(prev => [pm, ...prev.map(m => ({ ...m, is_default: false }))]);
        setToastType('info');
        setToast('Card added (dev mode)');
      } else {
        await createSetupIntent();
        setToastType('info');
        setToast('Card input coming soon — use web dashboard to add cards');
      }
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (pm: PaymentMethodItem) => {
    Alert.alert(
      'Remove Card',
      `Remove ${brandLabel(pm.brand)} ending in ${pm.last4 ?? '****'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePaymentMethod(pm.id);
              setMethods(prev => {
                const remaining = prev.filter(m => m.id !== pm.id);
                if (pm.is_default && remaining.length > 0) {
                  remaining[0] = { ...remaining[0], is_default: true };
                }
                return remaining;
              });
              setToastType('info');
              setToast('Card removed');
            } catch (e) {
              setToastType('error');
              setToast(extractApiError(e));
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = async (pm: PaymentMethodItem) => {
    try {
      await setDefaultPaymentMethod(pm.id);
      setMethods(prev =>
        prev.map(m => ({ ...m, is_default: m.id === pm.id })),
      );
      setToastType('info');
      setToast(`${brandLabel(pm.brand)} ****${pm.last4} set as default`);
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    }
  };

  const renderItem = ({ item }: { item: PaymentMethodItem }) => {
    const iconName = BRAND_ICONS[item.brand?.toLowerCase() ?? ''] ?? 'credit-card-outline';
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.sm,
          gap: spacing.md,
          ...(theme.dark
            ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }
            : Platform.select({
                ios: {
                  shadowColor: 'rgba(124, 58, 237, 0.10)',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                },
                android: { elevation: 2 },
              })),
        }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: item.is_default ? colors.primary + '18' : colors.surfaceVariant,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={iconName} size={22} color={item.is_default ? colors.primary : colors.textSecondary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
              {brandLabel(item.brand)} ****{item.last4 ?? '----'}
            </Text>
            {item.is_default && (
              <View style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radii.full,
                backgroundColor: colors.primary + '18',
              }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>DEFAULT</Text>
              </View>
            )}
          </View>
          <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
            {item.exp_month && item.exp_year
              ? `Expires ${String(item.exp_month).padStart(2, '0')}/${String(item.exp_year).slice(-2)}`
              : 'No expiry info'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {!item.is_default && (
            <Pressable
              onPress={() => handleSetDefault(item)}
              hitSlop={8}
              accessibilityLabel={`Set ${brandLabel(item.brand)} ending in ${item.last4} as default`}
              accessibilityRole="button"
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: colors.primary + '14',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="check-circle-outline" size={18} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => handleRemove(item)}
            hitSlop={8}
            accessibilityLabel={`Remove ${brandLabel(item.brand)} ending in ${item.last4}`}
            accessibilityRole="button"
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.error + '14',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="trash-can-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper scroll={false}>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BotLoader color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={
            methods.length === 0
              ? { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }
              : { paddingBottom: spacing.xl }
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: colors.primary + '14',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="credit-card-plus-outline" size={36} color={colors.primary} />
              </View>
              <Text style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}>
                No Payment Methods
              </Text>
              <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
                Add a card to manage your subscription and payments.
              </Text>
            </View>
          }
          ListFooterComponent={
            methods.length > 0 || !loading ? (
              <View style={{ marginTop: spacing.lg }}>
                <Button
                  title={adding ? 'Adding...' : 'Add Payment Method'}
                  icon="plus"
                  onPress={handleAdd}
                  disabled={adding}
                  accessibilityLabel="Add a new payment method"
                />
              </View>
            ) : null
          }
        />
      )}
    </ScreenWrapper>
  );
}
