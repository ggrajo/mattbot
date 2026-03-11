import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { Card } from '../components/ui/Card';
import { apiClient, extractApiError } from '../api/client';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  duration_minutes?: number;
  source: 'reminder' | 'google';
}

interface Reminder {
  id: string;
  title?: string;
  reminder_text?: string;
  remind_at: string;
  status?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE = 44;
const DOT_SIZE = 6;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | undefined>();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const allEvents: CalendarEvent[] = [];

      // Always load reminders
      try {
        const { data } = await apiClient.get('/reminders');
        const reminders: Reminder[] = data?.reminders ?? data ?? [];
        for (const r of reminders) {
          const remindAt = new Date(r.remind_at);
          allEvents.push({
            id: `reminder-${r.id}`,
            title: r.title || r.reminder_text || 'Reminder',
            start: r.remind_at,
            end: new Date(remindAt.getTime() + 15 * 60000).toISOString(),
            source: 'reminder',
          });
        }
      } catch {
        // Reminders may fail silently
      }

      // Check Google Calendar status and load events if connected
      try {
        const { data: statusData } = await apiClient.get('/calendar/status');
        const isConnected = !!statusData.connected;
        setGoogleConnected(isConnected);
        setGoogleEmail(statusData.email);

        if (isConnected) {
          try {
            const { data: eventsData } = await apiClient.get('/calendar/events', {
              params: { start_date: startDate, end_date: endDate },
            });
            const gEvents = eventsData?.events ?? eventsData ?? [];
            for (const e of gEvents) {
              allEvents.push({
                id: `google-${e.id}`,
                title: e.title || e.summary || 'Google Event',
                start: e.start,
                end: e.end,
                duration_minutes: e.duration_minutes,
                source: 'google',
              });
            }
          } catch {
            // Calendar events may fail silently
          }
        }
      } catch {
        setGoogleConnected(false);
      }

      setEvents(allEvents);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const key = toDateKey(new Date(event.start));
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => eventsByDate[selectedDate] ?? [],
    [eventsByDate, selectedDate],
  );

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
    const cells: Array<{ day: number; key: string } | null> = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, key });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) cells.push(null);
    }
    return cells;
  }, [currentYear, currentMonth]);

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(todayKey);
  }

  async function handleConnect() {
    setActionLoading(true);
    try {
      const { data } = await apiClient.get('/calendar/auth-url');
      const url = data.url || data.auth_url;
      if (url) {
        await Linking.openURL(url);
      }
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to get auth URL');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Calendar',
      'Are you sure you want to disconnect your Google Calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiClient.delete('/calendar/disconnect');
              setGoogleConnected(false);
              setGoogleEmail(undefined);
              setEvents((prev) => prev.filter((e) => e.source !== 'google'));
            } catch (e) {
              Alert.alert('Error', extractApiError(e) || 'Failed to disconnect');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function formatEventTime(start: string): string {
    const s = new Date(start);
    return s.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatSelectedDate(dateKey: string): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (dateKey === todayKey) return 'Today';
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  if (loading && events.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View
          style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }} allowFontScaling>
            {error}
          </Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={{ ...typography.bodySmall, color: colors.error, fontWeight: '700' }} allowFontScaling>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Calendar Card */}
      <FadeIn slide="up" delay={0}>
        <Card style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
          {/* Month/Year Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <TouchableOpacity
              onPress={goToPrevMonth}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.full,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="chevron-left" size="md" color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={goToToday}>
              <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToNextMonth}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.full,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="chevron-right" size="md" color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((day) => (
              <View key={day} style={{ flex: 1, alignItems: 'center', paddingBottom: spacing.sm }}>
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.textSecondary,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                  allowFontScaling
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((cell, index) => {
              if (!cell) {
                return <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, height: CELL_SIZE + DOT_SIZE + 4, alignItems: 'center' }} />;
              }

              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDate;
              const hasEvents = !!eventsByDate[cell.key];

              return (
                <TouchableOpacity
                  key={cell.key}
                  onPress={() => setSelectedDate(cell.key)}
                  activeOpacity={0.6}
                  style={{
                    width: `${100 / 7}%`,
                    height: CELL_SIZE + DOT_SIZE + 4,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: CELL_SIZE / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderWidth: isToday && !isSelected ? 2 : 0,
                      borderColor: isToday && !isSelected ? colors.primary : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontWeight: isToday || isSelected ? '700' : '400',
                        color: isSelected
                          ? colors.onPrimary
                          : isToday
                            ? colors.primary
                            : colors.textPrimary,
                      }}
                      allowFontScaling
                    >
                      {cell.day}
                    </Text>
                  </View>
                  {hasEvents && (
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                      {(eventsByDate[cell.key] || []).slice(0, 3).map((ev, i) => (
                        <View
                          key={i}
                          style={{
                            width: DOT_SIZE,
                            height: DOT_SIZE,
                            borderRadius: DOT_SIZE / 2,
                            backgroundColor: ev.source === 'google' ? colors.accent : colors.primary,
                          }}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </FadeIn>

      {/* Events for Selected Day */}
      <FadeIn slide="up" delay={100}>
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
          <Text
            style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}
            allowFontScaling
          >
            {formatSelectedDate(selectedDate)}
          </Text>

          {loading && (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {!loading && selectedEvents.length === 0 && (
            <Card variant="flat" style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Icon name="calendar-blank-outline" size="xl" color={colors.textDisabled} />
              <Text
                style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}
                allowFontScaling
              >
                No events for this day
              </Text>
            </Card>
          )}

          {selectedEvents.map((event) => (
            <Card
              key={event.id}
              style={{
                marginBottom: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 4,
                  height: '100%',
                  minHeight: 40,
                  backgroundColor: event.source === 'google' ? colors.accent : colors.primary,
                  borderRadius: 2,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  {event.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
                  <Icon name="clock-outline" size="sm" color={colors.textSecondary} />
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    {formatEventTime(event.start)}
                  </Text>
                  {event.source === 'google' && (
                    <View
                      style={{
                        backgroundColor: colors.accent + '20',
                        paddingHorizontal: spacing.xs + 2,
                        paddingVertical: 1,
                        borderRadius: radii.sm,
                        marginLeft: spacing.xs,
                      }}
                    >
                      <Text style={{ ...typography.caption, color: colors.accent, fontSize: 10, fontWeight: '600' }} allowFontScaling>
                        GOOGLE
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>
      </FadeIn>

      {/* Booking Settings Link (when Google Calendar connected) */}
      {googleConnected && (
        <FadeIn slide="up" delay={200}>
          <TouchableOpacity
            onPress={() => navigation.navigate('CalendarBookingSettings' as never)}
            style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}
          >
            <Card
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <Icon name="cog-outline" size="lg" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                  Booking Settings
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  Availability, buffer times, duration
                </Text>
              </View>
              <Icon name="chevron-right" size="md" color={colors.textDisabled} />
            </Card>
          </TouchableOpacity>
        </FadeIn>
      )}

      {/* Google Calendar Integration Card */}
      <FadeIn slide="up" delay={300}>
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.md,
                  backgroundColor: (googleConnected ? colors.success : colors.textSecondary) + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={googleConnected ? 'calendar-check' : 'calendar-plus'}
                  size="xl"
                  color={googleConnected ? colors.success : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                  Google Calendar
                </Text>
                {googleConnected ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                    <Text style={{ ...typography.caption, color: colors.success }} allowFontScaling>
                      Connected{googleEmail ? ` · ${googleEmail}` : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                    Sync events from Google Calendar
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={googleConnected ? handleDisconnect : handleConnect}
              disabled={actionLoading}
              style={{
                marginTop: spacing.md,
                backgroundColor: googleConnected ? colors.errorContainer : colors.primary,
                borderRadius: radii.lg,
                paddingVertical: spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: spacing.sm,
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={googleConnected ? colors.error : colors.onPrimary} />
              ) : (
                <>
                  <Icon
                    name={googleConnected ? 'link-off' : 'link-variant'}
                    size="md"
                    color={googleConnected ? colors.error : colors.onPrimary}
                  />
                  <Text
                    style={{
                      ...typography.button,
                      color: googleConnected ? colors.error : colors.onPrimary,
                    }}
                    allowFontScaling
                  >
                    {googleConnected ? 'Disconnect' : 'Connect Google Calendar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Card>
        </View>
      </FadeIn>
    </ScrollView>
  );
}
