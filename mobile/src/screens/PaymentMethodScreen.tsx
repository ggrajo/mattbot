import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import type { Theme } from '../theme/tokens';

const IS_DEV = __DEV__;

export function PaymentMethodScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const {
    paymentMethod,
    paymentMethodPresent,
    loading,
    error,
    fetchStatus,
    attachPaymentMethod,
  } = useBillingStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleSimulateCard() {
    try {
      await attachPaymentMethod('pm_dev_test_card');
      Alert.alert('Success', 'Test card attached successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to attach test card.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Payment Method</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.loader}
          />
        )}

        {paymentMethodPresent && paymentMethod && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>Current Card</Text>
            <View style={styles.cardDetails}>
              <View style={styles.cardBrandBadge}>
                <Text style={styles.cardBrandText}>
                  {paymentMethod.brand.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardNumber}>
                {'•••• •••• •••• '}
                {paymentMethod.last4}
              </Text>
            </View>
            <Text style={styles.cardExpiry}>
              Expires {String(paymentMethod.exp_month).padStart(2, '0')}/
              {paymentMethod.exp_year}
            </Text>
          </View>
        )}

        {!paymentMethodPresent && !loading && (
          <View style={styles.noCard}>
            <Text style={styles.noCardIcon}>{'💳'}</Text>
            <Text style={styles.noCardTitle}>No Payment Method</Text>
            <Text style={styles.noCardSubtitle}>
              Add a card to subscribe to paid plans
            </Text>
          </View>
        )}

        {IS_DEV && (
          <View style={styles.devSection}>
            <View style={styles.devBadge}>
              <Text style={styles.devBadgeText}>Dev Mode</Text>
            </View>
            <Text style={styles.devHint}>
              In development, you can simulate adding a card without Stripe.
            </Text>
            <TouchableOpacity
              style={styles.devButton}
              onPress={handleSimulateCard}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.devButtonText}>Simulate Card</Text>
            </TouchableOpacity>
          </View>
        )}

        {!IS_DEV && !paymentMethodPresent && (
          <View style={styles.stripeSection}>
            <Text style={styles.stripePlaceholder}>
              Stripe card input will appear here once native SDK is configured.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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
    container: {
      flex: 1,
      padding: spacing.xl,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.xl,
    },
    errorBox: {
      backgroundColor: colors.errorContainer,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.lg,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
    },
    loader: {
      marginVertical: spacing.xl,
    },
    currentCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.card,
    },
    cardLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    cardDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    cardBrandBadge: {
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      marginRight: spacing.md,
    },
    cardBrandText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
    },
    cardNumber: {
      ...typography.h3,
      color: colors.textPrimary,
      letterSpacing: 1,
    },
    cardExpiry: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    noCard: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
    },
    noCardIcon: {
      fontSize: 48,
      marginBottom: spacing.lg,
    },
    noCardTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    noCardSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    devSection: {
      backgroundColor: colors.warningContainer,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    devBadge: {
      backgroundColor: colors.warning,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    devBadgeText: {
      ...typography.caption,
      color: colors.textInverse,
      fontWeight: '700',
    },
    devHint: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    devButton: {
      backgroundColor: colors.warning,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    devButtonText: {
      ...typography.button,
      color: colors.textInverse,
    },
    stripeSection: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      alignItems: 'center',
    },
    stripePlaceholder: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    backButton: {
      marginTop: 'auto' as any,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    backButtonText: {
      ...typography.button,
      color: colors.primary,
    },
  });
}
