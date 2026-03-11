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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Select the plan that works best for you
        </Text>

        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <View
              key={plan.id}
              style={[
                styles.card,
                plan.popular && styles.cardPopular,
                isCurrent && styles.cardCurrent,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
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
                  <Text style={styles.checkmark}>{'✓'}</Text>
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
                    ]}
                  >
                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    popularText: {
      ...typography.caption,
      color: colors.onPrimary,
      fontWeight: '600',
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
      fontSize: 36,
      fontWeight: '700',
      color: colors.textPrimary,
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
      paddingVertical: spacing.md,
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
    selectButtonTextDisabled: {
      color: colors.textDisabled,
    },
  });
}
