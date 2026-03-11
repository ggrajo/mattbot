import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NumberProvision'>;

interface UserNumber {
  id: string;
  e164: string;
  status: string;
}

export function NumberProvisionScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isOnboarding = route.params?.onboarding;

  const [existingNumber, setExistingNumber] = useState<UserNumber | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numberVisible, setNumberVisible] = useState(false);

  const loadNumbers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/numbers');
      const numbers: UserNumber[] = data.items ?? [];
      if (numbers.length > 0) {
        setExistingNumber(numbers[0]);
      }
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNumbers();
    }, [loadNumbers]),
  );

  async function handleProvision() {
    try {
      setProvisioning(true);
      setError(null);
      const { data } = await apiClient.post('/numbers/provision');
      setProvisionedNumber(data.e164);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setProvisioning(false);
    }
  }

  async function handleContinue() {
    if (isOnboarding) {
      try {
        await apiClient.post('/onboarding/complete-step', { step: 'number_provisioned' });
      } catch {}
      navigation.navigate('CallModes', { onboarding: true });
    } else {
      navigation.goBack();
    }
  }

  const fullNumber = provisionedNumber || existingNumber?.e164;

  function maskNumber(num: string): string {
    if (num.length <= 4) return num;
    const last4 = num.slice(-4);
    const prefix = num.slice(0, num.length - 4);
    return prefix.replace(/\d/g, '\u2022') + last4;
  }

  const displayNumber = fullNumber
    ? (numberVisible ? fullNumber : maskNumber(fullNumber))
    : undefined;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Icon name="phone-plus-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          Your AI Number
        </Text>
      </View>

      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && !loading && !provisionedNumber && (
        <View
          style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
        </View>
      )}

      {!loading && fullNumber && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radii.xxl,
              backgroundColor: colors.successContainer,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.xl,
            }}
          >
            <Icon name="phone-check" size={48} color={colors.success} />
          </View>
          <Text style={{ ...typography.h3, color: colors.textSecondary, marginBottom: spacing.sm }}>
            {provisionedNumber ? 'Number Provisioned!' : 'Your Number'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              style={{
                ...typography.h1,
                color: colors.textPrimary,
                textAlign: 'center',
                letterSpacing: 1,
              }}
            >
              {displayNumber}
            </Text>
            <TouchableOpacity
              onPress={() => setNumberVisible(!numberVisible)}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={numberVisible ? 'eye-off-outline' : 'eye-outline'}
                size="md"
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {existingNumber && !provisionedNumber && (
            <View
              style={{
                backgroundColor: colors.primary + '20',
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                marginTop: spacing.md,
              }}
            >
              <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' }}>
                {existingNumber.status}
              </Text>
            </View>
          )}
        </View>
      )}

      {!loading && !fullNumber && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: radii.xxl,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Icon name="phone-plus-outline" size={40} color={colors.primary} />
            </View>
            <Text style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}>
              Get a Phone Number
            </Text>
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.textSecondary,
                textAlign: 'center',
                marginTop: spacing.sm,
              }}
            >
              We'll provision a dedicated number for your AI assistant
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleProvision}
            disabled={provisioning}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              opacity: provisioning ? 0.6 : 1,
            }}
            activeOpacity={0.8}
          >
            {provisioning ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ActivityIndicator color={colors.onPrimary} size="small" />
                <Text style={{ ...typography.button, color: colors.onPrimary }}>Provisioning...</Text>
              </View>
            ) : (
              <Text style={{ ...typography.button, color: colors.onPrimary }}>Get Number</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {fullNumber && !loading && (
        <TouchableOpacity
          onPress={handleContinue}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.button, color: colors.onPrimary }}>
            {isOnboarding ? 'Continue' : 'Done'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
