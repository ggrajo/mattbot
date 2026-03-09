import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { GradientView } from '../components/ui/GradientView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Divider } from '../components/ui/Divider';
import { SocialLoginButtons } from '../components/auth/SocialLoginButtons';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useSocialAuth } from '../hooks/useSocialAuth';
import { login } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { setAuthenticated, setMfaRequired, setMfaEnrollment } = useAuthStore();
  const social = useSocialAuth();

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

      if (data.requires_mfa) {
        setMfaRequired(data.mfa_challenge_token);
        navigation.navigate('MfaVerify');
      } else if (data.requires_mfa_enrollment) {
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
    <ScreenWrapper>
      {/* Decorative accent */}
      <View style={{ marginBottom: spacing.xxl }}>
        <GradientView
          colors={[colors.gradientStart + '20', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: -100,
            left: -50,
            width: 250,
            height: 250,
            borderRadius: 125,
          }}
        />
        <FadeIn delay={0} slide="up">
          <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
            <Text style={{ ...typography.h1, color: colors.textPrimary }} allowFontScaling>
              Welcome back
            </Text>
            <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
              Sign in to your account
            </Text>
          </View>
        </FadeIn>
      </View>

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
          autoComplete="current-password"
          textContentType="password"
        />
      </FadeIn>

      <FadeIn delay={150}>
        <Button
          title="Sign In"
          icon="login"
          onPress={handleLogin}
          loading={loading}
        />
      </FadeIn>

      <FadeIn delay={200}>
        <Button
          title="Forgot password?"
          onPress={() => navigation.navigate('ForgotPassword')}
          variant="ghost"
        />
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
        <Button
          title="Don't have an account? Register"
          onPress={() => navigation.navigate('Register')}
          variant="ghost"
        />
      </FadeIn>
    </ScreenWrapper>
  );
}
