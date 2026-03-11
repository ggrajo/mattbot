import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { stepUp } from '../../api/auth';
import { extractApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface StepUpPromptProps {
  visible: boolean;
  onSuccess: (stepUpToken: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export function StepUpPrompt({
  visible,
  onSuccess,
  onCancel,
  title = 'Verify your identity',
  message = 'Enter your password to continue.',
}: StepUpPromptProps) {
  const { colors, spacing, typography, radii } = useTheme();
  const hasPassword = useAuthStore((s) => s.hasPassword);

  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [useTotp, setUseTotp] = useState(!hasPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setPassword('');
    setTotpCode('');
    setError('');
    setLoading(false);
    setUseTotp(!hasPassword);
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const data = await stepUp(
        useTotp ? undefined : password,
        useTotp ? totpCode : undefined,
      );
      reset();
      onSuccess(data.step_up_token);
    } catch (err) {
      setError(extractApiError(err) || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  const canSubmit = useTotp ? totpCode.length >= 6 : password.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View
          style={{
            width: '85%',
            maxWidth: 360,
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.xl,
          }}
        >
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>
            {title}
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg }}>
            {useTotp ? 'Enter your TOTP code to continue.' : message}
          </Text>

          {error ? (
            <Text style={{ ...typography.bodySmall, color: colors.error, marginBottom: spacing.md }}>
              {error}
            </Text>
          ) : null}

          {useTotp ? (
            <TextInput
              value={totpCode}
              onChangeText={(v) => setTotpCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="6-digit code"
              placeholderTextColor={colors.textDisabled}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.background,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                textAlign: 'center',
                letterSpacing: 4,
              }}
            />
          ) : (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
              autoFocus
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.background,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            />
          )}

          {hasPassword && (
            <TouchableOpacity
              onPress={() => { setUseTotp(!useTotp); setError(''); }}
              style={{ marginTop: spacing.sm, alignSelf: 'center' }}
            >
              <Text style={{ ...typography.bodySmall, color: colors.primary }}>
                {useTotp ? 'Use password instead' : 'Use TOTP code instead'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flex: 1,
                borderRadius: radii.md,
                paddingVertical: spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ ...typography.button, color: colors.textPrimary }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              style={{
                flex: 1,
                borderRadius: radii.md,
                paddingVertical: spacing.md,
                alignItems: 'center',
                backgroundColor: canSubmit ? colors.primary : colors.border,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={{ ...typography.button, color: canSubmit ? colors.onPrimary : colors.textDisabled }}>
                  Verify
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
