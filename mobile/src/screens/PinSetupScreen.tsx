import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

export function PinSetupScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();

  const [pinSet, setPinSet] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/auth/pin/status')
        .then((res) => {
          if (!active) return;
          setPinSet(!!res.data.pin_set);
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  function handlePinChange(val: string) {
    const filtered = val.replace(/[^0-9]/g, '').slice(0, 6);
    if (step === 'enter') {
      setPin(filtered);
      if (filtered.length === 6) {
        setTimeout(() => setStep('confirm'), 100);
      }
    } else {
      setConfirmPin(filtered);
    }
  }

  async function handleSetup() {
    if (pin !== confirmPin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/auth/pin/setup', { pin });
      Alert.alert('Success', 'PIN has been set up.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDisablePin() {
    Alert.alert('Disable PIN', 'Are you sure you want to remove your PIN?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await apiClient.delete('/auth/pin');
            setPinSet(false);
            setPin('');
            setConfirmPin('');
            setStep('enter');
            Alert.alert('Done', 'PIN has been disabled.');
          } catch (err) {
            Alert.alert('Error', extractApiError(err));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  function renderDots(value: string) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginVertical: spacing.lg }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: i < value.length ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl, alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={{ padding: spacing.lg, width: '100%' }}>
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xxl, alignItems: 'center', paddingHorizontal: spacing.lg }}>
        <Icon name="dialpad" size="xl" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg }}>
          {pinSet ? 'PIN is Active' : step === 'enter' ? 'Create a PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
          {pinSet
            ? 'Your PIN is currently enabled for quick login.'
            : step === 'enter'
              ? 'Enter a 6-digit PIN for quick access.'
              : 'Re-enter your PIN to confirm.'}
        </Text>
      </View>

      {!pinSet && (
        <>
          {renderDots(step === 'enter' ? pin : confirmPin)}
          <TextInput
            value={step === 'enter' ? pin : confirmPin}
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
            }}
          />

          {step === 'confirm' && (
            <View style={{ marginTop: spacing.xl, width: '100%', paddingHorizontal: spacing.lg, gap: spacing.md }}>
              <TouchableOpacity
                onPress={handleSetup}
                disabled={confirmPin.length !== 6 || saving}
                style={{
                  backgroundColor: confirmPin.length === 6 ? colors.primary : colors.border,
                  borderRadius: radii.md,
                  paddingVertical: spacing.md,
                  alignItems: 'center',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={{ ...typography.button, color: confirmPin.length === 6 ? colors.onPrimary : colors.textDisabled }}>
                    Set PIN
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep('enter'); setPin(''); setConfirmPin(''); }}
                style={{ alignItems: 'center', paddingVertical: spacing.sm }}
              >
                <Text style={{ ...typography.body, color: colors.primary }}>Start Over</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {pinSet && (
        <View style={{ marginTop: spacing.xl, width: '100%', paddingHorizontal: spacing.lg }}>
          <TouchableOpacity
            onPress={handleDisablePin}
            disabled={saving}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.errorContainer,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              gap: spacing.sm,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Icon name="lock-off-outline" size="md" color={colors.error} />
            )}
            <Text style={{ ...typography.button, color: colors.error }}>Disable PIN</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
