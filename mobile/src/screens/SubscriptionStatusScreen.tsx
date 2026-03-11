import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import type { Theme } from '../theme/tokens';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function SubscriptionStatusScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const {
    plan,
    status,
    minutesIncluded,
    minutesUsed,
    minutesRemaining,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    loading,
    error,
    fetchStatus,
  } = useBillingStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const usagePercent =
    minutesIncluded > 0
      ? Math.min((minutesUsed / minutesIncluded) * 100, 100)
      : 0;

  const statusColor =
    status === 'active'
      ? theme.colors.success
      : status === 'canceled' || status === 'cancelled'
        ? theme.colors.error
        : theme.colors.warning;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Subscription</Text>

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

        {!loading && (
          <>
            <View style={styles.card}>
              <View style={styles.planRow}>
                <View>
                  <Text style={styles.planLabel}>Current Plan</Text>
                  <Text style={styles.planName}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>
                    {status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {cancelAtPeriodEnd && (
                <View style={styles.cancelNotice}>
                  <Text style={styles.cancelNoticeText}>
                    Cancels at end of period
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Usage This Period</Text>
              <View style={styles.usageStats}>
                <View style={styles.usageStat}>
                  <Text style={styles.usageValue}>{minutesUsed}</Text>
                  <Text style={styles.usageLabel}>Used</Text>
                </View>
                <View style={styles.usageDivider} />
                <View style={styles.usageStat}>
                  <Text style={styles.usageValue}>{minutesRemaining}</Text>
                  <Text style={styles.usageLabel}>Remaining</Text>
                </View>
                <View style={styles.usageDivider} />
                <View style={styles.usageStat}>
                  <Text style={styles.usageValue}>{minutesIncluded}</Text>
                  <Text style={styles.usageLabel}>Included</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${usagePercent}%` as any,
                      backgroundColor:
                        usagePercent > 80
                          ? theme.colors.error
                          : usagePercent > 50
                            ? theme.colors.warning
                            : theme.colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {usagePercent.toFixed(0)}% of minutes used
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Billing Period</Text>
              <Text style={styles.periodDate}>
                Ends {formatDate(currentPeriodEnd)}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ManageSubscription')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>Change Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonOutline}
                onPress={() => navigation.navigate('ManageSubscription')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonOutlineText}>
                  Cancel Subscription
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
      marginVertical: spacing.xxxl,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.card,
    },
    planRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    planName: {
      ...typography.h2,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
    },
    statusText: {
      ...typography.caption,
      color: colors.textInverse,
      fontWeight: '700',
    },
    cancelNotice: {
      backgroundColor: colors.warningContainer,
      padding: spacing.md,
      borderRadius: radii.md,
      marginTop: spacing.lg,
    },
    cancelNoticeText: {
      ...typography.bodySmall,
      color: colors.warning,
      fontWeight: '600',
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    usageStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: spacing.lg,
    },
    usageStat: {
      alignItems: 'center',
    },
    usageValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    usageLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    usageDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    progressTrack: {
      height: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: radii.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radii.full,
    },
    progressLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'right',
    },
    periodDate: {
      ...typography.body,
      color: colors.textPrimary,
    },
    actions: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    actionButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    actionButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    actionButtonOutline: {
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.error,
    },
    actionButtonOutlineText: {
      ...typography.button,
      color: colors.error,
    },
  });
}
