import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { StatusScreen } from '../components/ui/StatusScreen';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { confirmPasswordReset } from '../api/auth';
import { extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type RouteParams = RouteProp<RootStackParamList, 'PasswordResetConfirm'>;

export function PasswordResetConfirmScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();

  const token = route.params?.token ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  if (!token) {
    return (
      <ScreenWrapper>
        <StatusScreen
          icon="link-off"
          iconColor={colors.error}
          title="Invalid reset link"
          message="This password reset link is invalid or has expired. Please request a new one."
          action={{ title: 'Back to Sign In', onPress: () => navigation.navigate('Login' as never) }}
        />
      </ScreenWrapper>
    );
  }

  function validate(): boolean {
    const errors: { password?: string; confirm?: string } = {};
    if (password.length < 12) {
      errors.password = 'Password must be at least 12 characters';
    }
    if (password !== confirmPassword) {
      errors.confirm = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError(undefined);
    if (!validate()) return;

    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
    } catch (e) {
      setError(extractApiError(e) || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <ScreenWrapper>
        <StatusScreen
          icon="check-circle"
          iconColor={colors.success}
          title="Password Reset!"
          message="Your password has been successfully updated. You can now sign in with your new password."
          action={{ title: 'Go to Sign In', onPress: () => navigation.navigate('Login' as never) }}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          Set New Password
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
          Enter your new password below.
        </Text>
      </View>

      {error ? <ErrorMessage message={error} /> : null}

      <TextInput
        label="New Password"
        leftIcon="lock-outline"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setFieldErrors((prev) => ({ ...prev, password: undefined }));
        }}
        error={fieldErrors.password}
        isPassword
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
      />
      <PasswordStrength password={password} />

      <TextInput
        label="Confirm Password"
        leftIcon="lock-check-outline"
        value={confirmPassword}
        onChangeText={(t) => {
          setConfirmPassword(t);
          setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
        }}
        error={fieldErrors.confirm}
        isPassword
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
      />

      <View style={{ marginTop: spacing.md }}>
        <Button
          title="Reset Password"
          icon="lock-reset"
          onPress={handleSubmit}
          loading={loading}
        />
      </View>

      <Button
        title="Back to Sign In"
        onPress={() => navigation.navigate('Login' as never)}
        variant="ghost"
      />
    </ScreenWrapper>
  );
}
