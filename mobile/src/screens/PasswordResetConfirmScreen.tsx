import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { TextInput } from '../components/ui/TextInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type RouteParams = RouteProp<RootStackParamList, 'PasswordResetConfirm'>;

export function PasswordResetConfirmScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();

  const token = route.params?.token ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  function validate(): boolean {
    const errors: { password?: string; confirm?: string } = {};
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
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
      await apiClient.post('/auth/password/reset/confirm', {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (e) {
      setError(extractApiError(e) || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.successContainer,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xl,
          }}
        >
          <Icon name="check-circle" size="xl" color={colors.success} />
        </View>
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Password Reset!
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.xxl,
          }}
          allowFontScaling
        >
          Your password has been successfully updated. You can now sign in with your new password.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login' as never)}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.lg,
            paddingVertical: spacing.md + 2,
            paddingHorizontal: spacing.xxl,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
          }}
        >
          <Text style={{ ...typography.button, color: colors.onPrimary }} allowFontScaling>
            Go to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: insets.bottom + spacing.lg,
      }}
    >
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          Set New Password
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
          Enter your new password below.
        </Text>
      </View>

      {error ? (
        <View style={{ marginBottom: spacing.md }}>
          <ErrorMessage message={error} />
        </View>
      ) : null}

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
      />

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
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.lg,
          paddingVertical: spacing.md + 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: loading ? 0.6 : 1,
          minHeight: 52,
          marginTop: spacing.md,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <>
            <Icon name="lock-reset" size="md" color={colors.onPrimary} />
            <Text style={{ ...typography.button, color: colors.onPrimary }} allowFontScaling>
              Reset Password
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login' as never)}
        style={{ paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm }}
      >
        <Text style={{ ...typography.body, color: colors.primary }} allowFontScaling>
          Back to Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}
