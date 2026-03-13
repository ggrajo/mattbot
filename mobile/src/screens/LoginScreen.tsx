import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
import { login, oauthGoogle, pinLogin, refreshToken as refreshTokenApi } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema, passwordSchema } from '../utils/validation';
import { getSecureItem } from '../utils/secureStorage';
import { useBiometric } from '../hooks/useBiometric';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginMode = 'email' | 'pin';

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { setAuthenticated, setMfaRequired, setMfaEnrollment } = useAuthStore();
  const { available: biometricAvailable, biometryType, authenticate } = useBiometric();

  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [hasDevicePin, setHasDevicePin] = useState(false);
  const [storedDeviceId, setStoredDeviceId] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    checkPinAvailability();
  }, []);

  async function checkPinAvailability() {
    const email = await getSecureItem('mattbot_last_email');
    if (!email) return;
    setLastEmail(email);

    const pinDeviceId = await getSecureItem(`mattbot_pin_device_${email}`);
    if (pinDeviceId) {
      setStoredDeviceId(pinDeviceId);
      setHasDevicePin(true);
    }
  }

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

  const handlePinDigit = useCallback((digit: string) => {
    hapticLight();
    setPin(prev => {
      if (prev.length >= 6) return prev;
      const next = prev + digit;
      if (next.length === 6) {
        setTimeout(() => submitPin(next), 100);
      }
      return next;
    });
  }, [storedDeviceId]);

  const handlePinDelete = useCallback(() => {
    hapticLight();
    setPin(prev => prev.slice(0, -1));
  }, []);

  async function submitPin(pinValue: string) {
    if (!storedDeviceId) {
      setApiError('No device registered. Please sign in with email first.');
      return;
    }
    hapticMedium();
    setPinLoading(true);
    setApiError(undefined);
    try {
      const data = await pinLogin(storedDeviceId, pinValue);
      handleLoginResponse(data);
    } catch (error) {
      setApiError(extractApiError(error));
      setPin('');
    } finally {
      setPinLoading(false);
    }
  }

  async function handleBiometricLogin() {
    if (!lastEmail) return;
    hapticMedium();
    setApiError(undefined);
    const success = await authenticate('Authenticate to sign in');
    if (success) {
      const storedRefresh = await getSecureItem('refresh_token');
      if (storedRefresh) {
        try {
          const data = await refreshTokenApi(storedRefresh);
          if (data.access_token) {
            setAuthenticated(data.access_token, data.refresh_token);
            return;
          }
        } catch {
          setApiError('Session expired. Please sign in with email or PIN.');
        }
      } else {
        setApiError('No saved session. Please sign in with email or PIN first.');
      }
    }
  }

  const pinDots = Array.from({ length: 6 }, (_, i) => i < pin.length);
  const pinKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['bio', '0', 'del'],
  ];

  if (mode === 'pin') {
    return (
      <ScreenWrapper>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{ alignItems: 'center', paddingTop: spacing.xl, flex: 1 }}
        >
          <View
            style={{
              width: 56, height: 56, borderRadius: radii.full,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
            }}
          >
            <Icon name="lock-outline" size="xl" color={colors.primary} />
          </View>
          <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs }} allowFontScaling>
            Enter PIN
          </Text>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs }} allowFontScaling>
            Use your 6-digit PIN to sign in
          </Text>
          {lastEmail && (
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xl }} allowFontScaling>
              {lastEmail}
            </Text>
          )}

          {apiError && (
            <Animated.View entering={FadeInDown.duration(200)} style={{ marginBottom: spacing.md, paddingHorizontal: spacing.lg }}>
              <ErrorMessage message={apiError} />
            </Animated.View>
          )}

          {/* PIN dots */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl }}>
            {pinDots.map((filled, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(200).delay(i * 50)}
                style={{
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: filled ? colors.primary : 'transparent',
                  borderWidth: 2,
                  borderColor: filled ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          {/* PIN keypad */}
          <View style={{ gap: spacing.md, alignItems: 'center' }}>
            {pinKeys.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: spacing.lg }}>
                {row.map((key) => {
                  if (key === 'bio') {
                    if (!biometricAvailable) return <View key="bio" style={{ width: 72, height: 72 }} />;
                    const bioIcon = biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint';
                    return (
                      <TouchableOpacity
                        key="bio"
                        onPress={handleBiometricLogin}
                        style={{
                          width: 72, height: 72, borderRadius: 36,
                          backgroundColor: colors.primaryContainer + '60',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Sign in with biometrics"
                      >
                        <Icon name={bioIcon} size={28} color={colors.primary} />
                      </TouchableOpacity>
                    );
                  }
                  if (key === 'del') {
                    return (
                      <TouchableOpacity
                        key="del"
                        onPress={handlePinDelete}
                        onLongPress={() => { hapticLight(); setPin(''); }}
                        style={{
                          width: 72, height: 72, borderRadius: 36,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Delete last digit"
                      >
                        <Icon name="backspace-outline" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handlePinDigit(key)}
                      disabled={pinLoading}
                      style={{
                        width: 72, height: 72, borderRadius: 36,
                        backgroundColor: colors.surface,
                        borderWidth: 1, borderColor: colors.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      activeOpacity={0.7}
                      accessibilityLabel={`Digit ${key}`}
                    >
                      <Text style={{ ...typography.h2, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                        {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Switch to email */}
          <TouchableOpacity
            onPress={() => { setMode('email'); setApiError(undefined); setPin(''); }}
            style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
            activeOpacity={0.7}
          >
            <Icon name="email-outline" size={18} color={colors.primary} />
            <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }} allowFontScaling>
              Sign in with email instead
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScreenWrapper>
    );
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

      {/* Quick auth options (PIN + Biometric) */}
      {(hasDevicePin || (lastEmail && biometricAvailable)) && (
        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={{ marginBottom: spacing.lg }}>
          {lastEmail && (
            <Text style={{ ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm }} allowFontScaling>
              Welcome back, {lastEmail}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {hasDevicePin && (
              <TouchableOpacity
                onPress={() => { setMode('pin'); setApiError(undefined); }}
                activeOpacity={0.7}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: spacing.sm, paddingVertical: spacing.md,
                  borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
                accessibilityLabel="Sign in with PIN"
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: colors.primary + '14',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="dialpad" size={20} color={colors.primary} />
                </View>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                  Use PIN
                </Text>
              </TouchableOpacity>
            )}

            {lastEmail && biometricAvailable && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: spacing.sm, paddingVertical: spacing.md,
                  borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
                accessibilityLabel={`Sign in with ${biometryType === 'FaceID' ? 'Face ID' : 'fingerprint'}`}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: colors.success + '14',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon
                    name={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
                    size={20}
                    color={colors.success ?? '#22C55E'}
                  />
                </View>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                  {biometryType === 'FaceID' ? 'Face ID' : 'Fingerprint'}
                </Text>
              </TouchableOpacity>
            )}
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
