import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CardField, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethod'>;

export function PaymentMethodScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { confirmSetupIntent } = useConfirmSetupIntent();

  const {
    plan,
    planName,
    priceUsd,
    minutesIncluded,
    description,
    icon: planIcon,
    features = [],
    billingProvider,
    source,
  } = route.params;

  const isStripe = billingProvider === 'stripe';

  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const displayName = planName || plan.charAt(0).toUpperCase() + plan.slice(1);
  const price = priceUsd ? parseFloat(priceUsd) : 0;
  const isFree = price === 0;

  async function handleSubscribe() {
    try {
      setSubscribing(true);
      setError(null);

      let paymentMethodId = '';

      if (isStripe && !isFree) {
        const intentRes = await apiClient.post('/billing/setup-intent');
        const { client_secret } = intentRes.data;

        const { setupIntent, error: stripeError } = await confirmSetupIntent(client_secret, {
          paymentMethodType: 'Card',
        });

        if (stripeError) {
          setError(stripeError.message);
          return;
        }

        paymentMethodId = setupIntent?.paymentMethod?.id ?? '';
        if (!paymentMethodId) {
          setError('Failed to process payment method. Please try again.');
          return;
        }
      }

      await apiClient.post('/billing/subscribe', {
        plan,
        payment_method_id: paymentMethodId || 'dev_placeholder',
      });

      if (source === 'onboarding') {
        try {
          await apiClient.post('/onboarding/complete-step', { step: 'plan_selected' });
          await apiClient.post('/onboarding/complete-step', { step: 'payment_method_added' });
        } catch {}
      }

      Alert.alert('Subscription Active', `You're now on the ${displayName} plan!`, [
        {
          text: 'Continue',
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

  const canSubscribe = isStripe ? (isFree || cardComplete) : true;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Plan Card */}
        <View
          style={{
            backgroundColor: colors.primaryContainer,
            borderRadius: radii.xl,
            padding: spacing.xl,
            borderWidth: 2,
            borderColor: colors.primary,
            marginBottom: spacing.xl,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                Selected Plan
              </Text>
              <Text style={{ ...typography.h1, color: colors.textPrimary, marginTop: spacing.xs }}>
                {displayName}
              </Text>
            </View>
            <View
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: colors.primary + '20',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name={planIcon || 'star-outline'} size="lg" color={colors.primary} />
            </View>
          </View>

          {description ? (
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
              {description}
            </Text>
          ) : null}

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg, opacity: 0.5 }} />

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: colors.textPrimary }}>
              {isFree ? 'Free' : `$${price.toFixed(0)}`}
            </Text>
            {!isFree && (
              <Text style={{ ...typography.body, color: colors.textSecondary }}>/month</Text>
            )}
          </View>

          {(minutesIncluded ?? 0) > 0 && (
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                marginTop: spacing.md,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                padding: spacing.md,
              }}
            >
              <Icon name="clock-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                {minutesIncluded} minutes
              </Text>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>included per month</Text>
            </View>
          )}
        </View>

        {features.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.xl,
              padding: spacing.lg,
              marginBottom: spacing.xl,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <Icon name="check-decagram-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                What's included
              </Text>
            </View>
            {features.map((feature, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.border + '30',
                }}
              >
                <View
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: colors.primary + '15',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="check-circle" size="sm" color={colors.primary} />
                </View>
                <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>{feature}</Text>
                <Icon name="check" size="sm" color={colors.success} />
              </View>
            ))}
          </View>
        )}

        {/* Payment Section */}
        {isStripe && !isFree ? (
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.xl,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <Icon name="credit-card-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                Payment Method
              </Text>
            </View>
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={{
                backgroundColor: colors.surface,
                textColor: colors.textPrimary,
                placeholderColor: colors.textDisabled,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                fontSize: 16,
              }}
              style={{ width: '100%', height: 50 }}
              onCardChange={(details) => {
                setCardComplete(details.complete);
                if (error) setError(null);
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
              <Icon name="shield-lock-outline" size="sm" color={colors.textDisabled} />
              <Text style={{ ...typography.caption, color: colors.textDisabled }}>
                Secured by Stripe. Your card info never touches our servers.
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="shield-lock-outline" size="lg" color={colors.textDisabled} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                {isFree
                  ? 'No payment required for the free plan. You can upgrade anytime.'
                  : 'Stripe payment integration coming soon. Tap below to activate your plan with a trial payment method.'}
              </Text>
            </View>
          </View>
        )}

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
      </ScrollView>

      {/* Subscribe Button */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={subscribing || !canSubscribe}
          style={{
            backgroundColor: canSubscribe ? colors.primary : colors.border,
            borderRadius: radii.lg,
            paddingVertical: spacing.md + 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            opacity: subscribing ? 0.6 : 1,
            minHeight: 52,
          }}
          activeOpacity={0.8}
        >
          {subscribing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Icon name="rocket-launch-outline" size="sm" color={canSubscribe ? colors.onPrimary : colors.textDisabled} />
              <Text style={{ ...typography.button, color: canSubscribe ? colors.onPrimary : colors.textDisabled }}>
                {isFree ? 'Start Free Trial' : `Subscribe ΓÇö $${price.toFixed(0)}/mo`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
