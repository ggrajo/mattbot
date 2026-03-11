import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RecoveryCodeList } from '../components/auth/RecoveryCodeList';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecoveryCodes'>;

export function RecoveryCodesScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { recoveryCodes, activatePendingTokens } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activating, setActivating] = useState(false);

  if (!recoveryCodes || recoveryCodes.length === 0) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="alert-circle-outline" size="xl" color={colors.warning} />
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' }} allowFontScaling>
            No recovery codes
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }} allowFontScaling>
            Something went wrong. Please try setting up MFA again.
          </Text>
          <View style={{ marginTop: spacing.xl }}>
            <Button
              title="Go Back"
              variant="outline"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  function handleCopyAll() {
    try {
      const { setString } = require('@react-native-clipboard/clipboard');
      setString((recoveryCodes || []).join('\n'));
      Alert.alert('Copied', 'All recovery codes copied to clipboard');
    } catch {
      Alert.alert('Recovery codes', (recoveryCodes || []).join('\n'));
    }
  }

  function handleContinue() {
    setShowConfirm(true);
  }

  async function proceedToLogin() {
    setShowConfirm(false);
    setActivating(true);
    try {
      await activatePendingTokens();
    } catch {
      Alert.alert('Error', 'Failed to complete setup. Please try signing in again.');
    } finally {
      setActivating(false);
    }
  }

  return (
    <ScreenWrapper>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Icon name="key-chain" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          Recovery codes
        </Text>
      </View>

      <Card variant="flat" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Icon name="alert-outline" size="md" color={colors.warning} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              style={{ ...typography.bodySmall, color: colors.warning, fontWeight: '600' }}
              allowFontScaling
            >
              Save these codes now
            </Text>
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary }}
              allowFontScaling
            >
              Each code can only be used once. Store them in a secure location like a password manager. You won't be able to see these codes again.
            </Text>
          </View>
        </View>
      </Card>

      {recoveryCodes && (
        <RecoveryCodeList
          codes={recoveryCodes}
          onCopyAll={handleCopyAll}
        />
      )}

      <View style={{ marginTop: spacing.xl }}>
        <Button
          title="I've saved my codes ΓÇö Continue"
          icon="check-circle-outline"
          onPress={handleContinue}
          loading={activating}
        />
      </View>

      <ConfirmSheet
        visible={showConfirm}
        onDismiss={() => setShowConfirm(false)}
        icon="shield-check-outline"
        title="Codes saved?"
        message="Make sure you've stored your recovery codes somewhere safe. You won't be able to view them again."
        confirmLabel="Yes, I've saved them"
        cancelLabel="Go back"
        onConfirm={proceedToLogin}
      />
    </ScreenWrapper>
  );
}
