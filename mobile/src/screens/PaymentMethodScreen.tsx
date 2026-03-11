import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethod'>;

export function PaymentMethodScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { plan, source } = route.params;

  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    try {
      setSubscribing(true);
      setError(null);
      await apiClient.post('/billing/subscribe', { plan_code: plan });

      if (source === 'onboarding') {
        try {
          await apiClient.post('/onboarding/complete-step', { step: 'plan_selected' });
          await apiClient.post('/onboarding/complete-step', { step: 'payment_method_added' });
        } catch {}
      }

      Alert.alert('Success', 'Your subscription is now active!', [
        {
          text: 'OK',
          onPress: () => {
            if (source === 'onboarding') {
              navigation.navigate('NumberProvision', { onboarding: true });
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Icon name="credit-card-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>Payment</Text>
      </View>

      {/* Plan summary */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="tag-outline" size="md" color={colors.primary} />
          <Text style={{ ...typography.h3, color: colors.textPrimary }}>Plan Selected</Text>
        </View>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            marginTop: spacing.sm,
            textTransform: 'capitalize',
          }}
        >
          {plan}
        </Text>
      </View>

      {/* Stripe placeholder */}
      <View
        style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.lg,
          padding: spacing.xl,
          alignItems: 'center',
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: colors.border,
          borderStyle: 'dashed',
        }}
      >
        <Icon name="lock-outline" size={48} color={colors.textDisabled} />
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.md,
          }}
        >
          Payment method will be configured via Stripe
        </Text>
        <Text
          style={{
            ...typography.caption,
            color: colors.textDisabled,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
        >
          Secure payment processing is coming soon. For now, tap Subscribe to activate your plan.
        </Text>
      </View>

      {error && (
        <View
          style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        onPress={handleSubscribe}
        disabled={subscribing}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          alignItems: 'center',
          opacity: subscribing ? 0.6 : 1,
        }}
        activeOpacity={0.8}
      >
        {subscribing ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={{ ...typography.button, color: colors.onPrimary }}>Subscribe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
