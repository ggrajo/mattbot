import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';
import { useCalendarStore } from '../store/calendarStore';
import { useStatsStore } from '../store/statsStore';
import { useRealtimeStore } from '../store/realtimeStore';

export function HomeScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii, shadows } = theme;
  const navigation = useNavigation<any>();
  const { currentAgent, fetchAgents } = useAgentStore();
  const { status: calStatus, events: calEvents, fetchStatus: fetchCalStatus, fetchEvents: fetchCalEvents } = useCalendarStore();
  const { total_calls, minutes_used, memory_items, loading: statsLoading, fetchStats } = useStatsStore();
  const { isCallActive, activeCallId } = useRealtimeStore();

  useEffect(() => {
    fetchAgents();
    fetchCalStatus();
    fetchStats();
  }, [fetchAgents, fetchCalStatus, fetchStats]);

  useEffect(() => {
    if (calStatus?.is_connected) {
      fetchCalEvents(5);
    }
  }, [calStatus?.is_connected, fetchCalEvents]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[typography.h1, { color: colors.textPrimary, letterSpacing: -0.5 }]} allowFontScaling>
                  MattBot
                </Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]} allowFontScaling>
                  Your AI call assistant is ready.
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: colors.successContainer }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        {isCallActive && (
          <FadeIn delay={40}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => activeCallId && navigation.navigate('CallDetail', { callId: activeCallId })}
            >
              <Card variant="elevated" style={{ borderColor: colors.primary, borderWidth: 2 }}>
                <View style={styles.activeCallRow}>
                  <View style={[styles.pulsingDot, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.primary, marginBottom: 2 }]}>
                      Active Call
                    </Text>
                    <Text style={[styles.cardCaption, { color: colors.textSecondary }]}>
                      Tap to view live transcript
                    </Text>
                  </View>
                  <View style={[styles.chevronCircle, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>›</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </FadeIn>
        )}

        <FadeIn delay={isCallActive ? 120 : 80}>
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Dashboard</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {statsLoading ? '–' : total_calls}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Calls</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {statsLoading ? '–' : minutes_used}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Minutes</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {statsLoading ? '–' : memory_items}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Memories</Text>
              </View>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={isCallActive ? 200 : 160}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              currentAgent
                ? navigation.navigate('AssistantSettings', { agentId: currentAgent.id })
                : navigation.navigate('OnboardingAssistantSetup')
            }
          >
            <Card variant="elevated">
              <View style={styles.assistantCardHeader}>
                <View style={[styles.assistantIcon, { backgroundColor: colors.primary }]}>
                  <Text style={styles.assistantIconText}>AI</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 2 }]}>
                    {currentAgent?.name ?? 'Set Up Assistant'}
                  </Text>
                  <Text style={[styles.cardCaption, { color: colors.textSecondary }]}>
                    {currentAgent
                      ? `${currentAgent.personality.charAt(0).toUpperCase() + currentAgent.personality.slice(1)} · ${currentAgent.language?.toUpperCase() ?? 'EN'}`
                      : 'Configure your AI call assistant'}
                  </Text>
                </View>
                <View style={[styles.chevronCircle, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600' }}>›</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={isCallActive ? 280 : 240}>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SubscriptionStatus')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryContainer }]}>
                <Text style={styles.actionEmoji}>💳</Text>
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Subscription</Text>
              <Text style={[styles.actionHint, { color: colors.textSecondary }]}>View plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('NumberProvision')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.successContainer }]}>
                <Text style={styles.actionEmoji}>📱</Text>
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Phone</Text>
              <Text style={[styles.actionHint, { color: colors.textSecondary }]}>Manage number</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CallModes')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.warningContainer }]}>
                <Text style={styles.actionEmoji}>📞</Text>
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Call Modes</Text>
              <Text style={[styles.actionHint, { color: colors.textSecondary }]}>Configure</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        {calStatus?.is_connected && calEvents.length > 0 && (
          <FadeIn delay={isCallActive ? 360 : 320}>
            <Card>
              <View style={styles.sectionHeader}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              {calEvents.slice(0, 3).map((evt) => (
                <View key={evt.event_id} style={styles.eventRow}>
                  <View style={[styles.eventBar, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{evt.title}</Text>
                    <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                      {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={calStatus?.is_connected && calEvents.length > 0 ? (isCallActive ? 440 : 400) : (isCallActive ? 360 : 320)}>
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CallsTab')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.emptyActivity, { borderColor: colors.border }]}>
              <Text style={[styles.emptyEmoji]}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No recent calls yet. Once your number is active, call activity will appear here.
              </Text>
            </View>
          </Card>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  assistantIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantIconText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionHint: {
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  eventBar: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 12,
    marginTop: 2,
  },
});
