import React, { useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useCalendarStore } from '../store/calendarStore';
import type { Theme } from '../theme/tokens';

export function CalendarScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { status, events, loading, fetchStatus, fetchEvents } = useCalendarStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.is_connected) {
      fetchEvents();
    }
  }, [status?.is_connected, fetchEvents]);

  const isConnected = status?.is_connected ?? false;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={s.heading}>Calendar</Text>
          <Text style={s.subtitle}>
            {isConnected
              ? 'Your Google Calendar is connected. Upcoming events are shown below.'
              : 'Connect your Google Calendar to let your AI assistant book appointments.'}
          </Text>
        </FadeIn>

        <FadeIn delay={80}>
          <Card>
            <View style={s.statusRow}>
              <View style={[s.statusDot, isConnected ? s.dotConnected : s.dotDisconnected]} />
              <Text style={s.statusLabel}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            {isConnected && status?.calendar_id && (
              <Text style={s.calendarId}>{status.calendar_id}</Text>
            )}
            <Button
              title={isConnected ? 'Calendar Settings' : 'Connect Calendar'}
              onPress={() => navigation.navigate('CalendarBookingSettings')}
              variant={isConnected ? 'outline' : 'primary'}
              style={s.actionButton}
            />
          </Card>
        </FadeIn>

        {isConnected && (
          <FadeIn delay={160}>
            <Card>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => fetchEvents()}>
                  <Text style={s.refreshLink}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <ActivityIndicator style={s.loader} color={theme.colors.primary} />
              ) : events.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>{'📅'}</Text>
                  <Text style={s.emptyText}>No upcoming events.</Text>
                </View>
              ) : (
                events.map((event) => (
                  <View key={event.event_id} style={s.eventRow}>
                    <View style={[s.eventBar, { backgroundColor: theme.colors.primary }]} />
                    <View style={s.eventContent}>
                      <Text style={s.eventTitle}>{event.title}</Text>
                      <Text style={s.eventTime}>
                        {formatTime(event.start_time)} – {formatTime(event.end_time)}
                      </Text>
                      {event.attendees.length > 0 && (
                        <Text style={s.eventAttendees}>
                          {event.attendees.join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </Card>
          </FadeIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function makeStyles(theme: Theme) {
  const { colors, spacing, typography, radii } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    dotConnected: { backgroundColor: colors.success },
    dotDisconnected: { backgroundColor: colors.textDisabled },
    statusLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    calendarId: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
    actionButton: { marginTop: spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitle: { ...typography.h3, color: colors.textPrimary },
    refreshLink: { ...typography.bodySmall, fontWeight: '600', color: colors.primary },
    loader: { marginVertical: spacing.xl },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyEmoji: { fontSize: 32, marginBottom: spacing.sm },
    emptyText: { ...typography.body, color: colors.textSecondary },
    eventRow: {
      flexDirection: 'row',
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    eventBar: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
    eventContent: { flex: 1 },
    eventTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    eventTime: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    eventAttendees: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  });
}
