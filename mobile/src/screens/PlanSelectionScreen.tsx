import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import type { Theme } from '../theme/tokens';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    minutes: 10,
    features: ['10 AI minutes/month', 'Basic call screening', 'Single number'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$20',
    period: '/month',
    minutes: 100,
    features: [
      '100 AI minutes/month',
      'Advanced call screening',
      'Call forwarding',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$50',
    period: '/month',
    minutes: 400,
    features: [
      '400 AI minutes/month',
      'All Standard features',
      'Custom AI persona',
      'Analytics dashboard',
      'Dedicated support',
    ],
  },
];

export function PlanSelectionScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { plan: currentPlan, loading, subscribe } = useBillingStore();

  async function handleSelect(planId: string) {
    if (planId === currentPlan) return;
    try {
      await subscribe(planId);
      Alert.alert('Success', `Subscribed to ${planId} plan.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to subscribe. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn delay={0}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Select the plan that works best for you
          </Text>
        </FadeIn>

        {PLANS.map((plan, index) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <FadeIn key={plan.id} delay={100 + index * 80}>
              <View
                style={[
                  styles.card,
                  plan.popular && styles.cardPopular,
                  isCurrent && styles.cardCurrent,
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularStar}>⭐</Text>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentText}>Current Plan</Text>
                  </View>
                )}
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>{plan.period}</Text>
                </View>
                <Text style={styles.minutesLabel}>
                  {plan.minutes} minutes included
                </Text>

                <View style={styles.divider} />

                {plan.features.map((feat) => (
                  <View key={feat} style={styles.featureRow}>
                    <Text style={styles.checkmark}>✓</Text>
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isCurrent && styles.selectButtonDisabled,
                    plan.popular && !isCurrent && styles.selectButtonPopular,
                  ]}
                  onPress={() => handleSelect(plan.id)}
                  disabled={loading || isCurrent}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.onPrimary}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.selectButtonText,
                        isCurrent && styles.selectButtonTextDisabled,
                        plan.popular && !isCurrent && styles.selectButtonTextPopular,
                      ]}
                    >
                      {isCurrent ? 'Current Plan' : 'Select Plan'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </FadeIn>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardPopular: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    cardCurrent: {
      borderColor: colors.success,
      borderWidth: 2,
    },
    popularBadge: {
      backgroundColor: colors.primary,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    popularStar: {
      fontSize: 12,
    },
    popularText: {
      ...typography.caption,
      color: colors.onPrimary,
      fontWeight: '700',
    },
    currentBadge: {
      backgroundColor: colors.successContainer,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    currentText: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '700',
    },
    planName: {
      ...typography.h2,
      color: colors.textPrimary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: spacing.xs,
    },
    price: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    period: {
      ...typography.body,
      color: colors.textSecondary,
      marginLeft: spacing.xs,
    },
    minutesLabel: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    checkmark: {
      color: colors.success,
      fontSize: 16,
      fontWeight: '700',
      marginRight: spacing.sm,
    },
    featureText: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    selectButton: {
      marginTop: spacing.lg,
      backgroundColor: colors.secondaryContainer,
      paddingVertical: 14,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    selectButtonPopular: {
      backgroundColor: colors.primary,
    },
    selectButtonDisabled: {
      backgroundColor: colors.surfaceVariant,
    },
    selectButtonText: {
      ...typography.button,
      color: colors.secondary,
    },
    selectButtonTextPopular: {
      color: colors.onPrimary,
    },
    selectButtonTextDisabled: {
      color: colors.textDisabled,
    },
  });
}
