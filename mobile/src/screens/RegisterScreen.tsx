import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { register } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { setMfaEnrollment } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const eErr = validateField(emailSchema, email);
    const pErr = validateField(passwordSchema, password);
    const cErr = password !== confirmPassword ? 'Passwords do not match' : undefined;

    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    setApiError(undefined);

    if (eErr || pErr || cErr) return;

    setLoading(true);
    try {
      const data = await register(email, password);
      if (data.next_step === 'mfa_enrollment') {
        setMfaEnrollment(data.partial_token);
        navigation.navigate('MfaEnroll');
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
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn delay={0}>
            <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xs }]} allowFontScaling>
              Create your account
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]} allowFontScaling>
              Get started with MattBot in seconds
            </Text>
          </FadeIn>

          {apiError && (
            <FadeIn duration={200}>
              <View style={{ marginBottom: spacing.lg }}>
                <ErrorMessage message={apiError} />
              </View>
            </FadeIn>
          )}

          <FadeIn delay={80}>
            <View style={{ gap: spacing.lg }}>
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
                autoComplete="new-password"
                textContentType="newPassword"
              />

              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={confirmError}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
              />

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
              />
            </View>
          </FadeIn>

          <FadeIn delay={160}>
            <View style={[styles.dividerRow, { marginVertical: spacing.xl }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, paddingHorizontal: spacing.md }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <SocialLoginButtons
              onGooglePress={() => {}}
              onApplePress={() => {}}
            />

            <View style={{ marginTop: spacing.xl }}>
              <Button
                title="Already have an account? Sign In"
                onPress={() => navigation.navigate('Login')}
                variant="ghost"
              />
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
});
