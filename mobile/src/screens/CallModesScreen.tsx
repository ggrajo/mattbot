import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'CallModes'>;

interface CallMode {
  key: string;
  label: string;
  description: string;
  icon: string;
}

const MODES: CallMode[] = [
  { key: 'screen', label: 'Screen Calls', description: 'AI answers, takes a message, and notifies you', icon: 'phone-incoming' },
  { key: 'voicemail', label: 'Direct Voicemail', description: 'Send callers straight to voicemail', icon: 'voicemail' },
  { key: 'forward', label: 'Forward to Number', description: 'Forward calls to another phone number', icon: 'phone-forward' },
  { key: 'dnd', label: 'Do Not Disturb', description: 'Reject all calls silently', icon: 'minus-circle-outline' },
];

export function CallModesScreen({ route }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const onboarding = route.params?.onboarding;

  const [activeMode, setActiveMode] = useState('screen');
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
          setActiveMode(res.data.mode ?? 'screen');
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

  function handleSelectMode(key: string) {
    const prev = activeMode;
    setActiveMode(key);
    apiClient.patch('/call-modes', { mode: key }).catch((err) => {
      setActiveMode(prev);
      setError(extractApiError(err));
    });
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
          <Text style={{ ...typography.h2, color: colors.textPrimary }}>How should calls be handled?</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
            Choose a default call mode. You can change this anytime.
          </Text>
        </View>
      )}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: spacing.md }}>
        {MODES.map((mode) => {
          const selected = activeMode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              onPress={() => handleSelectMode(mode.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: selected ? colors.primaryContainer : colors.surface,
                borderRadius: radii.md,
                borderWidth: 2,
                borderColor: selected ? colors.primary : 'transparent',
                padding: spacing.lg,
                gap: spacing.md,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: selected ? colors.primary : colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name={mode.icon} size="md" color={selected ? colors.onPrimary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>{mode.label}</Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>{mode.description}</Text>
              </View>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
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
            onPress={() => navigation.navigate('ForwardingSetupGuide' as never)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.primary,
            }}
          >
            <Text style={{ ...typography.button, color: colors.primary }}>Set Up Forwarding</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                await apiClient.post('/onboarding/complete-step', { step: 'call_modes_configured' });
                await apiClient.post('/onboarding/complete-step', { step: 'onboarding_complete' });
              } catch {}
              navigation.navigate('TabRoot' as never);
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
