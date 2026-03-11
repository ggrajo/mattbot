import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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

type Props = NativeStackScreenProps<RootStackParamList, 'ForwardingSetupGuide'>;

interface SetupGuide {
  carrier?: string;
  steps: string[];
  notes?: string;
}

export function ForwardingSetupGuideScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isOnboarding = route.params?.onboarding;

  const [guide, setGuide] = useState<SetupGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGuide = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/forwarding/setup-guide');
      setGuide(data);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGuide();
    }, [loadGuide]),
  );

  function handleDone() {
    navigation.navigate('ForwardingVerify', { onboarding: isOnboarding });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Icon name="phone-forward-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>
          Set Up Call Forwarding
        </Text>
      </View>

      {loading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
      )}

      {error && !loading && (
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Icon name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.sm }}>
            {error}
          </Text>
          <TouchableOpacity onPress={loadGuide} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {guide && !loading && (
        <>
          {guide.carrier && (
            <View
              style={{
                backgroundColor: colors.primaryContainer,
                borderRadius: radii.md,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: spacing.lg,
              }}
            >
              <Icon name="sim-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}>
                Instructions for {guide.carrier}
              </Text>
            </View>
          )}

          {guide.steps.map((step, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.full,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ ...typography.bodySmall, color: colors.onPrimary, fontWeight: '700' }}>
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1, paddingTop: spacing.xs }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, lineHeight: 24 }}>
                  {step}
                </Text>
              </View>
            </View>
          ))}

          {guide.notes && (
            <View
              style={{
                backgroundColor: colors.warningContainer,
                borderRadius: radii.md,
                padding: spacing.md,
                flexDirection: 'row',
                gap: spacing.sm,
                marginTop: spacing.sm,
                marginBottom: spacing.xl,
              }}
            >
              <Icon name="information-outline" size="md" color={colors.warning} />
              <Text style={{ ...typography.bodySmall, color: colors.warning, flex: 1 }}>
                {guide.notes}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleDone}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              marginTop: spacing.lg,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ ...typography.button, color: colors.onPrimary }}>
              I've set up forwarding
            </Text>
          </TouchableOpacity>

          {isOnboarding && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ alignItems: 'center', marginTop: spacing.md }}
            >
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}
