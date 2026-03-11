import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient, extractApiError } from '../api/client';

const CARD_WIDTH = 280;
const CARD_GAP = 16;

interface Plan {
  code: string;
  name: string;
  price_usd: string;
  description: string;
  features: string[];
  recommended?: boolean;
  included_minutes?: number;
}

function extractMinutes(plan: Plan): number | null {
  if (plan.included_minutes) return plan.included_minutes;
  for (const f of plan.features) {
    const match = f.match(/(\d+)\s*min/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function formatPrice(usd: string): { dollars: string; cents: string } {
  const num = parseFloat(usd);
  const whole = Math.floor(num);
  const frac = Math.round((num - whole) * 100);
  return {
    dollars: `$${whole}`,
    cents: frac > 0 ? `.${frac.toString().padStart(2, '0')}` : '',
  };
}

export function SubscriptionGateScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const screenWidth = Dimensions.get('window').width;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/billing/plans');
      setPlans(data.plans ?? data ?? []);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  function handleSelect(plan: Plan) {
    navigation.navigate('PaymentMethod', {
      plan: plan.code,
      source: 'onboarding',
    });
  }

  const horizontalPadding = (screenWidth - CARD_WIDTH) / 2;

  function renderPlanCard(plan: Plan) {
    const isRecommended = !!plan.recommended;
    const minutes = extractMinutes(plan);
    const { dollars, cents } = formatPrice(plan.price_usd);

    const cardContent = (
      <>
        {/* Badges row */}
        {isRecommended && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: radii.full,
                paddingHorizontal: spacing.sm + 2,
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ ...typography.caption, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 }}>
                MOST POPULAR
              </Text>
            </View>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: radii.full,
                paddingHorizontal: spacing.sm + 2,
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ ...typography.caption, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 }}>
                RESUBSCRIBE
              </Text>
            </View>
          </View>
        )}

        {/* Plan name */}
        <Text
          style={{
            ...typography.h2,
            color: isRecommended ? '#FFFFFF' : colors.textPrimary,
            marginBottom: spacing.xs,
          }}
        >
          {plan.name}
        </Text>

        {/* Description */}
        {plan.description ? (
          <Text
            style={{
              ...typography.bodySmall,
              color: isRecommended ? 'rgba(255,255,255,0.75)' : colors.textSecondary,
              marginBottom: spacing.lg,
            }}
          >
            {plan.description}
          </Text>
        ) : null}

        {/* Price row */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md }}>
          <Text
            style={{
              fontSize: 40,
              fontWeight: '800',
              color: isRecommended ? '#FFFFFF' : colors.primary,
              lineHeight: 48,
            }}
          >
            {dollars}
          </Text>
          {cents ? (
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: isRecommended ? 'rgba(255,255,255,0.8)' : colors.primary,
              }}
            >
              {cents}
            </Text>
          ) : null}
          <Text
            style={{
              ...typography.bodySmall,
              color: isRecommended ? 'rgba(255,255,255,0.6)' : colors.textSecondary,
              marginLeft: spacing.xs,
            }}
          >
            /mo
          </Text>
        </View>

        {/* Minutes badge */}
        {minutes != null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              backgroundColor: isRecommended ? 'rgba(255,255,255,0.15)' : colors.primary + '15',
              borderRadius: radii.full,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              alignSelf: 'flex-start',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="clock-outline" size="sm" color={isRecommended ? '#FFFFFF' : colors.primary} />
            <Text
              style={{
                ...typography.bodySmall,
                fontWeight: '600',
                color: isRecommended ? '#FFFFFF' : colors.primary,
              }}
            >
              {minutes} min
            </Text>
          </View>
        )}

        {/* Features */}
        {(plan.features ?? []).map((feature, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm }}
          >
            <Icon
              name="check-circle"
              size="sm"
              color={isRecommended ? 'rgba(255,255,255,0.8)' : colors.success}
            />
            <Text
              style={{
                ...typography.bodySmall,
                color: isRecommended ? 'rgba(255,255,255,0.85)' : colors.textPrimary,
                flex: 1,
              }}
            >
              {feature}
            </Text>
          </View>
        ))}

        {/* Select button */}
        <TouchableOpacity
          onPress={() => handleSelect(plan)}
          style={{
            backgroundColor: isRecommended ? '#FFFFFF' : colors.primary,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            marginTop: spacing.lg,
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              ...typography.button,
              color: isRecommended ? colors.primary : colors.onPrimary,
            }}
          >
            Select Plan
          </Text>
        </TouchableOpacity>
      </>
    );

    if (isRecommended) {
      return (
        <GradientView
          key={plan.code}
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: CARD_WIDTH,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginRight: CARD_GAP,
          }}
        >
          {cardContent}
        </GradientView>
      );
    }

    return (
      <View
        key={plan.code}
        style={{
          width: CARD_WIDTH,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginRight: CARD_GAP,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {cardContent}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <FadeIn delay={0} slide="up">
        <View style={{ alignItems: 'center', marginBottom: spacing.xxl, paddingHorizontal: spacing.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              backgroundColor: colors.primary + '18',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="rocket-launch-outline" size={36} color={colors.primary} />
          </View>
          <Text
            style={{
              ...typography.h1,
              color: colors.textPrimary,
              textAlign: 'center',
            }}
          >
            Upgrade Your Experience
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
          >
            Choose a plan to get started
          </Text>
        </View>
      </FadeIn>

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
      )}

      {error && (
        <View style={{ alignItems: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg }}>
          <Icon name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.sm }}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadPlans} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && plans.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
          <Icon name="tag-off-outline" size={48} color={colors.textDisabled} />
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
            No plans available right now
          </Text>
        </View>
      )}

      {/* Horizontal plan cards */}
      {!loading && plans.length > 0 && (
        <FadeIn delay={100} slide="up">
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="center"
            contentContainerStyle={{
              paddingLeft: horizontalPadding,
              paddingRight: horizontalPadding - CARD_GAP,
            }}
          >
            {plans.map((plan) => renderPlanCard(plan))}
          </ScrollView>
        </FadeIn>
      )}

      {!loading && (
        <TouchableOpacity
          onPress={() => {}}
          style={{ alignItems: 'center', marginTop: spacing.xxl }}
        >
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textDecorationLine: 'underline' }}>
            Restore Purchase
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
