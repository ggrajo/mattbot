import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';

export function HomeScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const { currentAgent, fetchAgents } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <View style={styles.header}>
            <Text style={[typography.h1, { color: colors.textPrimary }]} allowFontScaling>
              MattBot
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]} allowFontScaling>
              Your AI call assistant is ready.
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              currentAgent
                ? navigation.navigate('AssistantSettings', { agentId: currentAgent.id })
                : navigation.navigate('OnboardingAssistantSetup')
            }
          >
            <Card>
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
                      ? `${currentAgent.personality.charAt(0).toUpperCase() + currentAgent.personality.slice(1)} personality`
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

        <FadeIn delay={160}>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
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

        <FadeIn delay={240}>
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
    gap: 12,
  },
  assistantIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
});
