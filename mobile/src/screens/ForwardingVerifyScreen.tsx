import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'failed';

export function ForwardingVerifyScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [status, setStatus] = useState<VerifyStatus>('idle');
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

  async function startVerification() {
    try {
      setStatus('verifying');
      setError(null);
      await apiClient.post('/forwarding/verify');
      startPolling();
    } catch (e) {
      setStatus('failed');
      setError(extractApiError(e));
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get('/forwarding/verify/status');
        if (data.status === 'verified' || data.status === 'success') {
          stopPolling();
          setStatus('success');
        } else if (data.status === 'failed') {
          stopPolling();
          setStatus('failed');
          setError(data.message ?? 'Verification failed. Please try again.');
        }
      } catch {
        stopPolling();
        setStatus('failed');
        setError('Could not check verification status.');
      }
    }, 3000);
  }

  function handleSuccess() {
    Alert.alert('Success', 'Call forwarding is verified!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  const iconName =
    status === 'success'
      ? 'check-circle'
      : status === 'failed'
        ? 'close-circle'
        : status === 'verifying'
          ? 'phone-sync-outline'
          : 'phone-check-outline';

  const iconColor =
    status === 'success'
      ? colors.success
      : status === 'failed'
        ? colors.error
        : colors.primary;

  const statusLabel =
    status === 'success'
      ? 'Verified!'
      : status === 'failed'
        ? 'Verification Failed'
        : status === 'verifying'
          ? 'Verifying...'
          : 'Ready to Verify';

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
        <Icon name="phone-check-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          Verify Forwarding
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radii.xxl,
            backgroundColor: iconColor + '18',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xl,
          }}
        >
          {status === 'verifying' ? (
            <ActivityIndicator size="large" color={iconColor} />
          ) : (
            <Icon name={iconName} size={48} color={iconColor} />
          )}
        </View>

        <Text style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}>
          {statusLabel}
        </Text>

        {status === 'verifying' && (
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
          >
            We're calling your number to verify forwarding is set up correctly. This may take a moment.
          </Text>
        )}

        {status === 'idle' && (
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
          >
            We'll place a test call to verify your call forwarding is working correctly.
          </Text>
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
              marginTop: spacing.lg,
              maxWidth: 320,
            }}
          >
            <Icon name="alert-circle-outline" size="md" color={colors.error} />
            <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
          </View>
        )}
      </View>

      {status === 'success' ? (
        <TouchableOpacity
          onPress={handleSuccess}
          style={{
            backgroundColor: colors.success,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.button, color: '#FFFFFF' }}>Continue</Text>
        </TouchableOpacity>
      ) : status === 'failed' ? (
        <TouchableOpacity
          onPress={startVerification}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.button, color: colors.onPrimary }}>Retry</Text>
        </TouchableOpacity>
      ) : status === 'idle' ? (
        <TouchableOpacity
          onPress={startVerification}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.button, color: colors.onPrimary }}>Start Verification</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
