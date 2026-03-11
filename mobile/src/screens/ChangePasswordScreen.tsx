import React, { useState } from 'react';
import {
  View,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';

const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!currentPassword.trim()) {
      next.current = 'Current password is required';
    }
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

    setLoading(true);
    try {
      await apiClient.post('/auth/password/change', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert(
        'Success',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
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
              Change Password
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
              Enter your current password and choose a new one.
            </Text>
          </FadeIn>

          <FadeIn delay={60}>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={(t) => {
                setCurrentPassword(t);
                if (errors.current) setErrors((e) => ({ ...e, current: undefined }));
              }}
              error={errors.current}
              isPassword
              placeholder="Enter current password"
              autoComplete="current-password"
            />
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
              title="Change Password"
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
