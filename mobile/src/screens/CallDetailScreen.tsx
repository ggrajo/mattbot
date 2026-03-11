import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { apiClient } from '../api/client';
import type { Theme } from '../theme/tokens';
import type { CallEventResponse } from '../api/calls';

interface CallArtifacts {
  transcript: string | null;
  summary: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  ringing: { bg: '#FFF3E0', fg: '#E65100' },
  answered: { bg: '#E8F5E9', fg: '#2E7D32' },
  in_progress: { bg: '#E3F2FD', fg: '#1565C0' },
  screening: { bg: '#F3E5F5', fg: '#7B1FA2' },
  ended: { bg: '#ECEFF1', fg: '#546E7A' },
  missed: { bg: '#FFEBEE', fg: '#C62828' },
  rejected: { bg: '#FFEBEE', fg: '#C62828' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallDetailScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { callId } = route.params as { callId: string };
  const { selectedCall, events, loading, error, fetchCall, fetchCallEvents, clearSelected } =
    useCallStore();
  const [artifacts, setArtifacts] = useState<CallArtifacts | null>(null);
  const { isCallActive, activeCallId, transcript } = useRealtimeStore();
  const isLiveCall = isCallActive && activeCallId === callId;

  useEffect(() => {
    fetchCall(callId);
    fetchCallEvents(callId);
    apiClient
      .get<CallArtifacts>(`/calls/${callId}/artifacts`)
      .then(({ data }) => setArtifacts(data))
      .catch(() => setArtifacts(null));
    return () => clearSelected();
  }, [callId, fetchCall, fetchCallEvents, clearSelected]);

  if (loading && !selectedCall) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedCall) return null;

  const statusColor = STATUS_COLORS[selectedCall.status] ?? { bg: '#ECEFF1', fg: '#546E7A' };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn delay={0}>
          <View style={styles.statusBanner}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.fg }]}>
                {selectedCall.status.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.phoneHero}>
              {selectedCall.direction === 'inbound' ? selectedCall.from_number : selectedCall.to_number}
            </Text>
            <Text style={styles.directionHint}>
              {selectedCall.direction === 'inbound' ? 'Incoming Call' : 'Outgoing Call'}
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <View style={styles.infoCard}>
            <InfoRow label="From" value={selectedCall.from_number} theme={theme} />
            <InfoRow label="To" value={selectedCall.to_number} theme={theme} />
            <InfoRow
              label="Direction"
              value={selectedCall.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
              theme={theme}
            />
            <InfoRow
              label="Duration"
              value={formatDuration(selectedCall.duration_seconds)}
              theme={theme}
            />
            <InfoRow label="Started" value={formatDateTime(selectedCall.started_at)} theme={theme} />
            {selectedCall.answered_at && (
              <InfoRow
                label="Answered"
                value={formatDateTime(selectedCall.answered_at)}
                theme={theme}
              />
            )}
            {selectedCall.ended_at && (
              <InfoRow label="Ended" value={formatDateTime(selectedCall.ended_at)} theme={theme} isLast />
            )}
          </View>
        </FadeIn>

        <FadeIn delay={160}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          {events.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineEmoji}>📋</Text>
              <Text style={styles.emptyTimelineText}>No events recorded.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {events.map((evt, idx) => (
                <TimelineItem
                  key={evt.id}
                  event={evt}
                  isLast={idx === events.length - 1}
                  theme={theme}
                />
              ))}
            </View>
          )}
        </FadeIn>

        {selectedCall.caller_phone_hash && (
          <FadeIn delay={200}>
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Caller</Text>
            <TouchableOpacity
              style={styles.infoCard}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('CallerProfile', {
                  phoneHash: selectedCall.caller_phone_hash,
                  callerName: selectedCall.caller_name,
                })
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF' }}>
                    {(selectedCall.caller_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary, fontWeight: '600' }}>
                    {selectedCall.caller_name || `Caller ${selectedCall.caller_phone_hash.slice(0, 8)}`}
                  </Text>
                  {(selectedCall.memory_count ?? 0) > 0 && (
                    <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
                      {selectedCall.memory_count} memories
                    </Text>
                  )}
                </View>
                <Text style={{ ...theme.typography.body, color: theme.colors.textDisabled }}>{'>'}</Text>
              </View>
            </TouchableOpacity>
          </FadeIn>
        )}

        {isLiveCall && (
          <FadeIn delay={220}>
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Live Transcript</Text>
            <View style={styles.infoCard}>
              <View style={liveStyles.liveHeader}>
                <View style={[liveStyles.liveDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={{ ...theme.typography.bodySmall, color: theme.colors.primary, fontWeight: '700' }}>
                  LIVE
                </Text>
              </View>
              {transcript.length === 0 ? (
                <Text style={{ ...theme.typography.body, color: theme.colors.textDisabled, fontStyle: 'italic' }}>
                  Waiting for transcript...
                </Text>
              ) : (
                transcript.map((line, idx) => (
                  <Text
                    key={idx}
                    style={{
                      ...theme.typography.body,
                      color: theme.colors.textPrimary,
                      lineHeight: 22,
                      marginBottom: 4,
                    }}
                  >
                    {line}
                  </Text>
                ))
              )}
            </View>
          </FadeIn>
        )}

        {artifacts && (artifacts.transcript || artifacts.summary) && (
          <FadeIn delay={240}>
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Artifacts</Text>
            {artifacts.summary && (
              <View style={styles.artifactCard}>
                <View style={styles.artifactHeader}>
                  <Text style={styles.artifactEmoji}>📝</Text>
                  <Text style={styles.artifactLabel}>Summary</Text>
                </View>
                <Text style={styles.artifactBody}>{artifacts.summary}</Text>
              </View>
            )}
            {artifacts.transcript && (
              <View style={styles.artifactCard}>
                <View style={styles.artifactHeader}>
                  <Text style={styles.artifactEmoji}>💬</Text>
                  <Text style={styles.artifactLabel}>Transcript</Text>
                </View>
                <Text style={styles.artifactBody}>{artifacts.transcript}</Text>
              </View>
            )}
          </FadeIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  theme,
  isLast,
}: {
  label: string;
  value: string;
  theme: Theme;
  isLast?: boolean;
}) {
  const { colors, spacing, typography } = theme;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ ...typography.bodySmall, color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

function TimelineItem({
  event,
  isLast,
  theme,
}: {
  event: CallEventResponse;
  isLast: boolean;
  theme: Theme;
}) {
  const statusColor = STATUS_COLORS[event.to_status] ?? { bg: '#ECEFF1', fg: '#546E7A' };
  const { colors, spacing, typography } = theme;

  return (
    <View style={tlStyles.item}>
      <View style={tlStyles.dotColumn}>
        <View style={[tlStyles.dotOuter, { borderColor: statusColor.fg }]}>
          <View style={[tlStyles.dotInner, { backgroundColor: statusColor.fg }]} />
        </View>
        {!isLast && <View style={[tlStyles.line, { backgroundColor: colors.border }]} />}
      </View>
      <View style={[tlStyles.content, { paddingBottom: isLast ? 0 : spacing.lg }]}>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.textPrimary,
            fontWeight: '600',
            textTransform: 'capitalize',
          }}
        >
          {event.event_type.replace(/_/g, ' ')}
        </Text>
        <View style={tlStyles.transitionRow}>
          {event.from_status && (
            <>
              <View style={[tlStyles.transitionBadge, { backgroundColor: '#ECEFF1' }]}>
                <Text style={[tlStyles.transitionBadgeText, { color: '#546E7A' }]}>
                  {event.from_status}
                </Text>
              </View>
              <Text style={{ color: colors.textDisabled, fontSize: 12, marginHorizontal: 4 }}>→</Text>
            </>
          )}
          <View style={[tlStyles.transitionBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[tlStyles.transitionBadgeText, { color: statusColor.fg }]}>
              {event.to_status}
            </Text>
          </View>
        </View>
        <Text style={{ ...typography.caption, color: colors.textDisabled, marginTop: 4 }}>
          {formatDateTime(event.created_at)}
        </Text>
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  item: { flexDirection: 'row', minHeight: 60 },
  dotColumn: { width: 28, alignItems: 'center' },
  dotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  line: { width: 2, flex: 1, marginTop: 4 },
  content: { flex: 1, paddingLeft: 12 },
  transitionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  transitionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  transitionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

const liveStyles = StyleSheet.create({
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { marginTop: spacing.xxl },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    errorBox: {
      backgroundColor: colors.errorContainer,
      margin: spacing.xl,
      padding: spacing.md,
      borderRadius: radii.md,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
    statusBanner: { alignItems: 'center', marginBottom: spacing.xl },
    statusBadge: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    phoneHero: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    directionHint: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    emptyTimeline: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyTimelineEmoji: {
      fontSize: 28,
      marginBottom: spacing.sm,
    },
    emptyTimelineText: {
      ...typography.body,
      color: colors.textDisabled,
    },
    timeline: { paddingLeft: spacing.xs },
    artifactCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    artifactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: spacing.sm,
    },
    artifactEmoji: {
      fontSize: 16,
    },
    artifactLabel: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    artifactBody: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
  });
}
