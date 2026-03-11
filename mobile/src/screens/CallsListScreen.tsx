import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { hapticLight } from '../utils/haptics';
import { apiClient } from '../api/client';

type FilterKey = 'all' | 'missed' | 'vip' | 'spam' | 'urgent';

interface AdvancedFilters {
  has_recording: boolean | null;
  sort_by: 'started_at' | 'created_at';
  sort_dir: 'desc' | 'asc';
  duration_min: string;
  duration_max: string;
}

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'phone-outline' },
  { key: 'urgent', label: 'Urgent', icon: 'alert-circle-outline' },
  { key: 'vip', label: 'VIP', icon: 'star-outline' },
  { key: 'spam', label: 'Spam', icon: 'shield-off-outline' },
  { key: 'missed', label: 'Missed', icon: 'phone-missed-outline' },
];

function statusIcon(status: string): { name: string; color: string } {
  switch (status) {
    case 'completed':
      return { name: 'phone-check', color: '#10B981' };
    case 'failed':
    case 'canceled':
      return { name: 'phone-missed', color: '#EF4444' };
    case 'in_progress':
      return { name: 'phone-in-talk', color: '#F59E0B' };
    case 'partial':
      return { name: 'phone-alert', color: '#F59E0B' };
    default:
      return { name: 'phone-outline', color: '#6B7280' };
  }
}

function statusBadgeColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'completed':
      return { bg: '#10B98120', text: '#10B981' };
    case 'failed':
    case 'canceled':
      return { bg: '#EF444420', text: '#EF4444' };
    case 'in_progress':
    case 'partial':
      return { bg: '#F59E0B20', text: '#F59E0B' };
    default:
      return { bg: '#6B728020', text: '#6B7280' };
  }
}

function statusDisplayLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'failed': return 'Missed';
    case 'canceled': return 'Cancelled';
    case 'in_progress': return 'In Progress';
    case 'partial': return 'Partial';
    case 'inbound_received': return 'Ringing';
    case 'twiml_responded': return 'Connecting';
    case 'created': return 'Created';
    default: return status.replace(/_/g, ' ');
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    has_recording: null,
    sort_by: 'started_at',
    sort_dir: 'desc',
    duration_min: '',
    duration_max: '',
  });

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        limit: 50,
        sort_by: advancedFilters.sort_by,
        sort_dir: advancedFilters.sort_dir,
      };
      if (filter === 'missed') params.status = 'failed';
      if (filter === 'urgent') params.label = 'urgent';
      if (filter === 'spam') params.label = 'spam';
      if (search.trim()) params.search = search.trim();
      if (advancedFilters.has_recording === true) params.has_recording = true;
      if (advancedFilters.duration_min) params.duration_min = parseInt(advancedFilters.duration_min, 10);
      if (advancedFilters.duration_max) params.duration_max = parseInt(advancedFilters.duration_max, 10);

      const { data: res } = await apiClient.get('/calls', { params });
      let items = res.items ?? res.data ?? res ?? [];

      if (filter === 'vip') items = items.filter((c: any) => c.is_vip);

      setCalls(items);
      setError(undefined);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message
        || e?.response?.data?.detail
        || e?.message
        || 'Failed to load calls';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => { load(); }, [filter, advancedFilters]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = calls.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (c.caller_display_name || c.from_masked || '').toLowerCase();
    return name.includes(q);
  });

  const searchBarStyle = isDark
    ? { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }
    : {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.cardBorder,
        ...Platform.select({
          ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
          android: { elevation: 1 },
        }),
      };

  function renderItem({ item, index }: { item: any; index: number }) {
    const si = statusIcon(item.status);
    const badge = statusBadgeColor(item.status);
    const relationship = item.caller_relationship || item.relationship;
    const isReady = item.notification_status === 'ready' || item.artifacts_status === 'ready';
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
            paddingVertical: 14,
            paddingHorizontal: spacing.lg,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.sm,
            backgroundColor: pressed
              ? (isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceVariant)
              : (isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: si.color + '15',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={si.name} size={20} color={si.color} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text
                style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                numberOfLines={1}
              >
                {item.caller_display_name || item.from_masked || 'Unknown'}
              </Text>
              {!!relationship && (
                <Text style={{ fontSize: 12, color: colors.textDisabled }}>
                  {relationship}
                </Text>
              )}
              {item.is_vip && (
                <Icon name="star" size={14} color="#FBBF24" />
              )}
              <View
                style={{
                  backgroundColor: badge.bg,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: badge.text }}>
                  {statusDisplayLabel(item.status || 'unknown')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                Call ended · {formatDuration(item.duration_seconds)}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                {timeAgo(item.started_at || item.created_at)}
              </Text>
            </View>

            {isReady && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="check-circle" size={14} color="#10B981" />
                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>Ready</Text>
              </View>
            )}
          </View>
          <Icon name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
        </Pressable>
      </FadeIn>
    );
  }

  const isDark = theme.dark;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 }}>Calls</Text>
          <View style={{ backgroundColor: colors.primary + '15', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              {filtered.length} {filtered.length === 1 ? 'call' : 'calls'}
            </Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: radii.xl,
            paddingHorizontal: spacing.md,
            ...searchBarStyle,
          }}
        >
          <Icon name="magnify" size={20} color={colors.textDisabled} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            placeholder="Search by name or number..."
            placeholderTextColor={colors.textDisabled}
            returnKeyType="search"
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
        <Pressable
          onPress={() => { hapticLight(); setShowFilterModal(true); }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="tune-variant" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Filter chips */}
      <View style={{ height: 40, marginBottom: spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
          }}
        >
          {FILTERS.map((f, idx) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  hapticLight();
                  setFilter(f.key);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 32,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: active ? colors.primary : colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  marginRight: idx < FILTERS.length - 1 ? 8 : 0,
                }}
              >
                <Icon name={f.icon} size={15} color={active ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: active ? '#FFFFFF' : colors.textSecondary,
                    marginLeft: 5,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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

      {/* Advanced Filter Modal */}
      {showFilterModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </TouchableWithoutFeedback>
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: isDark ? '#160D2E' : colors.background,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 20,
              ...(isDark ? { borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.08)' } : {}),
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textDisabled }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sort By */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Sort By</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[{ key: 'started_at' as const, label: 'Call Time' }, { key: 'created_at' as const, label: 'Created' }].map((opt, i) => {
                const sel = advancedFilters.sort_by === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.7}
                    onPress={() => setAdvancedFilters(p => ({ ...p, sort_by: opt.key }))}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: sel ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: sel ? colors.primary : colors.border,
                      marginLeft: i > 0 ? 8 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: sel ? '#FFFFFF' : colors.textPrimary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Order */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Order</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[{ key: 'desc' as const, label: 'Newest First' }, { key: 'asc' as const, label: 'Oldest First' }].map((opt, i) => {
                const sel = advancedFilters.sort_dir === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.7}
                    onPress={() => setAdvancedFilters(p => ({ ...p, sort_dir: opt.key }))}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: sel ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: sel ? colors.primary : colors.border,
                      marginLeft: i > 0 ? 8 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: sel ? '#FFFFFF' : colors.textPrimary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recording */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recording</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[{ key: null, label: 'Any' }, { key: true, label: 'Has Recording' }].map((opt, i) => {
                const sel = advancedFilters.has_recording === opt.key;
                return (
                  <TouchableOpacity
                    key={String(opt.key)}
                    activeOpacity={0.7}
                    onPress={() => setAdvancedFilters(p => ({ ...p, has_recording: opt.key as boolean | null }))}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: sel ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: sel ? colors.primary : colors.border,
                      marginLeft: i > 0 ? 8 : 0,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: sel ? '#FFFFFF' : colors.textPrimary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Duration (seconds)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                value={advancedFilters.duration_min}
                onChangeText={(v) => setAdvancedFilters(p => ({ ...p, duration_min: v.replace(/[^0-9]/g, '') }))}
                placeholder="Min"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                style={{
                  flex: 1, height: 44, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12,
                  borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 14, textAlign: 'center',
                }}
              />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginHorizontal: 8 }}>to</Text>
              <TextInput
                value={advancedFilters.duration_max}
                onChangeText={(v) => setAdvancedFilters(p => ({ ...p, duration_max: v.replace(/[^0-9]/g, '') }))}
                placeholder="Max"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                style={{
                  flex: 1, height: 44, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12,
                  borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 14, textAlign: 'center',
                }}
              />
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setAdvancedFilters({ has_recording: null, sort_by: 'started_at', sort_dir: 'desc', duration_min: '', duration_max: '' });
                }}
                style={{ flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Reset</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setShowFilterModal(false); load(); }}
                style={{ flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
