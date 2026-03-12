import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { RecoveryCodeList } from '../components/auth/RecoveryCodeList';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecoveryCodes'>;

export function RecoveryCodesScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { recoveryCodes, activatePendingTokens } = useAuthStore();
  const [saved, setSaved] = useState(false);

  function handleCopyAll() {
    try {
      const { setString } = require('@react-native-clipboard/clipboard');
      setString((recoveryCodes || []).join('\n'));
      Alert.alert('Copied', 'All recovery codes copied to clipboard');
    } catch {
      Alert.alert('Recovery codes', (recoveryCodes || []).join('\n'));
    }
  }

  async function handleContinue() {
    if (!saved) {
      Alert.alert(
        'Save your codes',
        'Have you saved your recovery codes? You cannot view them again.',
        [
          { text: 'Go back', style: 'cancel' },
          {
            text: "Yes, I've saved them",
            onPress: () => {
              setSaved(true);
              proceedToLogin();
            },
          },
        ]
      );
      return;
    }
    proceedToLogin();
  }

  async function proceedToLogin() {
    await activatePendingTokens();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          Save your recovery codes
        </Text>

        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{ ...typography.bodySmall, color: colors.error, fontWeight: '600' }}
              allowFontScaling
            >
              Important
            </Text>
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary }}
              allowFontScaling
            >
              Each code can only be used once. Store them in a secure location like a
              password manager. You will not be able to see these codes again.
            </Text>
          </View>
        </Card>

        {recoveryCodes && (
          <RecoveryCodeList
            codes={recoveryCodes}
            onCopyAll={handleCopyAll}
          />
        )}

        <Button
          title="I've saved my codes — Continue"
          onPress={handleContinue}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
