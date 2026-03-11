import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';

type ScreeningAction = 'screen' | 'allow' | 'block';

interface CategoryConfig {
  label: string;
  description: string;
  options: ScreeningAction[];
  icon: string;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  unknown: {
    label: 'Unknown Callers',
    description: 'Numbers not in your contacts',
    options: ['screen', 'allow', 'block'],
    icon: '❓',
  },
  known: {
    label: 'Known Callers',
    description: 'Numbers in your contacts list',
    options: ['screen', 'allow'],
    icon: '👤',
  },
  vip: {
    label: 'VIP Callers',
    description: 'Contacts marked as VIP',
    options: ['allow'],
    icon: '⭐',
  },
};

const ACTION_LABELS: Record<ScreeningAction, string> = {
  screen: 'Screen',
  allow: 'Allow',
  block: 'Block',
};

export function CategoryDefaultsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [defaults, setDefaults] = useState<Record<string, ScreeningAction>>({
    unknown: 'screen',
    known: 'allow',
    vip: 'allow',
  });

  const handleSelect = async (category: string, action: ScreeningAction) => {
    const prev = defaults[category];
    setDefaults((d) => ({ ...d, [category]: action }));
    try {
      await apiClient.patch('/settings/screening-defaults', { [category]: action });
    } catch {
      setDefaults((d) => ({ ...d, [category]: prev }));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            Screening Defaults
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
            Choose how MattBot handles calls from each category by default.
          </Text>
        </FadeIn>

        {Object.entries(CATEGORIES).map(([key, config], idx) => (
          <FadeIn key={key} delay={60 + idx * 60}>
            <Card>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{config.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                    {config.label}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    {config.description}
                  </Text>
                </View>
              </View>
              <View style={[styles.optionsRow, { backgroundColor: colors.surfaceVariant, borderRadius: radii.md }]}>
                {config.options.map((action) => {
                  const active = defaults[key] === action;
                  return (
                    <TouchableOpacity
                      key={action}
                      style={[
                        styles.optionButton,
                        { borderRadius: radii.sm },
                        active && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => handleSelect(key, action)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: active ? colors.onPrimary : colors.textSecondary },
                        ]}
                      >
                        {ACTION_LABELS[action]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          </FadeIn>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  categoryIcon: {
    fontSize: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    padding: 4,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
