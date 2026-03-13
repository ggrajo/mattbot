import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  Pressable,
  RefreshControl,
  Linking,
  AppState,
  ScrollView,
  Modal,
  Dimensions,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useCalendarStore } from '../store/calendarStore';
import { useSettingsStore } from '../store/settingsStore';
import { getDeviceTimezone } from '../utils/formatDate';
import { getTimezoneAbbr } from '../utils/timezones';
import { getCalendarAuthUrl } from '../api/calendar';
import type { CalendarEvent } from '../api/calendar';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type DisplayStatus = 'upcoming' | 'in_progress' | 'done' | 'cancelled' | 'tentative';
type ViewMode = 'month' | 'week' | 'day' | 'list';
type FilterKey = 'all' | 'ai_booked' | 'manual' | 'upcoming' | 'done' | 'cancelled' | 'today' | 'this_week';

const EVENT_ACCENT_PALETTE = [
  '#F87171', '#818CF8', '#FBBF24', '#34D399', '#38BDF8',
  '#2DD4BF', '#FB923C', '#F472B6', '#10B981', '#A78BFA',
];

function hashStringToIndex(str: string, len: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

function getEventAccent(ev: CalendarEvent): string {
  return EVENT_ACCENT_PALETTE[hashStringToIndex(ev.id || ev.summary, EVENT_ACCENT_PALETTE.length)];
}

const FILTER_PRESETS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'calendar-outline' },
  { key: 'ai_booked', label: 'AI-Booked', icon: 'robot-outline' },
  { key: 'manual', label: 'Manual', icon: 'pencil-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'clock-outline' },
  { key: 'done', label: 'Done', icon: 'check-circle-outline' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
  { key: 'today', label: 'Today', icon: 'calendar-today' },
  { key: 'this_week', label: 'This Week', icon: 'calendar-week' },
];

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getEventDisplayStatus(event: CalendarEvent): DisplayStatus {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'tentative') return 'tentative';
  const now = new Date();
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (now >= start && now <= end) return 'in_progress';
  if (now > end) return 'done';
  return 'upcoming';
}

function fmtTime(iso: string, tz?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    if (tz) opts.timeZone = tz;
    return new Date(iso).toLocaleTimeString(undefined, opts);
  } catch {
    return '';
  }
}

function fmtTimeShort(iso: string, tz?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    if (tz) opts.timeZone = tz;
    return new Date(iso).toLocaleTimeString('en-US', opts).replace(' ', '');
  } catch {
    return '';
  }
}

function fmtDate(iso: string, tz?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    if (tz) opts.timeZone = tz;
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return '';
  }
}

function fmtDateMedium(iso: string, tz?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    if (tz) opts.timeZone = tz;
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return '';
  }
}

function durationMins(start: string, end: string): number {
  try {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  } catch {
    return 0;
  }
}

function isSameDay(a: string, b: string): boolean {
  return a.split('T')[0] === b.split('T')[0];
}

function datePartsInTz(iso: string, tz: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function isTodayInTz(dateStr: string, tz: string): boolean {
  const d = datePartsInTz(dateStr, tz);
  const n = datePartsInTz(new Date().toISOString(), tz);
  return d.year === n.year && d.month === n.month && d.day === n.day;
}

function isThisWeekInTz(dateStr: string, tz: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function getWeekDates(dateStr: string): Date[] {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - day + i);
    dates.push(dd);
  }
  return dates;
}

function getDateKey(iso: string): string {
  return iso.split('T')[0] || iso;
}

function tzAbbr(tz: string): string {
  return getTimezoneAbbr(tz);
}

function maskPhone(e164: string): string {
  if (!e164 || e164.length <= 6) return e164;
  return e164.slice(0, 2) + '*'.repeat(e164.length - 6) + e164.slice(-4);
}

function hourFromISO(iso: string, tz?: string): number {
  const d = new Date(iso);
  if (!tz) return d.getHours() + d.getMinutes() / 60;
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: 'numeric', hour12: false, timeZone: tz,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h + m / 60;
}

export function CalendarScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii, shadows } = theme;
  const navigation = useNavigation<NavProp>();
  const route = useRoute<any>();
  const { status, events, loading, error, loadStatus, loadEvents } = useCalendarStore();
  const userTz = useSettingsStore(s => s.settings?.timezone) || getDeviceTimezone();

  const initialDate = route.params?.date;
  const [selectedDate, setSelectedDate] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [revealedCallerPhones, setRevealedCallerPhones] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialDate && initialDate !== selectedDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const statusColors: Record<DisplayStatus, string> = useMemo(() => ({
    upcoming: colors.primary,
    in_progress: colors.success,
    done: colors.textSecondary,
    cancelled: colors.error,
    tentative: colors.warning,
  }), [colors]);

  const statusLabels: Record<DisplayStatus, string> = {
    upcoming: 'Upcoming',
    in_progress: 'In Progress',
    done: 'Done',
    cancelled: 'Cancelled',
    tentative: 'Tentative',
  };

  const isConnected = status?.connected ?? false;
  const needsReauth = status?.needs_reauth === true;

  // --- Data loading ---
  const loadEventsForRange = useCallback(() => {
    if (!useCalendarStore.getState().status?.connected) return;
    const ref = new Date(selectedDate + 'T12:00:00');
    if (isNaN(ref.getTime())) return;
    const start = new Date(ref);
    const end = new Date(ref);
    if (viewMode === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
    } else {
      // day or list: just the selected day
    }
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    loadEvents(start.toISOString(), end.toISOString());
  }, [selectedDate, viewMode, loadEvents]);

  useEffect(() => {
    loadStatus();
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('calendar-connected')) loadStatus();
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
      loadEventsForRange();
      const interval = setInterval(loadEventsForRange, 60_000);
      return () => clearInterval(interval);
    }, [loadEventsForRange]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && useCalendarStore.getState().status?.connected) {
        loadEventsForRange();
      }
    });
    return () => sub.remove();
  }, [loadEventsForRange]);

  useEffect(() => {
    if (status?.connected) loadEventsForRange();
  }, [status?.connected, selectedDate, viewMode]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatus();
    loadEventsForRange();
    setRefreshing(false);
  }, [loadEventsForRange]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleRefresh} style={{ paddingHorizontal: 16 }}>
          <Icon name="refresh" size={22} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [navigation, handleRefresh, colors]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { auth_url } = await getCalendarAuthUrl();
      await Linking.openURL(auth_url);
    } catch {
      setToast('Failed to start calendar connection');
    } finally {
      setConnecting(false);
    }
  };

  // --- Filtering ---
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (activeFilter !== 'all') {
      filtered = filtered.filter((ev) => {
        const ds = getEventDisplayStatus(ev);
        switch (activeFilter) {
          case 'ai_booked': return ev.is_mattbot_booked;
          case 'manual': return !ev.is_mattbot_booked;
          case 'upcoming': return ds === 'upcoming' || ds === 'in_progress';
          case 'done': return ds === 'done';
          case 'cancelled': return ds === 'cancelled';
          case 'today': return isTodayInTz(ev.start, userTz);
          case 'this_week': return isThisWeekInTz(ev.start, userTz);
          default: return true;
        }
      });
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (ev) =>
          ev.summary.toLowerCase().includes(q) ||
          (ev.description || '').toLowerCase().includes(q) ||
          (ev.caller_name || '').toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [events, activeFilter, searchText, userTz]);

  const dayEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.start?.startsWith(selectedDate)),
    [filteredEvents, selectedDate],
  );

  const sectionData = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    for (const ev of filteredEvents) {
      const key = getDateKey(ev.start);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, data]) => ({
        title: fmtDate(dateKey + 'T00:00:00', userTz),
        data,
      }));
  }, [filteredEvents, userTz]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const ev of events) {
      const dateStr = ev.start?.split('T')[0];
      if (!dateStr) continue;
      const accent = getEventAccent(ev);
      if (!marks[dateStr]) {
        marks[dateStr] = { dots: [{ color: accent, key: ev.id }] };
      } else {
        const dots = marks[dateStr].dots || [];
        if (dots.length < 3) dots.push({ color: accent, key: ev.id });
        marks[dateStr].dots = dots;
      }
    }
    for (const key of Object.keys(marks)) {
      marks[key] = { ...marks[key], marked: true };
    }
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: colors.primary,
      };
    }
    return marks;
  }, [events, selectedDate, colors.primary]);

  // --- Date header ---
  const dateHeaderText = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short' };
    if (userTz) opts.timeZone = userTz;
    return `${d.getDate()} ${d.toLocaleDateString(undefined, opts)} ${d.getFullYear()}`;
  }, [selectedDate, userTz]);

  // ================================================================
  // VIEW TOGGLE (Month / Week / Day) - pill style like reference
  // ================================================================
  const renderViewToggle = () => (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant,
      borderRadius: radii.full,
      padding: 3,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    }}>
      {(['month', 'week', 'day', 'list'] as const).map((mode) => {
        const active = viewMode === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => setViewMode(mode)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm + 2,
              borderRadius: radii.full,
              backgroundColor: active ? colors.surface : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              ...(active ? shadows.card : {}),
            }}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: active ? '700' : '500',
              color: active ? colors.textPrimary : colors.textSecondary,
            }}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ================================================================
  // EVENT CARD - colorful with accent bar, matching reference style
  // ================================================================
  const renderEventCard = (item: CalendarEvent, showDate = false) => {
    const accent = getEventAccent(item);
    const ds = getEventDisplayStatus(item);
    const isDone = ds === 'done' || ds === 'cancelled';
    return (
      <Pressable
        key={item.id}
        onPress={() => setSelectedEvent(item)}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{
          flexDirection: 'row',
          backgroundColor: accent + '18',
          borderRadius: radii.md,
          marginBottom: spacing.sm,
          overflow: 'hidden',
          borderLeftWidth: 5,
          borderLeftColor: accent,
        }}>
          <View style={{ flex: 1, padding: spacing.md, gap: 2 }}>
            <Text
              style={{
                ...typography.body,
                fontWeight: '600',
                color: isDone ? colors.textSecondary : colors.textPrimary,
                textDecorationLine: ds === 'cancelled' ? 'line-through' : 'none',
              }}
              numberOfLines={1}
            >
              {item.summary}
            </Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>
              {fmtTimeShort(item.start, userTz)}-{fmtTimeShort(item.end, userTz)}
              {showDate ? `  ·  ${fmtDateMedium(item.start, userTz)}` : ''}
            </Text>
            {item.is_mattbot_booked && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Icon name="robot-outline" size={11} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>AI Booked</Text>
              </View>
            )}
          </View>
          {ds !== 'done' && ds !== 'upcoming' && (
            <View style={{
              paddingHorizontal: spacing.sm, justifyContent: 'center',
            }}>
              <View style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radii.sm,
                backgroundColor: statusColors[ds] + '30',
              }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: statusColors[ds] }}>
                  {statusLabels[ds].toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // ================================================================
  // FILTER CHIPS (for list/search mode in week view)
  // ================================================================
  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
    >
      {FILTER_PRESETS.map((preset) => {
        const active = activeFilter === preset.key;
        return (
          <Pressable
            key={preset.key}
            onPress={() => setActiveFilter(preset.key)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingVertical: spacing.xs + 2,
              paddingHorizontal: spacing.md,
              borderRadius: radii.full,
              backgroundColor: active ? colors.primary : colors.surfaceVariant,
            }}
          >
            <Icon name={preset.icon} size={13} color={active ? colors.onPrimary : colors.textSecondary} />
            <Text style={{
              fontSize: 12, fontWeight: active ? '700' : '500',
              color: active ? colors.onPrimary : colors.textPrimary,
            }}>
              {preset.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  // ================================================================
  // TIMELINE RENDERER (for Week + Day views)
  // ================================================================
  const renderTimeline = (dayKey: string, eventsForDay: CalendarEvent[], colWidth?: number) => {
    const nowHour = hourFromISO(new Date().toISOString(), userTz);
    const isTodayDay = isTodayInTz(dayKey + 'T00:00:00', userTz);
    const width = colWidth || Dimensions.get('window').width - spacing.lg * 2 - 50;

    return (
      <View style={{ position: 'relative', height: HOUR_HEIGHT * 24 }}>
        {HOURS.map((h) => (
          <View
            key={h}
            style={{
              position: 'absolute',
              top: h * HOUR_HEIGHT,
              left: 0, right: 0,
              height: HOUR_HEIGHT,
              borderTopWidth: 1,
              borderTopColor: colors.border + '40',
            }}
          />
        ))}

        {isTodayDay && (
          <View style={{
            position: 'absolute',
            top: nowHour * HOUR_HEIGHT,
            left: -6, right: 0,
            flexDirection: 'row', alignItems: 'center', zIndex: 10,
          }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error }} />
            <View style={{ flex: 1, height: 1.5, backgroundColor: colors.error }} />
          </View>
        )}

        {eventsForDay.map((ev) => {
          const startH = hourFromISO(ev.start, userTz);
          const endH = hourFromISO(ev.end, userTz);
          const top = startH * HOUR_HEIGHT;
          const height = Math.max((endH - startH) * HOUR_HEIGHT, 24);
          const accent = getEventAccent(ev);
          return (
            <Pressable
              key={ev.id}
              onPress={() => setSelectedEvent(ev)}
              style={{
                position: 'absolute',
                top,
                left: 2,
                width: width - 4,
                height,
                backgroundColor: accent + '30',
                borderRadius: radii.sm,
                borderLeftWidth: 3,
                borderLeftColor: accent,
                paddingHorizontal: spacing.xs + 2,
                paddingVertical: 2,
                overflow: 'hidden',
                zIndex: 5,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}
                numberOfLines={1}
              >
                {ev.summary}
              </Text>
              {height > 30 && (
                <Text style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>
                  {fmtTimeShort(ev.start, userTz)}-{fmtTimeShort(ev.end, userTz)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  // ================================================================
  // EVENT DETAIL SHEET (reference: Details view)
  // ================================================================
  const renderEventDetailSheet = () => {
    if (!selectedEvent) return null;
    const ds = getEventDisplayStatus(selectedEvent);
    const accent = getEventAccent(selectedEvent);
    const barColor = statusColors[ds];
    const dur = durationMins(selectedEvent.start, selectedEvent.end);
    const eventDate = new Date(selectedEvent.start);

    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setSelectedEvent(null)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              maxHeight: '85%',
              ...shadows.modal,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
            >
              {/* Drag handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg }} />

              {/* Title */}
              <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm }}>
                {selectedEvent.summary}
              </Text>

              {/* Status badge */}
              <View style={{
                alignSelf: 'flex-start',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radii.full,
                backgroundColor: barColor + '25',
                marginBottom: spacing.lg,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: barColor, textTransform: 'uppercase' }}>
                  {statusLabels[ds]}
                </Text>
              </View>

              {/* Date card (like reference) */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: accent + '15',
                borderRadius: radii.md,
                overflow: 'hidden',
                marginBottom: spacing.lg,
              }}>
                <View style={{
                  width: 80,
                  backgroundColor: accent + '25',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.md,
                }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: accent }}>
                    {eventDate.toLocaleDateString(undefined, { day: 'numeric', timeZone: userTz })}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: accent }}>
                    {eventDate.toLocaleDateString(undefined, { month: 'short', timeZone: userTz })}
                  </Text>
                </View>
                <View style={{ flex: 1, padding: spacing.md, justifyContent: 'center' }}>
                  <Text style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }}>
                    {eventDate.toLocaleDateString(undefined, { weekday: 'long', timeZone: userTz })}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                    {fmtTime(selectedEvent.start, userTz)} - {fmtTime(selectedEvent.end, userTz)} {tzAbbr(userTz)}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                    {dur} minutes
                  </Text>
                </View>
              </View>

              {/* Location */}
              {selectedEvent.location ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                  marginBottom: spacing.lg,
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radii.md,
                  padding: spacing.md,
                }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: colors.primary + '20',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="map-marker" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.bodySmall, color: colors.textPrimary }}>{selectedEvent.location}</Text>
                  </View>
                </View>
              ) : null}

              {/* Description */}
              {selectedEvent.description ? (
                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Details
                  </Text>
                  <Text style={{ ...typography.bodySmall, color: colors.textPrimary, lineHeight: 22 }} numberOfLines={8}>
                    {selectedEvent.description}
                  </Text>
                </View>
              ) : null}

              {/* AI Booked caller info */}
              {selectedEvent.is_mattbot_booked && (
                <View style={{
                  backgroundColor: colors.primaryContainer + '80',
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                  gap: spacing.sm,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name="robot-outline" size={18} color={colors.primary} />
                    <Text style={{ ...typography.bodySmall, color: colors.primary, fontWeight: '600' }}>
                      Booked by AI Assistant
                    </Text>
                  </View>
                  {selectedEvent.caller_name && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Icon name="account-outline" size={16} color={colors.textSecondary} />
                      <Text style={{ ...typography.bodySmall, color: colors.textPrimary }}>
                        {selectedEvent.caller_name}
                      </Text>
                    </View>
                  )}
                  {selectedEvent.caller_phone && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Icon name="phone-outline" size={16} color={colors.textSecondary} />
                      <TouchableOpacity
                        onPress={() => {
                          setRevealedCallerPhones(prev => {
                            const next = new Set(prev);
                            if (next.has(selectedEvent.id)) {
                              next.delete(selectedEvent.id);
                            } else {
                              next.add(selectedEvent.id);
                            }
                            return next;
                          });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={revealedCallerPhones.has(selectedEvent.id) ? 'Tap to hide number' : 'Tap to reveal number'}
                        accessibilityHint={revealedCallerPhones.has(selectedEvent.id) ? 'Hide the full phone number' : 'Reveal the full phone number'}
                      >
                        <Text style={{ ...typography.bodySmall, color: colors.textPrimary }}>
                          {revealedCallerPhones.has(selectedEvent.id) ? selectedEvent.caller_phone : maskPhone(selectedEvent.caller_phone)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={{ gap: spacing.sm }}>
                {selectedEvent.call_id && (
                  <Button
                    title="View Call Details"
                    icon="phone-outline"
                    variant="outline"
                    onPress={() => {
                      setSelectedEvent(null);
                      navigation.navigate('CallDetail', { callId: selectedEvent.call_id! });
                    }}
                  />
                )}
                <Button
                  title="Close"
                  variant="ghost"
                  onPress={() => setSelectedEvent(null)}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // ================================================================
  // CONNECT BANNER (shown inline when Google Calendar is not connected)
  // ================================================================
  const renderConnectBanner = () => {
    if (isConnected && !needsReauth) return null;
    return (
      <Pressable
        onPress={handleConnect}
        disabled={connecting}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          backgroundColor: colors.primaryContainer + '60',
          borderRadius: radii.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.primary + '30',
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.primary + '20',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="google" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }}>
            {needsReauth ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
          </Text>
          <Text style={{ ...typography.caption, color: needsReauth ? colors.warning : colors.textSecondary }}>
            {needsReauth ? 'Session expired - tap to reconnect' : 'Sync your events and let your assistant book meetings'}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textSecondary} />
      </Pressable>
    );
  };

  // ================================================================
  // WEEK VIEW - timeline with 7 columns
  // ================================================================
  if (viewMode === 'week') {
    const weekDates = getWeekDates(selectedDate);
    const screenW = Dimensions.get('window').width;
    const colW = (screenW - 50) / 7;

    return (
      <ScreenWrapper scroll={false}>
        <View style={{ paddingTop: spacing.sm }}>
          {/* Date header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>
              {dateHeaderText}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceVariant, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
              <Icon name="earth" size={11} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{tzAbbr(userTz)}</Text>
            </View>
          </View>
          {renderViewToggle()}
          {renderConnectBanner()}

          {/* Week day headers */}
          <View style={{ flexDirection: 'row', paddingLeft: 50 }}>
            {weekDates.map((d, i) => {
              const key = d.toISOString().split('T')[0];
              const isSel = key === selectedDate;
              const isT = isTodayInTz(d.toISOString(), userTz);
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelectedDate(key)}
                  style={{ width: colW, alignItems: 'center', paddingVertical: spacing.xs }}
                >
                  <Text style={{
                    fontSize: 10, fontWeight: '500',
                    color: isSel ? colors.primary : colors.textSecondary,
                  }}>
                    {WEEK_DAYS[i]}
                  </Text>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSel ? colors.primary : 'transparent',
                    marginTop: 2,
                  }}>
                    <Text style={{
                      fontSize: 14, fontWeight: isT || isSel ? '700' : '400',
                      color: isSel ? colors.onPrimary : isT ? colors.primary : colors.textPrimary,
                    }}>
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        >
          <View style={{ flexDirection: 'row' }}>
            {/* Hour labels */}
            <View style={{ width: 50 }}>
              {HOURS.map((h) => (
                <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 2, paddingRight: spacing.xs }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'right' }}>
                    {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns */}
            {weekDates.map((d, i) => {
              const key = d.toISOString().split('T')[0];
              const dayEvs = events.filter((ev) => getDateKey(ev.start) === key);
              return (
                <View key={i} style={{ width: colW, borderLeftWidth: 0.5, borderLeftColor: colors.border + '30' }}>
                  {renderTimeline(key, dayEvs, colW)}
                </View>
              );
            })}
          </View>
        </ScrollView>
        {error && <View style={{ paddingHorizontal: spacing.lg }}><ErrorMessage message={error} /></View>}
        <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
        {renderEventDetailSheet()}
      </ScreenWrapper>
    );
  }

  // ================================================================
  // DAY VIEW - full day timeline with hour labels
  // ================================================================
  if (viewMode === 'day') {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ paddingTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>
              {dateHeaderText}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceVariant, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
              <Icon name="earth" size={11} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{tzAbbr(userTz)}</Text>
            </View>
          </View>
          {renderViewToggle()}

          {/* Day navigation */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
          }}>
            <Pressable onPress={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}>
              <Icon name="chevron-left" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
              {fmtDate(selectedDate + 'T00:00:00', userTz)}
            </Text>
            <Pressable onPress={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {renderFilterChips()}
          {renderConnectBanner()}
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        >
          <View style={{ flexDirection: 'row' }}>
            {/* Hour labels */}
            <View style={{ width: 50 }}>
              {HOURS.map((h) => (
                <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 2, paddingRight: spacing.xs }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'right' }}>
                    {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Timeline column */}
            <View style={{ flex: 1 }}>
              {renderTimeline(selectedDate, dayEvents)}
            </View>
          </View>
        </ScrollView>
        {error && <View style={{ paddingHorizontal: spacing.lg }}><ErrorMessage message={error} /></View>}
        <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
        {renderEventDetailSheet()}
      </ScreenWrapper>
    );
  }

  // ================================================================
  // MONTH VIEW - calendar grid + event cards below
  // ================================================================
  if (viewMode === 'list') {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ paddingTop: spacing.sm }}>
          {/* Date header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>
              All Events
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceVariant, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
              <Icon name="earth" size={11} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{tzAbbr(userTz)}</Text>
            </View>
          </View>
          {renderViewToggle()}

          {/* Search bar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            backgroundColor: colors.surface, borderRadius: radii.md,
            paddingHorizontal: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Icon name="magnify" size={18} color={colors.textDisabled} />
            <RNTextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search events..."
              placeholderTextColor={colors.textDisabled}
              style={{ flex: 1, ...typography.bodySmall, color: colors.textPrimary, paddingVertical: spacing.sm }}
            />
            {searchText ? (
              <Pressable onPress={() => setSearchText('')}>
                <Icon name="close-circle" size={16} color={colors.textDisabled} />
              </Pressable>
            ) : null}
          </View>

          {renderFilterChips()}
          {renderConnectBanner()}
        </View>

        <SectionList
          sections={sectionData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: spacing.lg }}>
              {renderEventCard(item, true)}
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <View style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              backgroundColor: colors.background,
            }}>
              <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '600' }}>
                {section.title}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
              <Icon name="calendar-blank-outline" size={40} color={colors.textDisabled} />
              <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
                {activeFilter !== 'all' || searchText ? 'No events match your filters' : 'No events found'}
              </Text>
            </View>
          }
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
        {error && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <ErrorMessage message={error} />
          </View>
        )}
        <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
        {renderEventDetailSheet()}
      </ScreenWrapper>
    );
  }

  // ================================================================
  // MONTH VIEW - calendar grid + event cards below
  // ================================================================
  return (
    <ScreenWrapper scroll={false}>
      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderEventCard(item)}
        ListHeaderComponent={
          <View>
            {/* Date header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, marginBottom: spacing.sm }}>
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                {dateHeaderText}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceVariant, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                <Icon name="earth" size={11} color={colors.textSecondary} />
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{tzAbbr(userTz)}</Text>
              </View>
            </View>
            {renderViewToggle()}
            {renderConnectBanner()}

            <Calendar
              key={theme.dark ? 'dark' : 'light'}
              current={selectedDate}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              markingType="multi-dot"
              theme={{
                calendarBackground: colors.background,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: colors.primary,
                dayTextColor: colors.textPrimary,
                textDisabledColor: colors.textDisabled,
                monthTextColor: colors.textPrimary,
                arrowColor: colors.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '500',
              }}
              style={{ marginBottom: spacing.sm }}
              hideExtraDays={false}
            />

            <View style={{
              paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long', month: 'long', day: 'numeric', timeZone: userTz,
                })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  backgroundColor: colors.surfaceVariant, borderRadius: radii.sm,
                  paddingHorizontal: spacing.sm, paddingVertical: 2,
                }}>
                  <Icon name="earth" size={11} color={colors.textSecondary} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                    {tzAbbr(userTz)}
                  </Text>
                </View>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Icon name="calendar-blank-outline" size={32} color={colors.textDisabled} />
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
              No events on this day
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />
      {error && (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ErrorMessage message={error} />
        </View>
      )}
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
      {renderEventDetailSheet()}
    </ScreenWrapper>
  );
}
