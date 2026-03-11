import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';
import type { Theme } from '../theme/tokens';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface DayHours {
  enabled: boolean;
  open: string;
  close: string;
}

const DEFAULT_HOURS: Record<string, DayHours> = Object.fromEntries(
  DAYS.map((day) => [
    day,
    {
      enabled: ['Saturday', 'Sunday'].includes(day) ? false : true,
      open: '09:00',
      close: '17:00',
    },
  ])
);

export function BusinessHoursScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { currentAgent, updateAgent } = useAgentStore();

  const [hours, setHours] = useState<Record<string, DayHours>>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleSave = async () => {
    if (!currentAgent) {
      Alert.alert('Error', 'No assistant configured yet.');
      return;
    }
    setSaving(true);
    const result = await updateAgent(currentAgent.id, { business_hours: hours } as any);
    setSaving(false);
    if (result) {
      Alert.alert('Saved', 'Business hours updated.');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn delay={0}>
          <Text style={s.heading}>Business Hours</Text>
          <Text style={s.subtitle}>
            Set when your AI assistant is available to take calls. Outside these hours, calls go to voicemail.
          </Text>
        </FadeIn>

        <FadeIn delay={80}>
          <Card>
            {DAYS.map((day, index) => (
              <View key={day}>
                <View style={s.dayRow}>
                  <View style={s.dayInfo}>
                    <Text style={s.dayName}>{day}</Text>
                    <Text style={s.dayTime}>
                      {hours[day].enabled
                        ? `${hours[day].open} – ${hours[day].close}`
                        : 'Closed'}
                    </Text>
                  </View>
                  <Switch
                    value={hours[day].enabled}
                    onValueChange={() => toggleDay(day)}
                    trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                    thumbColor={hours[day].enabled ? theme.colors.primary : theme.colors.textDisabled}
                  />
                </View>
                {index < DAYS.length - 1 && <View style={s.separator} />}
              </View>
            ))}
          </Card>
        </FadeIn>

        <FadeIn delay={160}>
          <Button
            title="Save Business Hours"
            onPress={handleSave}
            loading={saving}
            style={s.saveButton}
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    dayInfo: { flex: 1 },
    dayName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    dayTime: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    saveButton: { marginTop: spacing.xl },
  });
}
