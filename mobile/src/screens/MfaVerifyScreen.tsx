import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { mfaVerify } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, totpCodeSchema, recoveryCodeSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MfaVerify'>;

export function MfaVerifyScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { mfaChallengeToken, setAuthenticated } = useAuthStore();

  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    const schema = mode === 'totp' ? totpCodeSchema : recoveryCodeSchema;
    const err = validateField(schema, code);
    setCodeError(err);
    setApiError(undefined);
    if (err) return;

    setLoading(true);
    try {
      const data = await mfaVerify(
        mfaChallengeToken!,
        mode === 'totp' ? code : undefined,
        mode === 'recovery' ? code : undefined,
      );
      await setAuthenticated(data.access_token, data.refresh_token);
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
            Two-factor authentication
          </Text>
          <Text
            style={{ ...typography.body, color: colors.textSecondary }}
            allowFontScaling
          >
            {mode === 'totp'
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Enter one of your recovery codes.'}
          </Text>

          {apiError && <ErrorMessage message={apiError} />}

          <TextInput
            label={mode === 'totp' ? 'Authenticator code' : 'Recovery code'}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setCodeError(undefined);
            }}
            error={codeError}
            keyboardType={mode === 'totp' ? 'number-pad' : 'default'}
            maxLength={mode === 'totp' ? 6 : 9}
            autoCapitalize="characters"
            autoComplete="one-time-code"
          />

          <Button
            title="Verify"
            onPress={handleVerify}
            loading={loading}
          />

          <Button
            title={mode === 'totp' ? 'Use recovery code instead' : 'Use authenticator code instead'}
            onPress={() => {
              setMode(mode === 'totp' ? 'recovery' : 'totp');
              setCode('');
              setCodeError(undefined);
              setApiError(undefined);
            }}
            variant="ghost"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
