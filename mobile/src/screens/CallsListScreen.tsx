import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';

type FilterKey = 'all' | 'missed' | 'vip' | 'spam';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'missed', label: 'Missed' },
  { key: 'vip', label: 'VIP' },
  { key: 'spam', label: 'Spam' },
];

function statusIcon(status: string): { name: string; color: string } {
  switch (status) {
    case 'completed':
      return { name: 'phone-check', color: '#10B981' };
    case 'missed':
      return { name: 'phone-missed', color: '#EF4444' };
    case 'voicemail':
      return { name: 'voicemail', color: '#F59E0B' };
    default:
      return { name: 'phone-outline', color: '#6B7280' };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallsListScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/calls', { params: { limit: 50 } });
      setCalls(res.items ?? res.data ?? res ?? []);
      setError(undefined);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message
        || e?.response?.data?.detail
        || e?.message
        || 'Failed to load calls';
      console.log('[CallsList] load error:', e?.response?.status, msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = calls.filter((c) => {
    if (filter === 'missed') return c.status === 'missed';
    if (filter === 'vip') return c.is_vip;
    if (filter === 'spam') return c.is_blocked;
    return true;
  });

  function renderItem({ item, index }: { item: any; index: number }) {
    const si = statusIcon(item.status);
    return (
      <FadeIn delay={index * 40}>
        <Pressable
          onPress={() => navigation.navigate('CallDetail', { callId: item.id })}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: si.color + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={si.name} size={20} color={si.color} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                numberOfLines={1}
              >
                {item.caller_display_name || item.from_masked || 'Unknown'}
              </Text>
              {item.is_vip && (
                <View
                  style={{
                    backgroundColor: '#FBBF24' + '25',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FBBF24' }}>VIP</Text>
                </View>
              )}
            </View>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
              {timeAgo(item.started_at || item.created_at)} · {formatDuration(item.duration_seconds)}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>
      </FadeIn>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary }}>Calls</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radii.full,
              backgroundColor: filter === f.key ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: filter === f.key ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                ...typography.caption,
                fontWeight: '600',
                color: filter === f.key ? colors.onPrimary : colors.textSecondary,
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Icon name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
            {error}
          </Text>
          <Pressable onPress={load} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.primary + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="phone-outline" size={32} color={colors.primary} />
          </View>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm }}>
            No calls yet
          </Text>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}>
            Your call history will appear here once you start receiving calls.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 70 }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}
