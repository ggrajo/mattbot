import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
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
  phone_number: string;
  status: string;
}

export function NumberProvisionScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isOnboarding = route.params?.onboarding;

  const [existingNumber, setExistingNumber] = useState<UserNumber | null>(null);
  const [areaCode, setAreaCode] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNumbers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/numbers');
      const numbers: UserNumber[] = data.numbers ?? data ?? [];
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
    if (!areaCode.trim()) {
      Alert.alert('Area Code Required', 'Please enter a preferred area code.');
      return;
    }
    try {
      setProvisioning(true);
      setError(null);
      const { data } = await apiClient.post('/numbers/provision', {
        area_code: areaCode.trim(),
      });
      setProvisionedNumber(data.phone_number ?? data.number);
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

  const displayNumber = provisionedNumber || existingNumber?.phone_number;

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

      {!loading && displayNumber && (
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

      {!loading && !displayNumber && (
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

          <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm }}>
            Preferred area code
          </Text>
          <TextInput
            value={areaCode}
            onChangeText={setAreaCode}
            placeholder="e.g. 415"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            maxLength={3}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.textPrimary,
              ...typography.h3,
              textAlign: 'center',
              letterSpacing: 4,
              marginBottom: spacing.xl,
            }}
          />

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

      {displayNumber && !loading && (
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
