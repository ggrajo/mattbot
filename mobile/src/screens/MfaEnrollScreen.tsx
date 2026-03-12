import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { TotpQrCode } from '../components/auth/TotpQrCode';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { mfaTotpStart, mfaTotpConfirm } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, totpCodeSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MfaEnroll'>;

export function MfaEnrollScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { partialToken, totpSecret, totpQrUri, mfaSetupToken, setTotpSetup, setRecoveryCodes, setPendingTokens } = useAuthStore();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!totpSecret);

  useEffect(() => {
    if (!totpSecret && partialToken) {
      initializeTotp();
    }
  }, []);

  async function initializeTotp() {
    setInitializing(true);
    try {
      const data = await mfaTotpStart(partialToken!);
      setTotpSetup(data.secret, data.qr_uri, data.mfa_setup_token);
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setInitializing(false);
    }
  }

  async function handleConfirm() {
    const err = validateField(totpCodeSchema, code);
    setCodeError(err);
    setApiError(undefined);
    if (err) return;

    setLoading(true);
    try {
      const data = await mfaTotpConfirm(mfaSetupToken!, code);
      setRecoveryCodes(data.recovery_codes);
      if (data.access_token && data.refresh_token) {
        setPendingTokens(data.access_token, data.refresh_token);
      }
      navigation.replace('RecoveryCodes');
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  function handleCopySecret() {
    try {
      const { setString } = require('@react-native-clipboard/clipboard');
      setString(totpSecret || '');
      Alert.alert('Copied', 'Secret key copied to clipboard');
    } catch {
      Alert.alert('Manual copy', `Secret: ${totpSecret}`);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LoadingOverlay visible={initializing} message="Setting up authenticator..." />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
            Set up authenticator
          </Text>
          <Text
            style={{ ...typography.body, color: colors.textSecondary }}
            allowFontScaling
          >
            MattBot requires two-factor authentication for your security.
            Scan this code with an authenticator app like Google Authenticator or Authy.
          </Text>

          {apiError && <ErrorMessage message={apiError} />}

          {totpSecret && totpQrUri && (
            <TotpQrCode
              uri={totpQrUri}
              secret={totpSecret}
              onCopySecret={handleCopySecret}
            />
          )}

          <TextInput
            label="Enter 6-digit code"
            value={code}
            onChangeText={setCode}
            error={codeError}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />

          <Button
            title="Verify & Continue"
            onPress={handleConfirm}
            loading={loading}
            disabled={code.length !== 6}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
