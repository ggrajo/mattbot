import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
import type { Theme } from '../theme/tokens';
import type { CallResponse } from '../api/calls';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  ringing: { bg: '#FFF3E0', fg: '#E65100' },
  answered: { bg: '#E8F5E9', fg: '#2E7D32' },
  in_progress: { bg: '#E3F2FD', fg: '#1565C0' },
  screening: { bg: '#F3E5F5', fg: '#7B1FA2' },
  ended: { bg: '#ECEFF1', fg: '#546E7A' },
  missed: { bg: '#FFEBEE', fg: '#C62828' },
  rejected: { bg: '#FFEBEE', fg: '#C62828' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#ECEFF1', fg: '#546E7A' };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[badgeStyles.text, { color: colors.fg }]}>
        {status.replace('_', ' ')}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

function EmptyState({ theme }: { theme: Theme }) {
  const { colors, spacing, typography } = theme;
  return (
    <FadeIn delay={100}>
      <View style={emptyStyles.container}>
        <View style={[emptyStyles.illustration, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={emptyStyles.emoji}>📞</Text>
        </View>
        <Text style={[typography.h3, { color: colors.textSecondary, marginBottom: spacing.sm, textAlign: 'center' }]}>
          No calls yet
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textDisabled, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 22 },
          ]}
        >
          Inbound calls will appear here once your number is active. Set up your phone number to get started.
        </Text>
      </View>
    </FadeIn>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 32,
  },
  illustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 36,
  },
});

export function CallsListScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { calls, total, loading, error, fetchCalls } = useCallStore();

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const onRefresh = useCallback(() => {
    fetchCalls();
  }, [fetchCalls]);

  const renderCall = ({ item }: { item: CallResponse }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CallDetail', { callId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.phoneRow}>
            <Text style={styles.phoneNumber}>
              {item.direction === 'inbound' ? item.from_number : item.to_number}
            </Text>
            {item.ai_session_id && (
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          <Text style={styles.directionLabel}>
            {item.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
            {item.ai_session_id ? ' · Screened by AI' : ''}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>{formatDate(item.started_at)}</Text>
        <Text style={styles.meta}>{formatDuration(item.duration_seconds)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FadeIn delay={0}>
        <View style={styles.header}>
          <Text style={styles.title}>Calls</Text>
          {total > 0 && <Text style={styles.subtitle}>{total} total</Text>}
        </View>
      </FadeIn>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && calls.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderCall}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
          ListEmptyComponent={<EmptyState theme={theme} />}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md },
    title: { ...typography.h1, color: colors.textPrimary },
    subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
    errorBox: {
      backgroundColor: colors.errorContainer,
      marginHorizontal: spacing.xl,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
    loader: { marginTop: spacing.xxl },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLeft: { flex: 1, marginRight: spacing.md },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    phoneNumber: { ...typography.h3, color: colors.textPrimary },
    aiBadge: {
      backgroundColor: '#F3E5F5',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    aiBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#7B1FA2',
      letterSpacing: 0.5,
    },
    directionLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    meta: { ...typography.caption, color: colors.textSecondary },
  });
}
