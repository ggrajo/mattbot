import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useBillingStore } from '../store/billingStore';
import type { Theme } from '../theme/tokens';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0/mo', minutes: '10 min' },
  { id: 'standard', name: 'Standard', price: '$20/mo', minutes: '100 min' },
  { id: 'pro', name: 'Pro', price: '$50/mo', minutes: '400 min' },
];

export function ManageSubscriptionScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const {
    plan: currentPlan,
    status,
    loading,
    error,
    fetchStatus,
    changePlan,
    cancelSubscription,
  } = useBillingStore();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleChangePlan(planId: string) {
    if (planId === currentPlan) return;
    try {
      await changePlan(planId);
      Alert.alert('Plan Changed', `You are now on the ${planId} plan.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to change plan.');
    }
  }

  async function handleCancel(immediate: boolean) {
    setCancelModalVisible(false);
    try {
      await cancelSubscription(immediate);
      Alert.alert(
        'Subscription Cancelled',
        immediate
          ? 'Your subscription has been cancelled immediately.'
          : 'Your subscription will end at the current billing period.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to cancel subscription.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Manage Subscription</Text>
        <Text style={styles.subtitle}>
          Current plan:{' '}
          <Text style={styles.currentPlanHighlight}>
            {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          </Text>
        </Text>

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

        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, isCurrent && styles.planCardCurrent]}
              onPress={() => handleChangePlan(plan.id)}
              disabled={loading || isCurrent}
              activeOpacity={0.7}
            >
              <View style={styles.planCardHeader}>
                <Text style={styles.planCardName}>{plan.name}</Text>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              <View style={styles.planCardMeta}>
                <Text style={styles.planCardPrice}>{plan.price}</Text>
                <Text style={styles.planCardMinutes}>{plan.minutes}</Text>
              </View>
              {!isCurrent && (
                <Text style={styles.switchText}>
                  {PLANS.indexOf(plan) >
                  PLANS.findIndex((p) => p.id === currentPlan)
                    ? 'Upgrade'
                    : 'Downgrade'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {status === 'active' && currentPlan !== 'free' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setCancelModalVisible(true)}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Subscription?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to cancel? You can cancel at the end of
              your billing period or immediately.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonOutline}
                onPress={() => handleCancel(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonOutlineText}>
                  End of Period
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonDestructive}
                onPress={() => handleCancel(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonDestructiveText}>
                  Cancel Now
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalDismiss}
              onPress={() => setCancelModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalDismissText}>Keep Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    currentPlanHighlight: {
      color: colors.primary,
      fontWeight: '700',
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
    planCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...shadows.card,
    },
    planCardCurrent: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    planCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    planCardName: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    currentBadge: {
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
    },
    currentBadgeText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
    },
    planCardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planCardPrice: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    planCardMinutes: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    switchText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
      marginTop: spacing.sm,
    },
    cancelButton: {
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.error,
    },
    cancelButtonText: {
      ...typography.button,
      color: colors.error,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.xl,
      width: '100%',
      ...shadows.modal,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalBody: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    modalButtonOutline: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.warning,
    },
    modalButtonOutlineText: {
      ...typography.button,
      color: colors.warning,
    },
    modalButtonDestructive: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      backgroundColor: colors.error,
    },
    modalButtonDestructiveText: {
      ...typography.button,
      color: colors.onError,
    },
    modalDismiss: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalDismissText: {
      ...typography.button,
      color: colors.primary,
    },
  });
}
