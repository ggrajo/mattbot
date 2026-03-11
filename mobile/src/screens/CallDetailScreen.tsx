import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { hapticLight } from '../utils/haptics';
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

function getTimelineIcon(eventType: string): string {
  if (eventType === 'call_received') return 'phone-incoming';
  if (eventType === 'response_sent') return 'message-text';
  return 'check-circle';
}

export function CallDetailScreen({ route }: Props) {
  const { callId } = route.params;
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const isDark = theme.dark;
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

  const [showFullNumber, setShowFullNumber] = useState(false);
  const [fullNumber, setFullNumber] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [isVip, setIsVip] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [callRes, artifactsRes] = await Promise.all([
        apiClient.get(`/calls/${callId}`),
        apiClient.get(`/calls/${callId}/artifacts`).catch(() => ({ data: null })),
      ]);
      setCall(callRes.data);
      setArtifacts(artifactsRes.data);
      setIsVip(!!callRes.data?.is_vip);
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load call details');
    } finally {
      setLoading(false);
    }
  }

  async function revealFullNumber() {
    try {
      const res = await apiClient.get(`/calls/${callId}/caller-phone`);
      setFullNumber(res.data?.phone ?? null);
      setShowFullNumber(true);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to reveal number');
    }
  }

  async function loadTranscriptData() {
    if (transcriptTurns.length > 0) return;
    setTranscriptLoading(true);
    try {
      const res = await apiClient.get(`/calls/${callId}/transcript`);
      setTranscriptTurns(res.data?.turns ?? []);
    } catch {
      /* silently fail */
    } finally {
      setTranscriptLoading(false);
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
  const labelsData: any[] = artifacts?.labels ?? call.labels ?? [];
  const memoryItems: any[] = artifacts?.memory_items ?? call.memory_items ?? [];
  const timelineEvents: any[] = artifacts?.events ?? call.events ?? [];
  const totalSeconds = call.duration_seconds || 0;
  const relationship = call.caller_relationship || call.relationship;

  const statusColor =
    call.status === 'completed' ? colors.success :
    call.status === 'failed' || call.status === 'canceled' ? colors.error :
    call.status === 'in_progress' || call.status === 'partial' ? colors.warning :
    colors.textSecondary;

  const hasUrgent = labelsData.some(
    (l: any) => (l.label_name || l.label || '')?.toLowerCase() === 'urgent',
  );
  const hasSpam = labelsData.some(
    (l: any) => (l.label_name || l.label || '')?.toLowerCase() === 'spam',
  );
  const hasSales = labelsData.some(
    (l: any) => (l.label_name || l.label || '')?.toLowerCase() === 'sales',
  );
  const hasNormal = labelsData.some(
    (l: any) => (l.label_name || l.label || '')?.toLowerCase() === 'normal',
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Navigation header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => { hapticLight(); navigation.goBack(); }} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }}>
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
                backgroundColor: colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Icon name="phone" size={32} color={colors.primary} />
            </View>

            <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}>
              {call.caller_display_name || call.from_masked || 'Unknown Caller'}
            </Text>

            {relationship && (
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                {relationship}
              </Text>
            )}

            {call.from_masked && (
              <Pressable
                onPress={() => {
                  hapticLight();
                  if (showFullNumber) {
                    setShowFullNumber(false);
                  } else {
                    revealFullNumber();
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}
              >
                <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                  {showFullNumber && fullNumber ? fullNumber : call.from_masked}
                </Text>
                <Icon name={showFullNumber ? 'eye-off-outline' : 'eye-outline'} size={14} color={colors.textSecondary} />
              </Pressable>
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
                    {call.status === 'failed' ? 'Missed' : call.status === 'canceled' ? 'Cancelled' : call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                  </Text>
                </View>
              )}
              {hasUrgent && (
                <View
                  style={{
                    backgroundColor: '#F5920B20',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: '#F59E0B' }}>
                    Urgent
                  </Text>
                </View>
              )}
              {hasSpam && (
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
              {hasSales && (
                <View
                  style={{
                    backgroundColor: '#6366F120',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: '#6366F1' }}>
                    Sales
                  </Text>
                </View>
              )}
              {hasNormal && !hasUrgent && !hasSpam && !hasSales && (
                <View
                  style={{
                    backgroundColor: '#10B98120',
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.caption, fontWeight: '700', color: '#10B981' }}>
                    Normal
                  </Text>
                </View>
              )}
              {isVip && (
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
              theme={theme}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
            <InfoCard
              icon="clock-check-outline"
              label="Ended"
              value={call.ended_at ? formatDateTime(call.ended_at) : '--'}
              theme={theme}
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
              theme={theme}
              colors={colors}
              spacing={spacing}
              typography={typography}
              radii={radii}
            />
            <InfoCard
              icon={getDirectionIcon(call.direction)}
              label="Type"
              value={getDirectionLabel(call.direction, call.source_type)}
              theme={theme}
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginBottom: spacing.xl,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
              }}
            >
              <Text style={{ ...typography.body, color: colors.textSecondary, lineHeight: 22 }}>
                {typeof summary === 'string' ? summary : summary.content || summary.text || JSON.stringify(summary)}
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginBottom: spacing.xl,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
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

        {/* ─── Actions ─── */}
        <FadeIn delay={220} slide="up">
          <SectionTitle title="Actions" colors={colors} typography={typography} spacing={spacing} />
          <View
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderRadius: radii.xl,
              padding: spacing.lg,
              marginBottom: spacing.xl,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
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
              <ActionChip
                icon="block-helper"
                label="Block"
                onPress={async () => {
                  hapticLight();
                  try {
                    await apiClient.post(`/calls/${callId}/mark-blocked`, { reason: 'manual' });
                    Alert.alert('Blocked', 'Caller has been blocked.');
                    load();
                  } catch (e) {
                    Alert.alert('Error', extractApiError(e) || 'Failed to block caller');
                  }
                }}
                colors={colors}
                spacing={spacing}
                typography={typography}
                radii={radii}
              />
              <ActionChip
                icon="shield-off-outline"
                label="Spam"
                onPress={async () => {
                  hapticLight();
                  try {
                    await apiClient.patch(`/calls/${callId}`, { spam_label: 'possible_spam' });
                    Alert.alert('Reported', 'Call marked as spam.');
                    load();
                  } catch (e) {
                    Alert.alert('Error', extractApiError(e) || 'Failed to report spam');
                  }
                }}
                colors={colors}
                spacing={spacing}
                typography={typography}
                radii={radii}
              />
              <ActionChip
                icon={isVip ? 'star' : 'star-outline'}
                label={isVip ? 'Remove VIP' : 'Add VIP'}
                onPress={async () => {
                  hapticLight();
                  try {
                    if (isVip) {
                      await apiClient.delete(`/calls/${callId}/mark-vip`);
                      setIsVip(false);
                    } else {
                      await apiClient.post(`/calls/${callId}/mark-vip`);
                      setIsVip(true);
                    }
                  } catch (e) {
                    Alert.alert('Error', extractApiError(e) || 'Failed to update VIP status');
                  }
                }}
                colors={colors}
                spacing={spacing}
                typography={typography}
                radii={radii}
              />
              <ActionChip
                icon="brain"
                label="Caller Note"
                onPress={() => navigation.navigate('CallerProfile', { phoneHash: call.caller_phone_hash })}
                colors={colors}
                spacing={spacing}
                typography={typography}
                radii={radii}
              />
            </View>
          </View>
        </FadeIn>

        {/* ─── Caller Memory ─── */}
        {memoryItems.length > 0 && (
          <FadeIn delay={260} slide="up">
            <SectionTitle title="Caller Memory" colors={colors} typography={typography} spacing={spacing} />
            <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
              {memoryItems.map((item: any, idx: number) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                    borderRadius: radii.lg,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  <Icon name="brain" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary }}>
                      {item.key}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                      {item.value}
                    </Text>
                  </View>
                  <Icon name="check-circle" size={18} color={colors.success} />
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ─── Labels ─── */}
        {labelsData.length > 0 && (
          <FadeIn delay={300} slide="up">
            <SectionTitle title="Labels" colors={colors} typography={typography} spacing={spacing} />
            <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
              {labelsData.map((item: any, idx: number) => {
                const labelName = item.label_name || item.label || '';
                const ln = labelName.toLowerCase();
                const pillColor = ln === 'urgent' ? '#F59E0B' : ln === 'spam' ? colors.error : ln === 'sales' ? '#6366F1' : colors.success;
                const displayName = labelName.charAt(0).toUpperCase() + labelName.slice(1);
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                      borderRadius: radii.xl,
                      padding: spacing.lg,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
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
        <FadeIn delay={340} slide="up">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Transcript</Text>
            {showTranscript && (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setShowTranscript(false);
                }}
              >
                <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}>
                  Hide transcript
                </Text>
              </Pressable>
            )}
          </View>

          {!showTranscript && (
            <Pressable
              onPress={() => {
                hapticLight();
                setShowTranscript(true);
                loadTranscriptData();
              }}
              style={{
                backgroundColor: colors.primary + '18',
                borderRadius: radii.lg,
                padding: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginBottom: spacing.xl,
              }}
            >
              <Icon name="text-box-outline" size={22} color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.primary, fontWeight: '600' }}>
                Tap to load transcript
              </Text>
            </Pressable>
          )}

          {showTranscript && (
            <View style={{ marginBottom: spacing.xl }}>
              {transcriptLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm }}>
                    Loading transcript...
                  </Text>
                </View>
              ) : transcriptTurns.length > 0 ? (
                <View style={{ gap: spacing.md }}>
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
                              backgroundColor: isAI ? (isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF') : colors.surfaceVariant,
                              borderRadius: radii.lg,
                              padding: spacing.md,
                              borderWidth: 1,
                              borderColor: isAI ? (isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder) : colors.border,
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
              ) : (
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                    borderRadius: radii.lg,
                    padding: spacing.lg,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                    No transcript available
                  </Text>
                </View>
              )}
            </View>
          )}
        </FadeIn>

        {/* ─── Timeline ─── */}
        {timelineEvents.length > 0 && (
          <FadeIn delay={380} slide="up">
            <SectionTitle title="Timeline" colors={colors} typography={typography} spacing={spacing} />
            <View style={{ marginBottom: spacing.xl }}>
              {timelineEvents.map((event: any, idx: number) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    marginBottom: idx < timelineEvents.length - 1 ? spacing.md : 0,
                  }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.primary + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={getTimelineIcon(event.event_type)} size={16} color={colors.primary} />
                    </View>
                    {idx < timelineEvents.length - 1 && (
                      <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: colors.border, marginTop: 4 }} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingTop: 4 }}>
                    <Text style={{ ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary }}>
                      {(event.event_type || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Text>
                    {event.timestamp && (
                      <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                        {formatDateTime(event.timestamp)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </FadeIn>
        )}
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
  theme,
  colors,
  spacing,
  typography,
  radii,
}: {
  icon: string;
  label: string;
  value: string;
  theme: any;
  colors: any;
  spacing: any;
  typography: any;
  radii: any;
}) {
  const isDark = theme.dark;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        borderRadius: radii.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
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
      onPress={() => { hapticLight(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
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
