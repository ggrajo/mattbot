import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { telephonyApi, VerificationAttempt } from '../api/telephony';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

type VerifyStatus = 'idle' | 'pending' | 'passed' | 'failed';

export function ForwardingVerifyScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [attempt, setAttempt] = useState<VerificationAttempt | null>(null);
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    setStatus('idle');
    try {
      const { data } = await telephonyApi.startVerification();
      setAttempt(data);
      setStatus('pending');
      startPolling(data.attempt_id);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function startPolling(attemptId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await telephonyApi.checkVerification(attemptId);
        const s = (data as any).status ?? (data as any).verification_status;
        if (s === 'passed' || s === 'verified') {
          setStatus('passed');
          stopPolling();
        } else if (s === 'failed') {
          setStatus('failed');
          stopPolling();
        }
      } catch {
        // keep polling on transient errors
      }
    }, 3000);
  }

  async function handleComplete() {
    if (!attempt) return;
    setLoading(true);
    try {
      await telephonyApi.completeVerification(
        attempt.attempt_id,
        attempt.verification_code,
      );
      setStatus('passed');
      Alert.alert('Success', 'Forwarding verified successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const statusConfig: Record<
    VerifyStatus,
    { color: string; label: string; icon: string }
  > = {
    idle: {
      color: theme.colors.textSecondary,
      label: 'Ready',
      icon: '○',
    },
    pending: {
      color: theme.colors.warning,
      label: 'Waiting...',
      icon: '◌',
    },
    passed: {
      color: theme.colors.success,
      label: 'Verified',
      icon: '✓',
    },
    failed: {
      color: theme.colors.error,
      label: 'Failed',
      icon: '✕',
    },
  };

  const current = statusConfig[status];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Verify Forwarding</Text>
        <Text style={styles.subtitle}>
          Confirm that calls are being forwarded to your AI number
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={[styles.statusCircle, { borderColor: current.color }]}>
            <Text style={[styles.statusIcon, { color: current.color }]}>
              {current.icon}
            </Text>
          </View>
          <Text style={[styles.statusLabel, { color: current.color }]}>
            {current.label}
          </Text>
          {status === 'pending' && (
            <ActivityIndicator
              size="small"
              color={theme.colors.warning}
              style={styles.pollingIndicator}
            />
          )}
        </View>

        {attempt && status !== 'idle' && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailLabel}>Verification Code</Text>
            <Text style={styles.codeValue}>
              {attempt.verification_code}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.detailLabel}>Instructions</Text>
            <Text style={styles.instructionText}>
              {attempt.instructions}
            </Text>
          </View>
        )}

        {status === 'idle' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.onPrimary}
              />
            ) : (
              <Text style={styles.primaryButtonText}>
                Start Verification
              </Text>
            )}
          </TouchableOpacity>
        )}

        {status === 'pending' && (
          <View style={styles.pendingActions}>
            <Text style={styles.pendingHint}>
              Make a test call to your personal number now. The system will
              detect the forwarded call automatically.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleComplete}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                Complete Verification
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'failed' && (
          <View style={styles.failedActions}>
            <Text style={styles.failedHint}>
              Verification failed. Check your carrier forwarding settings and
              try again.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStart}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'passed' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
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
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xxl,
      alignItems: 'center',
      marginBottom: spacing.xl,
      ...shadows.card,
    },
    statusCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    statusIcon: {
      fontSize: 32,
      fontWeight: '700',
    },
    statusLabel: {
      ...typography.h3,
      fontWeight: '700',
    },
    pollingIndicator: {
      marginTop: spacing.md,
    },
    detailsCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      ...shadows.card,
    },
    detailLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    codeValue: {
      ...typography.mono,
      fontSize: 28,
      color: colors.primary,
      letterSpacing: 4,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    instructionText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    primaryButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    pendingActions: {
      gap: spacing.lg,
    },
    pendingHint: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    failedActions: {
      gap: spacing.lg,
    },
    failedHint: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
      lineHeight: 24,
    },
  });
}
