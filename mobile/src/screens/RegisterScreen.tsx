import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Icon } from '../components/ui/Icon';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { register, oauthGoogle } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(pw: string): { level: PasswordStrength; ratio: number } {
  if (!pw) return { level: 'weak', ratio: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 'weak', ratio: 0.25 };
  if (score === 2) return { level: 'fair', ratio: 0.5 };
  if (score === 3) return { level: 'good', ratio: 0.75 };
  return { level: 'strong', ratio: 1 };
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: '#EF4444',
  fair: '#F59E0B',
  good: '#0EA5E9',
  strong: '#10B981',
};

export function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { setAuthenticated, setMfaRequired, setMfaEnrollment } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  function handleLoginResponse(data: any) {
    if (data.requires_mfa) {
      setMfaRequired(data.mfa_challenge_token);
      navigation.navigate('MfaVerify');
    } else if (data.requires_mfa_enrollment) {
      setMfaEnrollment(data.partial_token);
      navigation.navigate('MfaEnroll');
    } else if (data.access_token) {
      setAuthenticated(data.access_token, data.refresh_token);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setApiError(undefined);
    setSuccessMessage(undefined);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token received from Google');

      const data = await oauthGoogle(idToken);
      handleLoginResponse(data);
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error?.code === statusCodes.IN_PROGRESS) return;
      setApiError(extractApiError(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleRegister() {
    const eErr = validateField(emailSchema, email);
    const pErr = validateField(passwordSchema, password);
    const cErr = password !== confirmPassword ? 'Passwords do not match' : undefined;

    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);
    setApiError(undefined);
    setSuccessMessage(undefined);

    if (eErr || pErr || cErr) return;

    setLoading(true);
    try {
      const data = await register(email, password);
      setSuccessMessage(data.message || 'Verification email sent! Please check your inbox.');
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={{ alignItems: 'center', paddingTop: spacing.lg, marginBottom: spacing.xl }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.full,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Icon name="account-plus-outline" size="xl" color={colors.primary} />
        </View>
        <Text style={{ ...typography.h1, color: colors.textPrimary }} allowFontScaling>
          Create your account
        </Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.textSecondary,
            marginTop: spacing.xs,
          }}
          allowFontScaling
        >
          Join MattBot and start collaborating
        </Text>
      </Animated.View>

      {apiError && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: spacing.md }}>
          <ErrorMessage message={apiError} />
        </Animated.View>
      )}

      {successMessage && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            backgroundColor: colors.successContainer ?? '#D1FAE5',
            borderRadius: radii.md,
            padding: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.full,
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size="md" color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ ...typography.bodySmall, fontWeight: '600', color: colors.success ?? '#10B981' }}
              allowFontScaling
            >
              Verification email sent
            </Text>
            <Text
              style={{ ...typography.caption, color: colors.success ?? '#10B981', marginTop: 2 }}
              allowFontScaling
            >
              {successMessage}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Form card */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <Card variant="elevated" style={{ gap: spacing.sm }}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            leftIcon="email-outline"
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
            leftIcon="lock-outline"
            isPassword
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {/* Password strength indicator */}
          {password.length > 0 && (
            <View style={{ marginTop: -spacing.sm, marginBottom: spacing.sm }}>
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: radii.full,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${strength.ratio * 100}%`,
                    backgroundColor: STRENGTH_COLORS[strength.level],
                    borderRadius: radii.full,
                  }}
                />
              </View>
              <Text
                style={{
                  ...typography.caption,
                  color: STRENGTH_COLORS[strength.level],
                  marginTop: spacing.xs,
                  textTransform: 'capitalize',
                }}
                allowFontScaling
              >
                {strength.level} password
              </Text>
            </View>
          )}

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
            leftIcon="lock-check-outline"
            isPassword
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={!!successMessage}
            icon="account-check-outline"
          />
        </Card>
      </Animated.View>

      {/* Terms */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <Text
          style={{
            ...typography.caption,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.lg,
            lineHeight: 18,
          }}
          allowFontScaling
        >
          By creating an account, you agree to our{' '}
          <Text style={{ color: colors.primary, fontWeight: '500' }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: colors.primary, fontWeight: '500' }}>Privacy Policy</Text>
        </Text>
      </Animated.View>

      {/* Divider */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(350)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          marginVertical: spacing.xl,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
          or continue with
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </Animated.View>

      {/* Social login */}
      <Animated.View entering={FadeInDown.duration(400).delay(450)}>
        <SocialLoginButtons
          onGooglePress={handleGoogleSignIn}
          onApplePress={() => { /* Apple Sign-In — iOS only, implement later */ }}
          loading={googleLoading}
        />
      </Animated.View>

      {/* Footer nav */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(550)}
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: spacing.xxl,
          paddingBottom: spacing.lg,
        }}
      >
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
          Already have an account?{' '}
        </Text>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.primary,
              fontWeight: '600',
            }}
            allowFontScaling
          >
            Sign In
          </Text>
        </Pressable>
      </Animated.View>
    </ScreenWrapper>
  );
}
