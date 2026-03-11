import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { getPinDeviceId } from '../utils/secureStorage';

export function PinLoginScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const signOut = useAuthStore((s) => s.signOut);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePinChange(val: string) {
    const filtered = val.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(filtered);
    if (filtered.length === 6) {
      submitPin(filtered);
    }
  }

  async function submitPin(pinValue: string) {
    setLoading(true);
    setError('');
    try {
      const deviceId = await getPinDeviceId();
      if (!deviceId) {
        setError('Device not registered for PIN login. Please sign in with your password.');
        setLoading(false);
        return;
      }
      const res = await apiClient.post('/auth/pin/login', {
        device_id: deviceId,
        pin: pinValue,
      });
      await setAuthenticated(res.data.access_token, res.data.refresh_token);
    } catch (err) {
      setError(extractApiError(err));
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPin() {
    Alert.alert(
      'Forgot PIN?',
      'You will be signed out and will need to log in with your email and password.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <Icon name="lock-outline" size="xl" color={colors.primary} />
      <Text style={{ ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg }}>Enter PIN</Text>
      <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
        Enter your 6-digit PIN to unlock
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xl }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: i < pin.length ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>

      <TextInput
        value={pin}
        onChangeText={handlePinChange}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
        autoFocus
        style={{
          ...typography.h2,
          color: colors.textPrimary,
          textAlign: 'center',
          width: 200,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
          paddingVertical: spacing.sm,
          marginTop: spacing.lg,
        }}
      />

      {error ? (
        <Text style={{ ...typography.bodySmall, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text>
      ) : null}

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
      )}

      <TouchableOpacity onPress={handleForgotPin} style={{ marginTop: spacing.xxl }}>
        <Text style={{ ...typography.body, color: colors.primary }}>Forgot PIN?</Text>
      </TouchableOpacity>
    </View>
  );
}
