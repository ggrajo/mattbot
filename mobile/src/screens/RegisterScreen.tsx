import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { GradientView } from '../components/ui/GradientView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { Divider } from '../components/ui/Divider';
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FadeIn } from '../components/ui/FadeIn';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useSocialAuth } from '../hooks/useSocialAuth';
import { register } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const { width: SCREEN_W } = Dimensions.get('window');

export function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const insets = useSafeAreaInsets();
  const { setMfaEnrollment, setAuthenticated } = useAuthStore();
  const social = useSocialAuth();

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
      if (data.status === 'pending_verification') {
        navigation.navigate('EmailVerification', { email });
      } else if (data.requires_mfa_enrollment) {
        setMfaEnrollment(data.partial_token);
        navigation.navigate('MfaEnroll');
      } else if (data.access_token && data.refresh_token) {
        await setAuthenticated(data.access_token, data.refresh_token);
      }
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Ambient glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GradientView
          colors={[theme.dark ? 'rgba(167,139,250,0.10)' : 'rgba(167,139,250,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: -SCREEN_W * 0.2, left: -SCREEN_W * 0.2, width: SCREEN_W * 1.2, height: SCREEN_W, borderRadius: SCREEN_W * 0.5 }}
        />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <FadeIn delay={0} slide="up">
            <View style={{ marginBottom: spacing.xxl }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  overflow: 'hidden',
                  marginBottom: spacing.lg,
                }}
              >
                <GradientView
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="account-plus-outline" size={28} color="#FFFFFF" />
                </GradientView>
              </View>
              <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 }} allowFontScaling>
                Create account
              </Text>
              <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.xs }} allowFontScaling>
                Start securing your communications
              </Text>
            </View>
          </FadeIn>

          {apiError && <ErrorMessage message={apiError} />}

          <FadeIn delay={50}>
            <TextInput
              label="Email"
              leftIcon="email-outline"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </FadeIn>

          <FadeIn delay={100}>
            <TextInput
              label="Password"
              leftIcon="lock-outline"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <PasswordStrength password={password} />
          </FadeIn>

          <FadeIn delay={150}>
            <TextInput
              label="Confirm Password"
              leftIcon="lock-check-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={confirmError}
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </FadeIn>

          <FadeIn delay={200}>
            <Button title="Create Account" icon="account-plus-outline" onPress={handleRegister} loading={loading} />
          </FadeIn>

          <FadeIn delay={250}>
            <Divider label="or" />
          </FadeIn>

          {social.error && <ErrorMessage message={social.error} />}

          <FadeIn delay={300}>
            <SocialLoginButtons
              onGooglePress={async () => {
                const result = await social.signInWithGoogle();
                if (result === 'mfa_required') navigation.navigate('MfaVerify');
                else if (result === 'mfa_enrollment') navigation.navigate('MfaEnroll');
              }}
              onApplePress={async () => {
                const result = await social.signInWithApple();
                if (result === 'mfa_required') navigation.navigate('MfaVerify');
                else if (result === 'mfa_enrollment') navigation.navigate('MfaEnroll');
              }}
              loading={social.loading}
            />
          </FadeIn>

          <FadeIn delay={350}>
            <Button title="Already have an account? Sign In" onPress={() => navigation.navigate('Login')} variant="ghost" />
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
