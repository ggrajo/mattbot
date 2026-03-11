import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient, extractApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CallDetail'>;

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function formatPlaybackTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getDirectionLabel(direction?: string, callType?: string): string {
  if (callType === 'forwarded') return 'Forwarded';
  if (direction === 'outbound') return 'Outbound';
  return 'Direct';
}

function getDirectionIcon(direction?: string): string {
  if (direction === 'outbound') return 'phone-outgoing';
  return 'phone-incoming';
}

export function CallDetailScreen({ route }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [call, setCall] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any>(null);
  const [transcriptTurns, setTranscriptTurns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const playbackTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [callRes, artifactsRes] = await Promise.all([
        apiClient.get(`/calls/${callId}`),
        apiClient.get(`/calls/${callId}/artifacts`).catch(() => ({ data: null })),
      ]);
      setCall(callRes.data);
      setArtifacts(artifactsRes.data);
      setError(undefined);

      if (artifactsRes.data?.transcript_status === 'ready') {
        apiClient.get(`/calls/${callId}/transcript`).then(res => {
          setTranscriptTurns(res.data?.turns ?? []);
        }).catch(() => {});
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load call details');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        if (playbackTimer.current) clearInterval(playbackTimer.current);
      };
    }, []),
  );

  function togglePlayback() {
    const totalSeconds = call?.duration_seconds || 0;
    if (isPlaying) {
      setIsPlaying(false);
      if (playbackTimer.current) clearInterval(playbackTimer.current);
    } else {
      setIsPlaying(true);
      playbackTimer.current = setInterval(() => {
        setPlaybackPosition(prev => {
          if (prev >= totalSeconds) {
            setIsPlaying(false);
            if (playbackTimer.current) clearInterval(playbackTimer.current);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !call) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
          {error || 'Call not found'}
        </Text>
        <Pressable onPress={load} style={{ marginTop: spacing.md }}>
          <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const summary = artifacts?.summary ?? null;
  const transcriptStatus = artifacts?.transcript_status;
  const labelsData: any[] = artifacts?.labels ?? call.labels ?? [];
  const totalSeconds = call.duration_seconds || 0;

  const statusColor =
    call.status === 'completed' ? colors.success :
    call.status === 'missed' ? colors.error :
    call.status === 'in_progress' ? colors.warning :
    colors.textSecondary;

  const hasUrgent = labelsData.some(
    (l: any) => (l.label_name || l.label || '')?.toLowerCase() === 'urgency',
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Navigation header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }}>
          Call Details
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 60 }}
      >
        {/* ─── Header: avatar, phone, badges ─── */}
        <FadeIn delay={0} slide="up">
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: colors.success + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Icon name="phone" size={32} color={colors.success} />
            </View>

            <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}>
              {call.caller_display_name || call.from_masked || 'Unknown Caller'}
            </Text>
            {call.from_masked && call.caller_display_name && (
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 }}>
                {call.from_masked}
              </Text>
            )}

            {/* Pill badges */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
              {call.status && (
                <View
                  style={{
                    backgroundColor: statusColor + '20',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: statusColor }}>
                    {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                  </Text>
                </View>
              )}
              {hasUrgent && (
                <View
                  style={{
                    backgroundColor: colors.error + '20',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: colors.error }}>
                    Urgent
                  </Text>
                </View>
              )}
              {call.is_vip && (
                <View
                  style={{
                    backgroundColor: colors.warning + '20',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: colors.warning }}>
                    VIP
                  </Text>
                </View>
              )}
              {call.is_blocked && (
                <View
                  style={{
                    backgroundColor: colors.error + '20',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: colors.error }}>
                    Spam
                  </Text>
                </View>
              )}
            </View>
          </View>
        </FadeIn>

        {/* ─── Time row: Started / Ended ─── */}
        <FadeIn delay={60} slide="up">
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <InfoCard
              icon="clock-outline"
              label="Started"
              value={call.started_at ? formatDateTime(call.started_at) : '--'}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
            <InfoCard
              icon="clock-check-outline"
              label="Ended"
              value={call.ended_at ? formatDateTime(call.ended_at) : '--'}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
          </View>
        </FadeIn>

        {/* ─── Info row: Duration / Type ─── */}
        <FadeIn delay={100} slide="up">
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginBottom: spacing.xl,
            }}
          >
            <InfoCard
              icon="timer-outline"
              label="Duration"
              value={formatDuration(call.duration_seconds)}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
            <InfoCard
              icon={getDirectionIcon(call.direction)}
              label="Type"
              value={getDirectionLabel(call.direction, call.source_type)}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
          </View>
        </FadeIn>

        {/* ─── Summary ─── */}
        {summary && (
          <FadeIn delay={140} slide="up">
            <SectionTitle title="Summary" colors={colors} typography={typography} spacing={spacing} />
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginBottom: spacing.xl,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ ...typography.body, color: colors.textSecondary, lineHeight: 22 }}>
                {summary.content || summary.text || JSON.stringify(summary)}
              </Text>
            </View>
          </FadeIn>
        )}

        {/* ─── Recording ─── */}
        {call.recording_url && (
          <FadeIn delay={180} slide="up">
            <SectionTitle title="Recording" colors={colors} typography={typography} spacing={spacing} />
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginBottom: spacing.xl,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <Pressable
                onPress={togglePlayback}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color={colors.onPrimary}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.surfaceVariant,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.primary,
                      width: totalSeconds > 0
                        ? `${(playbackPosition / totalSeconds) * 100}%`
                        : '0%',
                    }}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                    {formatPlaybackTime(playbackPosition)}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                    {formatPlaybackTime(totalSeconds)}
                  </Text>
                </View>
              </View>
            </View>
          </FadeIn>
        )}

        {/* ─── Labels ─── */}
        {labelsData.length > 0 && (
          <FadeIn delay={220} slide="up">
            <SectionTitle title="Labels" colors={colors} typography={typography} spacing={spacing} />
            <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
              {labelsData.map((item: any, idx: number) => {
                const labelName = item.label_name || item.label || '';
                const isUrgent = labelName.toLowerCase() === 'urgency';
                const pillColor = isUrgent ? colors.error : colors.primary;
                const displayName = labelName.charAt(0).toUpperCase() + labelName.slice(1);
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radii.xl,
                      padding: spacing.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                      <View
                        style={{
                          backgroundColor: pillColor + '20',
                          borderRadius: radii.full,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ ...typography.caption, fontWeight: '700', color: pillColor }}>
                          {displayName}
                        </Text>
                      </View>
                      {item.confidence != null && (
                        <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                          {Math.round(item.confidence * 100)}% confidence
                        </Text>
                      )}
                    </View>
                    {(item.reason_text || item.description) && (
                      <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                        {item.reason_text || item.description}
                      </Text>
                    )}
                    {(item.evidence_snippets?.length > 0 || item.snippet) && (
                      <Text
                        style={{
                          ...typography.bodySmall,
                          color: colors.textSecondary,
                          fontStyle: 'italic',
                          marginTop: spacing.xs,
                        }}
                      >
                        &ldquo;{item.evidence_snippets?.[0] || item.snippet}&rdquo;
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </FadeIn>
        )}

        {/* ─── Transcript ─── */}
        {transcriptTurns.length > 0 && (
          <FadeIn delay={260} slide="up">
            <SectionTitle title="Transcript" colors={colors} typography={typography} spacing={spacing} />
            <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
              {transcriptTurns.map((turn: any, idx: number) => {
                const isAI = turn.role?.toLowerCase() === 'agent' || turn.role?.toLowerCase() === 'ai' || turn.role?.toLowerCase() === 'assistant';
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: isAI ? colors.primary + '25' : colors.surfaceVariant,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      <Icon
                        name={isAI ? 'robot' : 'account'}
                        size={18}
                        color={isAI ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.caption, fontWeight: '600', color: isAI ? colors.primary : colors.textSecondary, marginBottom: 2 }}>
                        {isAI ? 'AI Assistant' : 'Caller'}
                      </Text>
                      <View
                        style={{
                          backgroundColor: isAI ? colors.surface : colors.surfaceVariant,
                          borderRadius: radii.lg,
                          padding: spacing.md,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20 }}>
                          {turn.text}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </FadeIn>
        )}

        {/* ─── Action chips ─── */}
        <FadeIn delay={300} slide="up">
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.sm,
            }}
          >
            <ActionChip
              icon="message-reply-text-outline"
              label="Text back"
              onPress={() => navigation.navigate('TextBack', { callId, callerId: call.caller_phone_hash })}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
            <ActionChip
              icon="note-plus-outline"
              label="Add Note"
              onPress={() => {
                Alert.prompt
                  ? Alert.prompt('Add Note', 'Enter your note for this call:', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Save',
                        onPress: async (text?: string) => {
                          if (!text?.trim()) return;
                          try {
                            await apiClient.patch(`/calls/${callId}`, { notes: text.trim() });
                            Alert.alert('Saved', 'Note added to call.');
                          } catch (e) {
                            Alert.alert('Error', extractApiError(e) || 'Failed to save note');
                          }
                        },
                      },
                    ])
                  : Alert.alert('Add Note', 'Use the notes field in call settings to add a note.');
              }}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
            <ActionChip
              icon="bell-ring-outline"
              label="Reminder"
              onPress={() => navigation.navigate('CreateReminder', { callId })}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ─── */

function SectionTitle({
  title,
  colors,
  typography,
  spacing,
}: {
  title: string;
  colors: any;
  typography: any;
  spacing: any;
}) {
  return (
    <Text
      style={{
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
      }}
    >
      {title}
    </Text>
  );
}

function InfoCard({
  icon,
  label,
  value,
  colors,
  spacing,
  typography,
  radii,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  spacing: any;
  typography: any;
  radii: any;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginLeft: spacing.xs }}>
          {label}
        </Text>
      </View>
      <Text style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  colors,
  spacing,
  typography,
  radii,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
  spacing: any;
  typography: any;
  radii: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.sm,
        backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <Icon name={icon} size={16} color={colors.primary} />
      <Text
        style={{ ...typography.caption, fontWeight: '600', color: colors.textPrimary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
