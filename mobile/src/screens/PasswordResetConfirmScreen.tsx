import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';

type PasswordResetConfirmParams = {
  PasswordResetConfirm: { token?: string; email?: string };
};

const MIN_PASSWORD_LENGTH = 8;

export function PasswordResetConfirmScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PasswordResetConfirmParams, 'PasswordResetConfirm'>>();
  const { token, email } = route.params ?? { token: '', email: '' };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ new?: string; confirm?: string }>({});

  function validate(): boolean {
    const next: { new?: string; confirm?: string } = {};
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.new = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (newPassword !== confirmPassword) {
      next.confirm = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (!token) {
      Alert.alert('Error', 'Invalid or expired reset link. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/password/reset/confirm', {
        token,
        new_password: newPassword,
      });
      Alert.alert(
        'Success',
        'Your password has been reset. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { padding: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn delay={0}>
            <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
              Set New Password
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
              Enter your new password below. Use at least {MIN_PASSWORD_LENGTH} characters. After
              saving, you'll be able to sign in with your new password.
            </Text>
          </FadeIn>

          <FadeIn delay={60}>
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (errors.new) setErrors((e) => ({ ...e, new: undefined }));
              }}
              error={errors.new}
              isPassword
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
              }}
              error={errors.confirm}
              isPassword
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </FadeIn>

          <FadeIn delay={120}>
            <Button
              title="Reset Password"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: spacing.lg }}
            />
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
  },
});
