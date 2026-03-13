import React, { useState, useEffect } from 'react';
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
import { login, oauthGoogle } from '../api/auth';
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
  const [googleLoading, setGoogleLoading] = useState(false);

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
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') return;

      const idToken = response.data?.idToken;
      if (!idToken) {
        setApiError('Google sign-in did not return credentials. Please try again.');
        return;
      }

      const data = await oauthGoogle(idToken);
      handleLoginResponse(data);
    } catch (error: any) {
      if (error?.code === statusCodes.IN_PROGRESS) return;
      setApiError(extractApiError(error));
    } finally {
      setGoogleLoading(false);
    }
  }

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
      handleLoginResponse(data);
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
          <Icon name="login-variant" size="xl" color={colors.primary} />
        </View>
        <Text style={{ ...typography.h1, color: colors.textPrimary }} allowFontScaling>
          Welcome back
        </Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.textSecondary,
            marginTop: spacing.xs,
          }}
          allowFontScaling
        >
          Sign in to continue to MattBot
        </Text>
      </Animated.View>

      {apiError && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: spacing.md }}>
          <ErrorMessage message={apiError} />
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
            autoComplete="current-password"
            textContentType="password"
          />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            style={{ alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.sm }}
          >
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.primary,
                fontWeight: '500',
              }}
              allowFontScaling
            >
              Forgot password?
            </Text>
          </Pressable>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            icon="arrow-right"
          />
        </Card>
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
          Don't have an account?{' '}
        </Text>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.primary,
              fontWeight: '600',
            }}
            allowFontScaling
          >
            Create one
          </Text>
        </Pressable>
      </Animated.View>
    </ScreenWrapper>
  );
}
