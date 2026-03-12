import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { maskPhone } from '../store/telephonyStore';
import {
  listNumbers,
  provisionNumber,
  type ProvisionedNumber,
} from '../api/telephony';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NumberProvision'>;

export function NumberProvisionScreen({ route, navigation }: Props) {
  const isOnboarding = route.params?.onboarding ?? false;
  const { colors, spacing, typography, radii } = useTheme();
  const { completeStep } = useSettingsStore();

  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [existingNumber, setExistingNumber] = useState<ProvisionedNumber | null>(null);
  const [numberRevealed, setNumberRevealed] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const loadExistingNumbers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listNumbers();
      const active = (result.items ?? []).find((n) => n.status === 'active');
      setExistingNumber(active ?? null);
    } catch (e: unknown) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExistingNumbers();
    }, [loadExistingNumbers]),
  );

  async function handleProvision() {
    hapticMedium();
    setProvisioning(true);
    setError(null);
    try {
      const num = await provisionNumber();
      setExistingNumber(num);
      setToastType('success');
      setToast('Number provisioned successfully!');

      if (isOnboarding) {
        await completeStep('number_provisioned');
      }
    } catch (e: unknown) {
      setError(extractApiError(e));
    } finally {
      setProvisioning(false);
    }
  }

  function handleContinue() {
    hapticLight();
    if (isOnboarding) {
      navigation.navigate('ForwardingSetupGuide', { onboarding: true });
    } else {
      navigation.goBack();
    }
  }

  if (loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading numbers" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radii.xl,
            backgroundColor: existingNumber ? colors.success + '14' : colors.primary + '14',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Icon
            name={existingNumber ? 'check-circle' : 'phone-plus-outline'}
            size={36}
            color={existingNumber ? colors.success : colors.primary}
          />
        </View>
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          {existingNumber ? 'Your AI Number is Ready' : 'Provision a Number'}
        </Text>
        <Text
          style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
          allowFontScaling
        >
          {existingNumber
            ? 'Your dedicated AI phone number is active and ready to receive calls.'
            : 'Get a dedicated phone number for your AI assistant.'}
        </Text>
      </View>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadExistingNumbers} />
        </View>
      )}

      {existingNumber ? (
        <FadeIn>
          <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
            <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.success + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="phone-check-outline" size={28} color={colors.success} />
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setNumberRevealed((prev) => !prev);
                }}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                accessibilityLabel={numberRevealed ? 'Tap to hide number' : 'Tap to reveal number'}
              >
                <Text
                  style={{ ...typography.h3, color: colors.textPrimary, letterSpacing: 1 }}
                  allowFontScaling
                >
                  {numberRevealed ? existingNumber.e164 : maskPhone(existingNumber.e164)}
                </Text>
                <Icon
                  name={numberRevealed ? 'eye-off-outline' : 'eye-outline'}
                  size="sm"
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              <Text
                style={{ ...typography.caption, color: colors.success }}
                allowFontScaling
              >
                Active
              </Text>
            </View>
          </Card>
        </FadeIn>
      ) : (
        <>
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="map-marker-outline" size="md" color={colors.primary} />
                <Text
                  style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }}
                  allowFontScaling
                >
                  Area Code (Optional)
                </Text>
              </View>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary }}
                allowFontScaling
              >
                Enter a preferred area code, or leave blank for automatic assignment.
              </Text>
              <TextInput
                value={areaCode}
                onChangeText={(text) => setAreaCode(text.replace(/[^0-9]/g, '').slice(0, 3))}
                placeholder="e.g. 415"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                maxLength={3}
                style={{
                  ...typography.body,
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                accessibilityLabel="Area code input"
              />
            </View>
          </Card>

          <Button
            title="Provision Number"
            icon="phone-plus-outline"
            onPress={handleProvision}
            loading={provisioning}
            disabled={provisioning}
            accessibilityLabel="Provision a new AI phone number"
          />
        </>
      )}

      {existingNumber && (
        <Button
          title={isOnboarding ? 'Continue' : 'Done'}
          icon={isOnboarding ? 'arrow-right' : 'check'}
          onPress={handleContinue}
          accessibilityLabel={isOnboarding ? 'Continue to forwarding setup' : 'Go back'}
        />
      )}
    </ScreenWrapper>
  );
}
