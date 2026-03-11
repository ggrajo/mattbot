import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { OtpInput } from '../components/ui/OtpInput';
import { TextInput } from '../components/ui/TextInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { StatusScreen } from '../components/ui/StatusScreen';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { mfaVerify } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, totpCodeSchema, recoveryCodeSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MfaVerify'>;

export function MfaVerifyScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { mfaChallengeToken, setAuthenticated, setMfaEnrollment } = useAuthStore();

  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (!mfaChallengeToken) {
    return (
      <ScreenWrapper>
        <StatusScreen
          icon="alert-circle-outline"
          title="Session expired"
          message="Your MFA session has expired. Please sign in again."
          actionTitle="Back to Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </ScreenWrapper>
    );
  }

  async function handleVerify() {
    const schema = mode === 'totp' ? totpCodeSchema : recoveryCodeSchema;
    const err = validateField(schema, code);
    setCodeError(err);
    setApiError(undefined);
    if (err) return;

    setLoading(true);
    try {
      const data = await mfaVerify(
        mfaChallengeToken,
        mode === 'totp' ? code : undefined,
        mode === 'recovery' ? code : undefined,
      );

      if (data.requires_mfa_enrollment && data.partial_token) {
        setMfaEnrollment(data.partial_token);
        navigation.navigate('MfaEnroll');
      } else {
        await setAuthenticated(data.access_token, data.refresh_token);
      }
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode(mode === 'totp' ? 'recovery' : 'totp');
    setCode('');
    setCodeError(undefined);
    setApiError(undefined);
  }

  return (
    <ScreenWrapper>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primary + '18',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="shield-lock-outline" size={32} color={colors.primary} />
        </View>
        <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
          Two-factor authentication
        </Text>
      </View>

      {/* Mode toggle */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.md,
          padding: 3,
          marginBottom: spacing.xl,
        }}
      >
        {(['totp', 'recovery'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => { if (mode !== m) toggleMode(); }}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radii.sm,
              backgroundColor: mode === m ? colors.surface : 'transparent',
              alignItems: 'center',
              ...(mode === m ? theme.shadows.card : {}),
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            accessibilityLabel={m === 'totp' ? 'Authenticator code' : 'Recovery code'}
          >
            <Text
              style={{
                ...typography.bodySmall,
                color: mode === m ? colors.textPrimary : colors.textSecondary,
                fontWeight: mode === m ? '600' : '400',
              }}
            >
              {m === 'totp' ? 'Authenticator' : 'Recovery code'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }}
        allowFontScaling
      >
        {mode === 'totp'
          ? 'Enter the 6-digit code from your authenticator app.'
          : 'Enter one of your recovery codes.'}
      </Text>

      {apiError && <ErrorMessage message={apiError} />}

      {mode === 'totp' ? (
        <View style={{ marginVertical: spacing.md }}>
          <OtpInput
            value={code}
            onChange={(val) => {
              setCode(val);
              setCodeError(undefined);
            }}
            error={codeError}
          />
        </View>
      ) : (
        <TextInput
          label="Recovery code"
          leftIcon="key-outline"
          value={code}
          onChangeText={(text) => {
            setCode(text);
            setCodeError(undefined);
          }}
          error={codeError}
          maxLength={9}
          autoCapitalize="characters"
          autoComplete="one-time-code"
        />
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          title="Verify"
          icon="check-circle-outline"
          onPress={handleVerify}
          loading={loading}
        />
      </View>
    </ScreenWrapper>
  );
}
