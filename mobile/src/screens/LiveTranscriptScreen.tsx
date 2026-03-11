import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveTranscript'>;

interface TranscriptEntry {
  role: string;
  text: string;
  time_seconds?: number;
}

export function LiveTranscriptScreen({ route }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/calls/${callId}/transcript`);
      const items: TranscriptEntry[] = res.turns ?? res.entries ?? res.items ?? [];
      setEntries(items);
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const isAi = (role: string) => ['agent', 'ai', 'assistant'].includes(role?.toLowerCase());

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable onPress={load} style={{ marginTop: spacing.md }}>
          <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md }}>Transcript</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40, gap: spacing.sm }}
      >
        {entries.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Icon name="text-box-outline" size={48} color={colors.textSecondary} />
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
              No transcript available
            </Text>
          </View>
        ) : (
          entries.map((entry, idx) => {
            const ai = isAi(entry.role);
            const timeLabel = entry.time_seconds != null
              ? `${Math.floor(entry.time_seconds / 60)}:${String(Math.floor(entry.time_seconds % 60)).padStart(2, '0')}`
              : undefined;
            return (
              <FadeIn key={idx} delay={idx * 30}>
                <View
                  style={{
                    backgroundColor: ai ? colors.primary + '12' : colors.surface,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: ai ? colors.primary + '25' : colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Icon
                      name={ai ? 'robot-outline' : 'account-outline'}
                      size={16}
                      color={ai ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={{
                        ...typography.caption,
                        fontWeight: '700',
                        color: ai ? colors.primary : colors.textSecondary,
                        marginLeft: spacing.xs,
                        flex: 1,
                      }}
                    >
                      {ai ? 'AI Assistant' : 'Caller'}
                    </Text>
                    {timeLabel && (
                      <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                        {timeLabel}
                      </Text>
                    )}
                  </View>
                  <Text style={{ ...typography.body, color: colors.textPrimary, lineHeight: 22 }}>
                    {entry.text}
                  </Text>
                </View>
              </FadeIn>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
