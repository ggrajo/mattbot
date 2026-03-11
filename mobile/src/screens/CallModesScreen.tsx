import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'CallModes'>;

const ACCESS_OPTIONS = [
  { key: 'everyone', label: 'Everyone', description: 'All incoming calls are handled by your AI', icon: 'earth' },
  { key: 'contacts', label: 'Contacts Only', description: 'Only known contacts get through', icon: 'account-group-outline' },
  { key: 'vip', label: 'VIP Only', description: 'Only VIP contacts get through', icon: 'star-outline' },
];

export function CallModesScreen({ route }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const isDark = theme.dark;
  const navigation = useNavigation();
  const onboarding = route.params?.onboarding;

  const [accessControl, setAccessControl] = useState('everyone');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/call-modes')
        .then((res) => {
          if (!active) return;
          const d = res.data;
          setAccessControl(d.access_control ?? 'everyone');
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  function patchModes(changes: Record<string, unknown>) {
    apiClient.patch('/call-modes', changes).catch((err) => {
      setError(extractApiError(err));
    });
  }

  function selectAccess(key: string) {
    setAccessControl(key);
    patchModes({ access_control: key });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {onboarding && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={{ ...typography.h2, color: colors.textPrimary }}>Call Handling</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
            Configure how your AI assistant handles incoming calls. You can change these anytime.
          </Text>
        </View>
      )}

      {/* AI Screening Info */}
      <View
        style={{
          marginTop: spacing.lg,
          marginHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: colors.primary + '12',
          borderRadius: radii.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.primary + '25',
          gap: spacing.sm,
        }}
      >
        <Icon name="shield-check-outline" size="md" color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: 2 }}>
            AI Call Screening is Always Active
          </Text>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
            Your AI assistant answers and screens all incoming calls, takes messages, and notifies you.
          </Text>
        </View>
      </View>

      {/* Who Can Reach You */}
      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg, gap: spacing.md }}>
        <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          Who Can Reach You
        </Text>

        {ACCESS_OPTIONS.map((opt) => {
          const selected = accessControl === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => selectAccess(opt.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: selected ? colors.primaryContainer : (isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
                borderRadius: radii.md,
                borderWidth: 2,
                borderColor: selected ? colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder),
                padding: spacing.lg,
                gap: spacing.md,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: selected ? colors.primary : colors.background,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={opt.icon} size="md" color={selected ? colors.onPrimary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>{opt.label}</Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>{opt.description}</Text>
              </View>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {selected && (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {onboarding && (
        <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg, gap: spacing.md }}>
          <TouchableOpacity
            onPress={async () => {
              try {
                await apiClient.post('/onboarding/complete-step', { step: 'call_modes_configured' });
                await apiClient.post('/onboarding/complete-step', { step: 'onboarding_complete' });
              } catch {}
              navigation.navigate('OnboardingComplete' as never);
            }}
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...typography.button, color: colors.onPrimary }}>Finish Setup</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
