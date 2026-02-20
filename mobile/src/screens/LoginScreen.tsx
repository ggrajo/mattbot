import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { login } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { setAuthenticated, setMfaRequired, setMfaEnrollment } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const eErr = validateField(emailSchema, email);
    const pErr = validateField(passwordSchema, password);

    setEmailError(eErr);
    setPasswordError(pErr);
    setApiError(undefined);

    if (eErr || pErr) return;

    setLoading(true);
    try {
      const data = await login(email, password);

      if (data.next_step === 'mfa_required') {
        setMfaRequired(data.mfa_challenge_token);
        navigation.navigate('MfaVerify');
      } else if (data.next_step === 'mfa_enrollment') {
        setMfaEnrollment(data.partial_token);
        navigation.navigate('MfaEnroll');
      } else if (data.access_token) {
        await setAuthenticated(data.access_token, data.refresh_token);
      }
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
            Welcome back
          </Text>

          {apiError && <ErrorMessage message={apiError} />}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            isPassword
            autoComplete="current-password"
            textContentType="password"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
          />

          <Button
            title="Forgot password?"
            onPress={() => navigation.navigate('ForgotPassword')}
            variant="ghost"
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              marginVertical: spacing.md,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <SocialLoginButtons
            onGooglePress={() => { /* Google Sign-In flow placeholder */ }}
            onApplePress={() => { /* Apple Sign-In flow placeholder */ }}
          />

          <Button
            title="Don't have an account? Register"
            onPress={() => navigation.navigate('Register')}
            variant="ghost"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
