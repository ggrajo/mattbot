import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetConfirm'>;

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

  async function handleSubmit() {
    let hasError = false;

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
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

    setApiError(undefined);
    if (hasError) return;

    setLoading(true);
    try {
      await apiClient.post('/auth/password/reset/confirm', {
        token,
        new_password: newPassword,
      });
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
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.success + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check-circle-outline" size="xl" color={colors.success} />
        </View>
        <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
          Password Reset
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }} allowFontScaling>
          Your password has been successfully updated. You can now sign in with your new password.
        </Text>
        <Button
          title="Go to Sign In"
          onPress={() => navigation.navigate('Login')}
          style={{ alignSelf: 'stretch' }}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ gap: spacing.lg }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          Set new password
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
          Choose a strong password for your account.
        </Text>

        {apiError && <ErrorMessage message={apiError} />}

        <TextInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          error={passwordError}
          isPassword
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <PasswordStrength password={newPassword} />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={confirmError}
          isPassword
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <Button title="Reset Password" onPress={handleSubmit} loading={loading} />

        <Button
          title="Back to Sign In"
          onPress={() => navigation.navigate('Login')}
          variant="ghost"
        />
      </View>
    </ScreenWrapper>
  );
}
