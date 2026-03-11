import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';

export function HomeScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const { currentAgent, fetchAgents } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
            <Text style={[styles.hamburgerIcon, { color: colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
          <Text style={[typography.h1, { color: colors.textPrimary, flex: 1 }]} allowFontScaling>
            MattBot
          </Text>
        </View>

        <Text style={[typography.body, { color: colors.textSecondary }]} allowFontScaling>
          Good to see you! Your AI call assistant is ready.
        </Text>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Subscription</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Check the drawer menu to view or manage your plan.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Phone Number</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Provision or manage your MattBot number from the drawer.
          </Text>
        </Card>

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
              <View style={styles.assistantIcon}>
                <Text style={styles.assistantIconText}>AI</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  {currentAgent?.name ?? 'Set Up Assistant'}
                </Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                  {currentAgent
                    ? `${currentAgent.personality.charAt(0).toUpperCase() + currentAgent.personality.slice(1)} personality`
                    : 'Configure your AI call assistant'}
                </Text>
              </View>
              <Text style={{ color: colors.textDisabled, fontSize: 18 }}>›</Text>
            </View>
          </Card>
        </TouchableOpacity>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            No recent calls yet. Once your number is active, call activity will appear here.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburger: {
    padding: 4,
  },
  hamburgerIcon: {
    fontSize: 28,
    lineHeight: 32,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assistantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
