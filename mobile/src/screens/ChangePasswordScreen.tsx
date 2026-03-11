import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

export function ChangePasswordScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validationError = (() => {
    if (!currentPassword) return '';
    if (newPassword.length > 0 && newPassword.length < 8) return 'New password must be at least 8 characters';
    if (confirmPassword.length > 0 && newPassword !== confirmPassword) return 'Passwords do not match';
    return '';
  })();

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/auth/password/change', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Your password has been changed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function renderPasswordField(
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    show: boolean,
    onToggleShow: () => void,
    placeholder: string,
  ) {
    return (
      <View>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textDisabled}
            secureTextEntry={!show}
            autoCapitalize="none"
            style={{
              ...typography.body,
              color: colors.textPrimary,
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            }}
          />
          <TouchableOpacity onPress={onToggleShow} style={{ paddingHorizontal: spacing.md }}>
            <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size="md" color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: spacing.lg }}>
        {renderPasswordField(
          'Current Password',
          currentPassword,
          setCurrentPassword,
          showCurrent,
          () => setShowCurrent((p) => !p),
          'Enter current password',
        )}
        {renderPasswordField(
          'New Password',
          newPassword,
          setNewPassword,
          showNew,
          () => setShowNew((p) => !p),
          'Enter new password (min 8 chars)',
        )}
        {renderPasswordField(
          'Confirm New Password',
          confirmPassword,
          setConfirmPassword,
          showConfirm,
          () => setShowConfirm((p) => !p),
          'Re-enter new password',
        )}

        {validationError ? (
          <Text style={{ ...typography.caption, color: colors.error }}>{validationError}</Text>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit || saving}
          style={{
            backgroundColor: canSubmit ? colors.primary : colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: canSubmit ? colors.onPrimary : colors.textDisabled }}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
