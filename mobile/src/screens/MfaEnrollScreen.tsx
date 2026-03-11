import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { OtpInput } from '../components/ui/OtpInput';
import { Card } from '../components/ui/Card';
import { TotpQrCode } from '../components/auth/TotpQrCode';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { StatusScreen } from '../components/ui/StatusScreen';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { mfaTotpStart, mfaTotpConfirm } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, totpCodeSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MfaEnroll'>;

export function MfaEnrollScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
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
  }, [partialToken]);

  if (!partialToken && !totpSecret) {
    return (
      <ScreenWrapper>
        <StatusScreen
          icon="alert-circle-outline"
          title="Session expired"
          message="Your enrollment session has expired. Please sign in again to set up MFA."
          actionTitle="Back to Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </ScreenWrapper>
    );
  }

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
      setPendingTokens(data.access_token, data.refresh_token);
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
    <ScreenWrapper>
      <LoadingOverlay visible={initializing} message="Setting up authenticator..." />

      {/* Step indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.caption, color: colors.onPrimary, fontWeight: '700' }}>1</Text>
        </View>
        <View style={{ flex: 1, height: 2, backgroundColor: colors.primary, borderRadius: 1 }} />
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: code.length === 6 ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.caption, color: code.length === 6 ? colors.onPrimary : colors.textDisabled, fontWeight: '700' }}>2</Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="shield-lock-outline" size="lg" color={colors.primary} />
          <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
            Set up authenticator
          </Text>
        </View>
        <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
          MattBot requires two-factor authentication. Scan the QR code with an authenticator app like Google Authenticator or Authy.
        </Text>
      </View>

      {apiError && <ErrorMessage message={apiError} />}

      {totpSecret && totpQrUri && (
        <TotpQrCode
          uri={totpQrUri}
          secret={totpSecret}
          onCopySecret={handleCopySecret}
        />
      )}

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' }} allowFontScaling>
          Enter the 6-digit code from your authenticator
        </Text>
        <OtpInput
          value={code}
          onChange={(val) => {
            setCode(val);
            setCodeError(undefined);
          }}
          error={codeError}
          autoFocus={false}
        />
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <Button
          title="Verify & Continue"
          icon="shield-check-outline"
          onPress={handleConfirm}
          loading={loading}
          disabled={code.length !== 6}
        />
      </View>
    </ScreenWrapper>
  );
}
