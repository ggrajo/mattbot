import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
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
  const { callId } = route.params as { callId: string };
  const { selectedCall, events, loading, error, fetchCall, fetchCallEvents, clearSelected } =
    useCallStore();
  const [artifacts, setArtifacts] = useState<CallArtifacts | null>(null);

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusBanner}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.fg }]}>
              {selectedCall.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

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
            <InfoRow label="Ended" value={formatDateTime(selectedCall.ended_at)} theme={theme} />
          )}
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>

        {events.length === 0 ? (
          <Text style={styles.emptyTimeline}>No events recorded.</Text>
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

        {artifacts && (artifacts.transcript || artifacts.summary) && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Artifacts</Text>
            {artifacts.summary && (
              <View style={styles.artifactCard}>
                <Text style={styles.artifactLabel}>Summary</Text>
                <Text style={styles.artifactBody}>{artifacts.summary}</Text>
              </View>
            )}
            {artifacts.transcript && (
              <View style={styles.artifactCard}>
                <Text style={styles.artifactLabel}>Transcript</Text>
                <Text style={styles.artifactBody}>{artifacts.transcript}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  const styles = infoRowStyles(theme);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function infoRowStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    label: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    value: {
      ...theme.typography.bodySmall,
      color: theme.colors.textPrimary,
    },
  });
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
  const styles = timelineStyles(theme);

  return (
    <View style={styles.item}>
      <View style={styles.dotColumn}>
        <View style={[styles.dot, { backgroundColor: statusColor.fg }]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.eventType}>{event.event_type.replace(/_/g, ' ')}</Text>
        <View style={styles.transitionRow}>
          {event.from_status && (
            <Text style={styles.transitionText}>{event.from_status}</Text>
          )}
          {event.from_status && <Text style={styles.arrow}>{' -> '}</Text>}
          <Text style={[styles.transitionText, { color: statusColor.fg, fontWeight: '700' }]}>
            {event.to_status}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatDateTime(event.created_at)}</Text>
      </View>
    </View>
  );
}

function timelineStyles(theme: Theme) {
  return StyleSheet.create({
    item: { flexDirection: 'row', minHeight: 60 },
    dotColumn: { width: 24, alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    line: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginTop: 4 },
    content: { flex: 1, paddingLeft: theme.spacing.md, paddingBottom: theme.spacing.lg },
    eventType: {
      ...theme.typography.bodySmall,
      color: theme.colors.textPrimary,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    transitionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    transitionText: { ...theme.typography.caption, color: theme.colors.textSecondary },
    arrow: { ...theme.typography.caption, color: theme.colors.textDisabled },
    timestamp: { ...theme.typography.caption, color: theme.colors.textDisabled, marginTop: 4 },
  });
}

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
    },
    statusText: {
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
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
    emptyTimeline: { ...typography.body, color: colors.textDisabled },
    timeline: { paddingLeft: spacing.sm },
    artifactCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    artifactLabel: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
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
