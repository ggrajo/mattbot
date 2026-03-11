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
import { login } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
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
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn delay={0}>
            <View style={styles.headerArea}>
              <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoText}>M</Text>
              </View>
              <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xs }]} allowFontScaling>
                Welcome back
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]} allowFontScaling>
                Sign in to your MattBot account
              </Text>
            </View>
          </FadeIn>

          {apiError && (
            <FadeIn duration={200}>
              <View style={{ marginBottom: spacing.lg }}>
                <ErrorMessage message={apiError} />
              </View>
            </FadeIn>
          )}

          <FadeIn delay={80}>
            <View style={{ gap: spacing.sm }}>
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

              <View style={styles.forgotRow}>
                <Button
                  title="Forgot password?"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  variant="ghost"
                />
              </View>

              <Button
                title="Sign In"
                onPress={handleLogin}
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
                title="Don't have an account? Register"
                onPress={() => navigation.navigate('Register')}
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
  headerArea: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
});
