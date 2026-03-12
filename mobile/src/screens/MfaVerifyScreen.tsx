import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { OtpInput } from '../components/ui/OtpInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Icon } from '../components/ui/Icon';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { mfaVerify } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, totpCodeSchema, recoveryCodeSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MfaVerify'>;

export function MfaVerifyScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { mfaChallengeToken, setAuthenticated, setMfaEnrollment } = useAuthStore();

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
      if (data.requires_mfa_enrollment && data.partial_token) {
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

  const isTotp = mode === 'totp';

  return (
    <ScreenWrapper>
      {/* Hero icon */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={{ alignItems: 'center', paddingTop: spacing.xxl, marginBottom: spacing.xl }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.full,
            backgroundColor: colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="shield-lock-outline" size={36} color={colors.primary} />
        </View>
        <Text style={{ ...typography.h1, color: colors.textPrimary }} allowFontScaling>
          Two-factor auth
        </Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.xs,
            maxWidth: 280,
          }}
          allowFontScaling
        >
          {isTotp
            ? 'Enter the 6-digit code from your authenticator app'
            : 'Enter one of your single-use recovery codes'}
        </Text>
      </Animated.View>

      {/* Tab-style toggle */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.md,
          padding: spacing.xs,
          marginBottom: spacing.lg,
        }}
      >
        <Pressable
          onPress={() => {
            setMode('totp');
            setCode('');
            setCodeError(undefined);
            setApiError(undefined);
          }}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radii.sm,
            backgroundColor: isTotp ? colors.surface : 'transparent',
            alignItems: 'center',
            ...(isTotp ? theme.shadows.card : {}),
          }}
        >
          <Text
            style={{
              ...typography.bodySmall,
              fontWeight: isTotp ? '600' : '400',
              color: isTotp ? colors.primary : colors.textSecondary,
            }}
            allowFontScaling
          >
            Authenticator
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode('recovery');
            setCode('');
            setCodeError(undefined);
            setApiError(undefined);
          }}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radii.sm,
            backgroundColor: !isTotp ? colors.surface : 'transparent',
            alignItems: 'center',
            ...(!isTotp ? theme.shadows.card : {}),
          }}
        >
          <Text
            style={{
              ...typography.bodySmall,
              fontWeight: !isTotp ? '600' : '400',
              color: !isTotp ? colors.primary : colors.textSecondary,
            }}
            allowFontScaling
          >
            Recovery Code
          </Text>
        </Pressable>
      </Animated.View>

      {apiError && (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: spacing.md }}>
          <ErrorMessage message={apiError} />
        </Animated.View>
      )}

      {/* Code input card */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <Card variant="elevated" style={{ gap: spacing.md }}>
          {isTotp ? (
            <View style={{ marginBottom: 0 }}>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: codeError ? colors.error : colors.textSecondary,
                  marginBottom: spacing.xs,
                  fontWeight: '500',
                }}
                allowFontScaling
              >
                Authenticator code
              </Text>
              <OtpInput
                value={code}
                onChange={(text) => {
                  setCode(text);
                  setCodeError(undefined);
                }}
                autoFocus
              />
              {codeError && (
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.error,
                    marginTop: spacing.xs,
                  }}
                  accessibilityRole="alert"
                >
                  {codeError}
                </Text>
              )}
            </View>
          ) : (
            <TextInput
              label="Recovery code"
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setCodeError(undefined);
              }}
              error={codeError}
              leftIcon="key-outline"
              keyboardType="default"
              maxLength={9}
              autoCapitalize="characters"
              autoComplete="one-time-code"
              containerStyle={{
                marginBottom: 0,
              }}
            />
          )}

          {isTotp && (
            <Text
              style={{
                ...typography.caption,
                color: colors.textSecondary,
                textAlign: 'center',
              }}
              allowFontScaling
            >
              Code refreshes every 30 seconds
            </Text>
          )}

          <Button
            title="Verify"
            onPress={handleVerify}
            loading={loading}
            icon="check-circle-outline"
          />
        </Card>
      </Animated.View>

      {/* Help text */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(400)}
        style={{
          alignItems: 'center',
          marginTop: spacing.xxl,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="information-outline" size="sm" color={colors.textSecondary} />
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {isTotp
              ? 'Open your authenticator app to find the code'
              : 'Recovery codes were provided during MFA setup'}
          </Text>
        </View>
      </Animated.View>
    </ScreenWrapper>
  );
}
