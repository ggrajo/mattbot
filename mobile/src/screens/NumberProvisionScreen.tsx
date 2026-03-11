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
import { useTelephonyStore } from '../store/telephonyStore';
import { useBillingStore } from '../store/billingStore';
import type { Theme } from '../theme/tokens';

export function NumberProvisionScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const {
    numbers,
    loading: telLoading,
    error: telError,
    fetchNumbers,
    provisionNumber,
  } = useTelephonyStore();
  const {
    plan,
    status: billingStatus,
    loading: billingLoading,
    fetchStatus: fetchBillingStatus,
  } = useBillingStore();

  useEffect(() => {
    fetchNumbers();
    fetchBillingStatus();
  }, [fetchNumbers, fetchBillingStatus]);

  const hasActiveSubscription =
    (billingStatus === 'active' || plan === 'free') && plan !== 'none';
  const activeNumber = numbers.find(
    (n) => n.status === 'active' || n.status === 'provisioned',
  );
  const loading = telLoading || billingLoading;

  async function handleProvision() {
    try {
      await provisionNumber();
      Alert.alert('Success', 'Your AI number has been provisioned!');
    } catch {
      Alert.alert('Error', 'Failed to provision number. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {telError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{telError}</Text>
          </View>
        )}

        {loading && (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.loader}
          />
        )}

        {!loading && !hasActiveSubscription && (
          <View style={styles.gateContainer}>
            <Text style={styles.gateIcon}>{'🔒'}</Text>
            <Text style={styles.gateTitle}>Subscription Required</Text>
            <Text style={styles.gateSubtitle}>
              You need an active subscription to get an AI phone number.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('PlanSelection')}
              activeOpacity={0.7}
            >
              <Text style={styles.ctaButtonText}>Choose a Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && hasActiveSubscription && !activeNumber && (
          <View style={styles.provisionContainer}>
            <Text style={styles.heroIcon}>{'📞'}</Text>
            <Text style={styles.heroTitle}>Get Your AI Number</Text>
            <Text style={styles.heroSubtitle}>
              Provision a dedicated phone number for your AI assistant. Callers
              will reach MattBot when they dial this number.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleProvision}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onPrimary}
                />
              ) : (
                <Text style={styles.ctaButtonText}>Provision Number</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!loading && hasActiveSubscription && activeNumber && (
          <View style={styles.successContainer}>
            <View style={styles.successIconBg}>
              <Text style={styles.successIcon}>{'✓'}</Text>
            </View>
            <Text style={styles.successTitle}>Number Active</Text>
            <View style={styles.numberCard}>
              <Text style={styles.numberLabel}>Your AI Number</Text>
              <Text style={styles.numberValue}>{activeNumber.e164}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusActiveBadge}>
                <Text style={styles.statusActiveText}>
                  {activeNumber.status.toUpperCase()}
                </Text>
              </View>
            </View>
            {activeNumber.provisioned_at && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Provisioned</Text>
                <Text style={styles.statusValue}>
                  {new Date(activeNumber.provisioned_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('CallModes')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                Configure Call Modes
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
      marginVertical: spacing.xxxl,
    },
    gateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    gateIcon: {
      fontSize: 56,
      marginBottom: spacing.xl,
    },
    gateTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    gateSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    provisionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    heroIcon: {
      fontSize: 64,
      marginBottom: spacing.xl,
    },
    heroTitle: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    heroSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xxl,
      lineHeight: 24,
    },
    ctaButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxxl,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 52,
      justifyContent: 'center',
      width: '100%',
    },
    ctaButtonText: {
      ...typography.button,
      color: colors.onPrimary,
      fontSize: 18,
    },
    successContainer: {
      flex: 1,
      paddingTop: spacing.xxxl,
      alignItems: 'center',
    },
    successIconBg: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.successContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    successIcon: {
      fontSize: 32,
      color: colors.success,
      fontWeight: '700',
    },
    successTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginBottom: spacing.xl,
    },
    numberCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      width: '100%',
      alignItems: 'center',
      marginBottom: spacing.lg,
      ...shadows.card,
    },
    numberLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    numberValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
    },
    statusLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    statusValue: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    statusActiveBadge: {
      backgroundColor: colors.successContainer,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
    },
    statusActiveText: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '700',
    },
    secondaryButton: {
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      width: '100%',
      alignItems: 'center',
    },
    secondaryButtonText: {
      ...typography.button,
      color: colors.primary,
    },
  });
}
