import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient, extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetConfirm'>;

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

export function PasswordResetConfirmScreen({ route, navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { token } = route.params;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState('');

  function validate(): boolean {
    let hasError = false;

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      hasError = true;
    } else if (newPassword.length > MAX_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
      hasError = true;
    } else {
      setPasswordError(undefined);
    }

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
      hasError = true;
    } else {
      setConfirmError(undefined);
    }

    return !hasError;
  }

  async function handleSubmit() {
    setApiError(undefined);
    if (!validate()) return;

    hapticLight();
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/password/reset/confirm', {
        token,
        new_password: newPassword,
      });

      if (data?.requires_mfa) {
        setToast('Password updated. Please verify your identity.');
        hapticMedium();
        navigation.navigate('MfaVerify');
        return;
      }

      hapticMedium();
      setSuccess(true);
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <ScreenWrapper contentStyle={{ justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
        <FadeIn delay={0} slide="up">
          <View style={{ alignItems: 'center', gap: spacing.lg }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.success + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check-circle-outline" size="xl" color={colors.success} />
            </View>
            <Text
              style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
              allowFontScaling
            >
              Password Reset
            </Text>
            <Text
              style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
              allowFontScaling
            >
              Your password has been successfully updated. You can now sign in with your new password.
            </Text>
            <Button
              title="Go to Sign In"
              icon="login"
              onPress={() => {
                hapticLight();
                navigation.navigate('Login');
              }}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        </FadeIn>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type="info" visible={!!toast} onDismiss={() => setToast('')} />

      <FadeIn delay={0} slide="up">
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="lock-reset" size={36} color={colors.primary} />
          </View>
          <Text
            style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
            allowFontScaling
          >
            Set New Password
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
            allowFontScaling
          >
            Choose a strong password with at least {MIN_PASSWORD_LENGTH} characters.
          </Text>
        </View>
      </FadeIn>

      <View style={{ gap: spacing.sm }}>
        {apiError && (
          <FadeIn delay={0}>
            <ErrorMessage message={apiError} />
          </FadeIn>
        )}

        <FadeIn delay={60}>
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setPasswordError(undefined);
            }}
            error={passwordError}
            isPassword
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </FadeIn>

        <FadeIn delay={90}>
          <PasswordStrength password={newPassword} />
        </FadeIn>

        <FadeIn delay={120}>
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmError(undefined);
            }}
            error={confirmError}
            isPassword
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </FadeIn>

        <FadeIn delay={150}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: colors.primaryContainer ?? colors.primary + '10',
              borderRadius: radii.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Icon name="information-outline" size="sm" color={colors.primary} />
            <Text
              style={{ ...typography.caption, color: colors.primary, flex: 1 }}
              allowFontScaling
            >
              Use a mix of uppercase, lowercase, numbers, and symbols for a stronger password.
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={180}>
          <Button
            title="Reset Password"
            icon="lock-check-outline"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !newPassword || !confirmPassword}
          />
        </FadeIn>

        <FadeIn delay={210}>
          <Button
            title="Back to Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
          />
        </FadeIn>
      </View>
    </ScreenWrapper>
  );
}
