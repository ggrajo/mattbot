import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FadeIn } from '../components/ui/FadeIn';
import { CallListSkeleton } from '../components/ui/SkeletonLoader';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { useSettingsStore } from '../store/settingsStore';
import { getDeviceTimezone } from '../utils/formatDate';
import { fetchCallerPhone } from '../api/calls';
import type { CallListItem, CallFilters } from '../api/calls';

function timeAgo(dateStr: string, tz?: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const opts: Intl.DateTimeFormatOptions = {};
  if (tz) opts.timeZone = tz;
  return new Date(dateStr).toLocaleDateString(undefined, opts);
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

type StatusBadge = { label: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' };

function statusBadge(status: string): StatusBadge {
  switch (status) {
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    case 'in_progress':
      return { label: 'In Progress', variant: 'primary' };
    case 'failed':
      return { label: 'Failed', variant: 'error' };
    case 'canceled':
      return { label: 'Canceled', variant: 'warning' };
    case 'twiml_responded':
      return { label: 'Answered', variant: 'info' };
    case 'inbound_received':
      return { label: 'Received', variant: 'info' };
    default:
      return { label: status, variant: 'info' };
  }
}

function callSubtitle(item: CallListItem): string {
  if (item.status === 'completed') return 'Call ended';
  if (item.status === 'failed') return 'Call failed';
  if (item.status === 'canceled') return 'Call canceled';
  return 'Call captured';
}

type ArtifactBadge = { label: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' };

function artifactBadge(item: CallListItem): ArtifactBadge | null {
  if (item.status === 'in_progress' || item.status === 'twiml_responded' || item.status === 'inbound_received') {
    return null;
  }

  const status = item.artifact_status;
  if (status === 'ready') return { label: 'Ready', variant: 'success' };
  if (status === 'partial') return { label: 'Partial', variant: 'warning' };
  if (status === 'failed') return { label: 'Failed', variant: 'error' };

  if (!item.missing_summary && !item.missing_transcript && !item.missing_labels) {
    return { label: 'Ready', variant: 'success' };
  }
  if (!item.missing_summary) {
    return { label: 'Partial', variant: 'warning' };
  }
  if (item.missing_summary && item.missing_transcript && item.missing_labels) {
    if (item.status === 'completed') return { label: 'Processing', variant: 'info' };
    return null;
  }
  return { label: 'Processing', variant: 'info' };
}

// ---- Quick-filter presets (top row chips) ----

type QuickFilterKey = 'all' | 'important' | 'vip' | 'spam' | 'missed' | 'recorded';

interface QuickPreset {
  key: QuickFilterKey;
  label: string;
  icon: string;
  filter: CallFilters;
}

const QUICK_PRESETS: QuickPreset[] = [
  { key: 'all', label: 'All', icon: 'phone-log', filter: {} },
  { key: 'important', label: 'Urgent', icon: 'alert-circle-outline', filter: { label: 'urgent' } },
  { key: 'vip', label: 'VIP', icon: 'star-outline', filter: { label: 'vip' } },
  { key: 'spam', label: 'Spam', icon: 'alert-octagon-outline', filter: { label: 'spam' } },
  { key: 'missed', label: 'Missed', icon: 'phone-missed', filter: { status: 'failed' } },
  { key: 'recorded', label: 'Recorded', icon: 'microphone-outline', filter: { has_recording: true } },
];

// ---- Country prefix options ----

interface CountryOption {
  code: string;
  label: string;
  prefix: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'all', label: 'All Countries', prefix: '' },
  { code: 'us', label: 'United States (+1)', prefix: '+1' },
  { code: 'gb', label: 'United Kingdom (+44)', prefix: '+44' },
  { code: 'ca', label: 'Canada (+1)', prefix: '+1' },
  { code: 'au', label: 'Australia (+61)', prefix: '+61' },
  { code: 'de', label: 'Germany (+49)', prefix: '+49' },
  { code: 'fr', label: 'France (+33)', prefix: '+33' },
  { code: 'in', label: 'India (+91)', prefix: '+91' },
  { code: 'jp', label: 'Japan (+81)', prefix: '+81' },
  { code: 'br', label: 'Brazil (+55)', prefix: '+55' },
  { code: 'mx', label: 'Mexico (+52)', prefix: '+52' },
  { code: 'ph', label: 'Philippines (+63)', prefix: '+63' },
  { code: 'ng', label: 'Nigeria (+234)', prefix: '+234' },
  { code: 'za', label: 'South Africa (+27)', prefix: '+27' },
  { code: 'ae', label: 'UAE (+971)', prefix: '+971' },
  { code: 'sg', label: 'Singapore (+65)', prefix: '+65' },
  { code: 'kr', label: 'South Korea (+82)', prefix: '+82' },
  { code: 'it', label: 'Italy (+39)', prefix: '+39' },
  { code: 'es', label: 'Spain (+34)', prefix: '+34' },
  { code: 'nl', label: 'Netherlands (+31)', prefix: '+31' },
];

// ---- Date preset helpers ----

interface DatePreset {
  key: string;
  label: string;
  getRange: () => { from: string; to: string };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const DATE_PRESETS: DatePreset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => {
      const now = new Date();
      return { from: startOfDay(now).toISOString(), to: now.toISOString() };
    },
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const start = startOfDay(y);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.toISOString(), to: end.toISOString() };
    },
  },
  {
    key: '7d',
    label: 'Last 7 days',
    getRange: () => {
      const now = new Date();
      const past = new Date();
      past.setDate(past.getDate() - 7);
      return { from: past.toISOString(), to: now.toISOString() };
    },
  },
  {
    key: '30d',
    label: 'Last 30 days',
    getRange: () => {
      const now = new Date();
      const past = new Date();
      past.setDate(past.getDate() - 30);
      return { from: past.toISOString(), to: now.toISOString() };
    },
  },
  {
    key: '90d',
    label: 'Last 90 days',
    getRange: () => {
      const now = new Date();
      const past = new Date();
      past.setDate(past.getDate() - 90);
      return { from: past.toISOString(), to: now.toISOString() };
    },
  },
];

// ---- Duration presets ----

interface DurationPreset {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

const DURATION_PRESETS: DurationPreset[] = [
  { key: 'any', label: 'Any' },
  { key: 'short', label: '< 30s', max: 30 },
  { key: 'medium', label: '30s – 2m', min: 30, max: 120 },
  { key: 'long', label: '2m – 5m', min: 120, max: 300 },
  { key: 'vlong', label: '5m+', min: 300 },
];

// ---- Status options ----

interface StatusOption {
  key: string;
  label: string;
  value: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { key: 'all', label: 'All', value: '' },
  { key: 'completed', label: 'Completed', value: 'completed' },
  { key: 'failed', label: 'Failed', value: 'failed' },
  { key: 'canceled', label: 'Canceled', value: 'canceled' },
  { key: 'in_progress', label: 'In Progress', value: 'in_progress' },
];

// ---- Sort options ----

interface SortOption {
  key: string;
  label: string;
  sort_by: string;
  sort_dir: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'newest', label: 'Newest first', sort_by: 'created_at', sort_dir: 'desc' },
  { key: 'oldest', label: 'Oldest first', sort_by: 'created_at', sort_dir: 'asc' },
  { key: 'recent_start', label: 'Recently started', sort_by: 'started_at', sort_dir: 'desc' },
];

function countActiveFilters(f: CallFilters): number {
  let count = 0;
  if (f.status) count++;
  if (f.source_type) count++;
  if (f.date_from || f.date_to) count++;
  if (f.duration_min != null || f.duration_max != null) count++;
  if (f.country_prefix) count++;
  if (f.has_recording === true) count++;
  if (f.label) count++;
  if (f.sort_by && f.sort_by !== 'created_at') count++;
  if (f.sort_dir && f.sort_dir !== 'desc') count++;
  return count;
}


export function CallsListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const { calls, loading, loadingMore, error, hasMore, loadCalls, loadMore } = useCallStore();
  const userTz = useSettingsStore(s => s.settings?.timezone) || getDeviceTimezone();
  const activeCallId = useRealtimeStore(s => s.activeCallId);
  const isInitialLoad = useRef(true);
  const [activeQuick, setActiveQuick] = useState<QuickFilterKey>('all');
  const [searchText, setSearchText] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Advanced filter state (mirrors what's in the modal)
  const [advFilters, setAdvFilters] = useState<CallFilters>({});
  // Staging copy for the modal so cancel doesn't apply
  const [stagingFilters, setStagingFilters] = useState<CallFilters>({});

  // Track which date/duration preset is selected in the modal
  const [stagingDatePreset, setStagingDatePreset] = useState('');
  const [stagingDurationPreset, setStagingDurationPreset] = useState('any');
  const [stagingStatus, setStagingStatus] = useState('all');
  const [stagingSourceType, setStagingSourceType] = useState('');
  const [stagingCountry, setStagingCountry] = useState('all');
  const [stagingHasRecording, setStagingHasRecording] = useState(false);
  const [stagingSort, setStagingSort] = useState('newest');

  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    if (calls.length > 0 && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [calls]);

  const buildFilters = useCallback((): CallFilters => {
    const f: CallFilters = { ...advFilters };
    const quickPreset = QUICK_PRESETS.find((p) => p.key === activeQuick);
    if (quickPreset) Object.assign(f, quickPreset.filter);
    if (searchText.trim()) f.search = searchText.trim();
    return f;
  }, [advFilters, activeQuick, searchText]);

  const applyFilters = useCallback((filters: CallFilters) => {
    loadCalls(filters);
  }, [loadCalls]);

  const handleQuickChange = useCallback((preset: QuickPreset) => {
    setActiveQuick(preset.key);
    const f: CallFilters = { ...advFilters, ...preset.filter };
    if (searchText.trim()) f.search = searchText.trim();
    // Clear label if switching to non-label presets
    if (!preset.filter.label) delete f.label;
    if (!preset.filter.status) delete f.status;
    if (preset.filter.has_recording == null) delete f.has_recording;
    loadCalls(f);
  }, [advFilters, searchText, loadCalls]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const f = buildFilters();
      if (text.trim()) f.search = text.trim();
      else delete f.search;
      loadCalls(f);
    }, 400);
  }, [buildFilters, loadCalls]);

  const handleRefresh = useCallback(() => {
    const f = buildFilters();
    loadCalls(f);
  }, [buildFilters, loadCalls]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  // Open advanced filter modal
  const openFilterModal = useCallback(() => {
    setStagingFilters({ ...advFilters });
    setFilterModalVisible(true);
  }, [advFilters]);

  const handleApplyAdvanced = useCallback(() => {
    const f: CallFilters = {};

    // Status
    const statusOpt = STATUS_OPTIONS.find((s) => s.key === stagingStatus);
    if (statusOpt && statusOpt.value) f.status = statusOpt.value;

    // Source type
    if (stagingSourceType) f.source_type = stagingSourceType;

    // Date
    if (stagingDatePreset) {
      const dp = DATE_PRESETS.find((d) => d.key === stagingDatePreset);
      if (dp) {
        const range = dp.getRange();
        f.date_from = range.from;
        f.date_to = range.to;
      }
    }

    // Duration
    const durPreset = DURATION_PRESETS.find((d) => d.key === stagingDurationPreset);
    if (durPreset) {
      if (durPreset.min != null) f.duration_min = durPreset.min;
      if (durPreset.max != null) f.duration_max = durPreset.max;
    }

    // Country
    const countryOpt = COUNTRY_OPTIONS.find((c) => c.code === stagingCountry);
    if (countryOpt && countryOpt.prefix) f.country_prefix = countryOpt.prefix;

    // Recording
    if (stagingHasRecording) f.has_recording = true;

    // Sort (only store non-default)
    const sortOpt = SORT_OPTIONS.find((s) => s.key === stagingSort);
    if (sortOpt && (sortOpt.sort_by !== 'created_at' || sortOpt.sort_dir !== 'desc')) {
      f.sort_by = sortOpt.sort_by;
      f.sort_dir = sortOpt.sort_dir;
    }

    setAdvFilters(f);
    setActiveQuick('all');
    setFilterModalVisible(false);

    // Merge with search
    const merged: CallFilters = { ...f };
    if (searchText.trim()) merged.search = searchText.trim();
    loadCalls(merged);
  }, [
    stagingStatus, stagingSourceType, stagingDatePreset, stagingDurationPreset,
    stagingCountry, stagingHasRecording, stagingSort, searchText, loadCalls,
  ]);

  const handleResetAdvanced = useCallback(() => {
    setStagingDatePreset('');
    setStagingDurationPreset('any');
    setStagingStatus('all');
    setStagingSourceType('');
    setStagingCountry('all');
    setStagingHasRecording(false);
    setStagingSort('newest');
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(advFilters), [advFilters]);

  function renderItem({ item, index }: { item: CallListItem; index: number }) {
    const badge = statusBadge(item.status);
    const shouldAnimate = isInitialLoad.current;
    const delay = shouldAnimate ? Math.min(index * 40, 200) : 0;
    const isLive = item.status === 'in_progress' && activeCallId === item.id;

    const row = (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isLive) {
            navigation.navigate('LiveTranscript', { callId: item.id });
          } else {
            navigation.navigate('CallDetail', { callId: item.id });
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Call from ${item.from_masked}, ${badge.label}${isLive ? ', live' : ''}`}
      >
        <Card variant="elevated" style={{
          marginBottom: spacing.sm,
          borderLeftWidth: 3,
          borderLeftColor:
            badge.variant === 'success' ? colors.success + '60' :
            badge.variant === 'error' ? colors.error + '60' :
            badge.variant === 'warning' ? colors.warning + '60' :
            colors.primary + '40',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: colors.primary + '14',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={item.source_type === 'forwarded' ? 'phone-forward' : 'phone-incoming'}
                size="lg"
                color={colors.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <TouchableOpacity
                  onPress={async (e) => {
                    e.stopPropagation();
                    if (item.caller_display_name) return;
                    if (revealedPhones[item.id]) {
                      setRevealedPhones(prev => {
                        const next = { ...prev };
                        delete next[item.id];
                        return next;
                      });
                      return;
                    }
                    if (revealingIds.has(item.id)) return;
                    setRevealingIds(prev => new Set(prev).add(item.id));
                    try {
                      const phone = await fetchCallerPhone(item.id);
                      setRevealedPhones(prev => ({ ...prev, [item.id]: phone }));
                    } catch {
                      // silently fail - number stays masked
                    } finally {
                      setRevealingIds(prev => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }
                  }}
                  style={{ flex: 1 }}
                  accessibilityRole="button"
                  accessibilityLabel={item.caller_display_name || (revealedPhones[item.id] ? 'Tap to hide number' : 'Tap to reveal number')}
                  accessibilityHint={item.caller_display_name ? undefined : (revealedPhones[item.id] ? 'Hide the full phone number' : 'Reveal the full phone number')}
                >
                  {item.caller_display_name ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Text
                        style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                        numberOfLines={1}
                        allowFontScaling
                      >
                        {item.caller_display_name}
                      </Text>
                      {item.caller_relationship && (
                        <Text
                          style={{ ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' }}
                          numberOfLines={1}
                          allowFontScaling
                        >
                          · {item.caller_relationship}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text
                      style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                      numberOfLines={1}
                      allowFontScaling
                    >
                      {revealingIds.has(item.id) ? '...' : (revealedPhones[item.id] || item.from_masked)}
                    </Text>
                  )}
                </TouchableOpacity>
                {item.is_vip && (
                  <Icon name="star" size="sm" color={colors.warning} />
                )}
                {item.is_blocked && (
                  <Icon name="block-helper" size="sm" color={colors.error} />
                )}
                <Badge label={badge.label} variant={badge.variant} />
                {isLive && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    backgroundColor: colors.error + '18',
                    paddingVertical: 2,
                    paddingHorizontal: spacing.xs,
                    borderRadius: radii.xl,
                  }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error }} />
                    <Text style={{ ...typography.caption, fontSize: 10, color: colors.error, fontWeight: '700' }}>LIVE</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
                <Text
                  style={{ ...typography.caption, color: colors.textSecondary }}
                  allowFontScaling
                >
                  {callSubtitle(item)}
                </Text>
                {item.duration_seconds != null && item.duration_seconds > 0 && (
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    {' · '}{formatDuration(item.duration_seconds)}
                  </Text>
                )}
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginLeft: 'auto' }} allowFontScaling>
                  {timeAgo(item.started_at, userTz)}
                </Text>
              </View>

              {(() => {
                const ab = artifactBadge(item);
                if (!ab) return null;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                    <Icon
                      name={
                        ab.variant === 'success' ? 'check-circle-outline' :
                        ab.variant === 'error' ? 'alert-circle' :
                        ab.variant === 'warning' ? 'alert-circle-outline' :
                        'progress-clock'
                      }
                      size="sm"
                      color={
                        ab.variant === 'success' ? colors.success :
                        ab.variant === 'error' ? colors.error :
                        ab.variant === 'warning' ? colors.warning :
                        colors.primary
                      }
                    />
                    <Text
                      style={{
                        ...typography.caption,
                        color: ab.variant === 'success' ? colors.success :
                               ab.variant === 'error' ? colors.error :
                               ab.variant === 'warning' ? colors.warning :
                               colors.primary,
                      }}
                      allowFontScaling
                    >
                      {ab.label}
                    </Text>
                  </View>
                );
              })()}

              {item.booked_calendar_event_id && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                  <Icon name="calendar-check" size="sm" color={colors.primary} />
                  <Text
                    style={{ ...typography.caption, color: colors.primary, fontWeight: '500' }}
                    numberOfLines={1}
                    allowFontScaling
                  >
                    {item.booked_calendar_event_summary || 'Appointment booked'}
                  </Text>
                </View>
              )}
            </View>

            <Icon name="chevron-right" size="md" color={colors.textDisabled} />
          </View>
        </Card>
      </TouchableOpacity>
    );

    if (shouldAnimate && index < 6) {
      return <FadeIn delay={delay}>{row}</FadeIn>;
    }
    return row;
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Icon name="phone-log" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }} allowFontScaling>
          Calls
        </Text>
        {calls.length > 0 && (
          <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
            {calls.length} call{calls.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Search + Advanced filter button */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            minHeight: 48,
            ...(theme.dark
              ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }
              : {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }),
          }}
        >
          <Icon name="magnify" size="md" color={colors.textDisabled} />
          <RNTextInput
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search by name or number"
            placeholderTextColor={colors.textDisabled}
            style={{ flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: spacing.md }}
            returnKeyType="search"
            allowFontScaling
            accessibilityLabel="Search calls"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size="sm" color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        </View>

        {/* Advanced filters button */}
        <TouchableOpacity
          onPress={openFilterModal}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.xl,
            backgroundColor: activeFilterCount > 0 ? colors.primary : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            ...(theme.dark
              ? {
                  borderWidth: 1,
                  borderColor: activeFilterCount > 0 ? colors.primary : 'rgba(255,255,255,0.06)',
                }
              : {
                  shadowColor: activeFilterCount > 0 ? colors.primary : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: activeFilterCount > 0 ? 0.25 : 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }),
          }}
          accessibilityLabel="Advanced filters"
        >
          <Icon name="tune-variant" size="md" color={activeFilterCount > 0 ? colors.onPrimary : colors.textSecondary} />
          {activeFilterCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.error,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick filter chips (horizontally scrollable) */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, alignItems: 'center' }}
        >
          {QUICK_PRESETS.map((preset) => {
            const active = activeQuick === preset.key;
            return (
              <TouchableOpacity
                key={preset.key}
                onPress={() => handleQuickChange(preset)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  height: 36,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.xl,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter ${preset.label}`}
              >
                <Icon name={preset.icon} size="sm" color={active ? colors.onPrimary : colors.textSecondary} />
                <Text
                  style={{
                    ...typography.caption,
                    color: active ? colors.onPrimary : colors.textSecondary,
                    fontWeight: '600',
                  }}
                  allowFontScaling
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active filter summary + Reset */}
      {(activeFilterCount > 0 || activeQuick !== 'all') && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary + '10',
            borderRadius: radii.md,
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.sm,
            marginBottom: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <Icon name="filter-outline" size="sm" color={colors.primary} />
          <Text style={{ ...typography.caption, color: colors.primary, flex: 1, fontWeight: '500' }} allowFontScaling>
            {activeFilterCount > 0
              ? `${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`
              : `Showing: ${QUICK_PRESETS.find((p) => p.key === activeQuick)?.label ?? 'All'}`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setAdvFilters({});
              setActiveQuick('all');
              setSearchText('');
              handleResetAdvanced();
              loadCalls({});
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 4,
              paddingHorizontal: spacing.sm,
              borderRadius: radii.md,
              backgroundColor: colors.error + '18',
            }}
          >
            <Icon name="filter-remove-outline" size="sm" color={colors.error} />
            <Text style={{ ...typography.caption, color: colors.error, fontWeight: '700' }} allowFontScaling>
              Reset
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <ErrorMessage message={error} action="Retry" onAction={handleRefresh} />}

      <FlatList
        data={calls}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={
          calls.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: spacing.xl }
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ width: '100%' }}>
              <CallListSkeleton />
            </View>
          ) : (
            <StatusScreen
              icon="phone-off"
              iconColor={colors.textDisabled}
              title="No calls found"
              subtitle={
                activeFilterCount > 0 || searchText.trim()
                  ? 'Try adjusting your filters or search query.'
                  : 'Your AI assistant is ready. Calls will appear here once your number starts receiving them.'
              }
              action={{ title: 'Refresh', onPress: handleRefresh, variant: 'outline' }}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* ============ Advanced Filters Modal ============ */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              maxHeight: '85%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
              showsVerticalScrollIndicator={false}
            >
              {/* Modal header */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
                <Icon name="tune-variant" size="lg" color={colors.primary} />
                <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1, marginLeft: spacing.sm }} allowFontScaling>
                  Advanced Filters
                </Text>
                <TouchableOpacity onPress={handleResetAdvanced}>
                  <Text style={{ ...typography.caption, color: colors.error, fontWeight: '600' }} allowFontScaling>
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>

              {/* --- Group: Status --- */}
              <FilterGroupHeader icon="information-outline" label="Call Status" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
                {STATUS_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.key}
                    label={opt.label}
                    active={stagingStatus === opt.key}
                    onPress={() => setStagingStatus(opt.key)}
                    colors={colors}
                    typography={typography}
                    spacing={spacing}
                    radii={radii}
                  />
                ))}
              </View>

              {/* --- Group: Date Range --- */}
              <FilterGroupHeader icon="calendar-range" label="Date Range" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
                <FilterChip
                  label="Any time"
                  active={!stagingDatePreset}
                  onPress={() => setStagingDatePreset('')}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                />
                {DATE_PRESETS.map((dp) => (
                  <FilterChip
                    key={dp.key}
                    label={dp.label}
                    active={stagingDatePreset === dp.key}
                    onPress={() => setStagingDatePreset(dp.key)}
                    colors={colors}
                    typography={typography}
                    spacing={spacing}
                    radii={radii}
                  />
                ))}
              </View>

              {/* --- Group: Duration --- */}
              <FilterGroupHeader icon="timer-outline" label="Call Duration" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
                {DURATION_PRESETS.map((dp) => (
                  <FilterChip
                    key={dp.key}
                    label={dp.label}
                    active={stagingDurationPreset === dp.key}
                    onPress={() => setStagingDurationPreset(dp.key)}
                    colors={colors}
                    typography={typography}
                    spacing={spacing}
                    radii={radii}
                  />
                ))}
              </View>

              {/* --- Group: Call Type --- */}
              <FilterGroupHeader icon="phone-forward" label="Call Type" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
                <FilterChip
                  label="All types"
                  active={!stagingSourceType}
                  onPress={() => setStagingSourceType('')}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                />
                <FilterChip
                  label="Direct"
                  active={stagingSourceType === 'dedicated_number'}
                  onPress={() => setStagingSourceType('dedicated_number')}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  icon="phone-incoming"
                />
                <FilterChip
                  label="Forwarded"
                  active={stagingSourceType === 'forwarded'}
                  onPress={() => setStagingSourceType('forwarded')}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  icon="phone-forward"
                />
              </View>

              {/* --- Group: Country / Region --- */}
              <FilterGroupHeader icon="earth" label="Country / Region" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
                {COUNTRY_OPTIONS.slice(0, 10).map((opt) => (
                  <FilterChip
                    key={opt.code}
                    label={opt.label}
                    active={stagingCountry === opt.code}
                    onPress={() => setStagingCountry(opt.code)}
                    colors={colors}
                    typography={typography}
                    spacing={spacing}
                    radii={radii}
                  />
                ))}
                {COUNTRY_OPTIONS.length > 10 && (
                  <ExpandableCountries
                    options={COUNTRY_OPTIONS.slice(10)}
                    activeCode={stagingCountry}
                    onSelect={setStagingCountry}
                    colors={colors}
                    typography={typography}
                    spacing={spacing}
                    radii={radii}
                  />
                )}
              </View>

              {/* --- Group: Recording --- */}
              <FilterGroupHeader icon="microphone-outline" label="Recording" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg }}>
                <FilterChip
                  label="All calls"
                  active={!stagingHasRecording}
                  onPress={() => setStagingHasRecording(false)}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                />
                <FilterChip
                  label="With recording"
                  active={stagingHasRecording}
                  onPress={() => setStagingHasRecording(true)}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  icon="microphone"
                />
              </View>

              {/* --- Group: Sort --- */}
              <FilterGroupHeader icon="sort" label="Sort Order" colors={colors} typography={typography} spacing={spacing} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xl }}>
                {SORT_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.key}
                    label={opt.label}
                    active={stagingSort === opt.key}
                    onPress={() => setStagingSort(opt.key)}
                    colors={colors}
                    typography={typography}
                    spacing={spacing}
                    radii={radii}
                  />
                ))}
              </View>

              {/* Action buttons */}
              <View style={{ gap: spacing.sm }}>
                <Button title="Apply Filters" onPress={handleApplyAdvanced} variant="primary" />
                <Button title="Cancel" onPress={() => setFilterModalVisible(false)} variant="ghost" />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

// ---- Reusable sub-components ----

function FilterGroupHeader({
  icon,
  label,
  colors,
  typography,
  spacing,
}: {
  icon: string;
  label: string;
  colors: any;
  typography: any;
  spacing: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
      <Icon name={icon} size="sm" color={colors.primary} />
      <Text style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
        {label}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  colors,
  typography,
  spacing,
  radii,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
  typography: any;
  spacing: any;
  radii: any;
  icon?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderRadius: radii.xl,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      {icon && <Icon name={icon} size="sm" color={active ? colors.onPrimary : colors.textSecondary} />}
      {active && !icon && <Icon name="check" size="sm" color={colors.onPrimary} />}
      <Text
        style={{
          ...typography.caption,
          color: active ? colors.onPrimary : colors.textPrimary,
          fontWeight: active ? '700' : '500',
        }}
        allowFontScaling
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ExpandableCountries({
  options,
  activeCode,
  onSelect,
  colors,
  typography,
  spacing,
  radii,
}: {
  options: CountryOption[];
  activeCode: string;
  onSelect: (code: string) => void;
  colors: any;
  typography: any;
  spacing: any;
  radii: any;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    const hasActiveInHidden = options.some((o) => o.code === activeCode);
    return (
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: hasActiveInHidden ? colors.primary + '20' : colors.background,
          borderWidth: 1,
          borderColor: hasActiveInHidden ? colors.primary : colors.border,
          borderStyle: 'dashed',
        }}
      >
        <Icon name="dots-horizontal" size="sm" color={hasActiveInHidden ? colors.primary : colors.textSecondary} />
        <Text
          style={{
            ...typography.caption,
            color: hasActiveInHidden ? colors.primary : colors.textSecondary,
            fontWeight: '500',
          }}
          allowFontScaling
        >
          +{options.length} more
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      {options.map((opt) => (
        <FilterChip
          key={opt.code}
          label={opt.label}
          active={activeCode === opt.code}
          onPress={() => onSelect(opt.code)}
          colors={colors}
          typography={typography}
          spacing={spacing}
          radii={radii}
        />
      ))}
    </>
  );
}
