import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { hapticLight } from '../utils/haptics';
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
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

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
  }).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (c.caller_display_name || c.from_masked || '').toLowerCase();
    return name.includes(q);
  });

  const searchGlow =
    Platform.OS === 'ios'
      ? {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }
      : {};

  const searchGlassEdge = theme.dark
    ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }
    : {};

  function renderItem({ item, index }: { item: any; index: number }) {
    const si = statusIcon(item.status);
    return (
      <FadeIn delay={Math.min(index * 40, 200)}>
        <Pressable
          onPress={() => {
            hapticLight();
            navigation.navigate('CallDetail', { callId: item.id });
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.sm,
            backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderLeftWidth: 3,
            borderLeftColor: si.color,
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="phone-outline" size={28} color={colors.textPrimary} />
          <Text style={{ ...typography.h1, color: colors.textPrimary }}>Calls</Text>
        </View>
      </View>

      {/* Search bar */}
      <View
        style={{
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...searchGlow,
          ...searchGlassEdge,
        }}
      >
        <Icon name="magnify" size={20} color={colors.textDisabled} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search calls..."
          placeholderTextColor={colors.textDisabled}
          style={{
            flex: 1,
            ...typography.body,
            color: colors.textPrimary,
            paddingVertical: spacing.sm + 2,
            paddingHorizontal: spacing.sm,
          }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="close-circle" size={18} color={colors.textDisabled} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
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
            onPress={() => {
              hapticLight();
              setFilter(f.key);
            }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radii.full,
              backgroundColor: filter === f.key ? colors.primary : colors.surfaceVariant,
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
            Your AI assistant is ready. Calls will appear here once your number starts receiving them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        />
      )}
    </View>
  );
}
