import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { requestPasswordReset } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const eErr = validateField(emailSchema, email);
    setEmailError(eErr);
    setApiError(undefined);
    if (eErr) return;

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
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
            Reset password
          </Text>

          {apiError && <ErrorMessage message={apiError} />}

          {sent ? (
            <View style={{ gap: spacing.lg }}>
              <Text
                style={{ ...typography.body, color: colors.textSecondary }}
                allowFontScaling
              >
                If an account exists for {email}, you will receive a password reset link.
                Please check your email.
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => navigation.navigate('Login')}
                variant="outline"
              />
            </View>
          ) : (
            <>
              <Text
                style={{ ...typography.body, color: colors.textSecondary }}
                allowFontScaling
              >
                Enter your email address and we'll send you instructions to reset your password.
              </Text>

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Button title="Send Reset Link" onPress={handleSubmit} loading={loading} />

              <Button
                title="Back to Sign In"
                onPress={() => navigation.goBack()}
                variant="ghost"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
