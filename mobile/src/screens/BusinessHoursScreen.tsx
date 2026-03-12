import React, { useEffect, useState } from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessHours'>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BusinessHoursScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { settings, loading, saving, updateSettings, loadSettings } = useSettingsStore();
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [afterHours, setAfterHours] = useState('voicemail');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => {
    if (settings) {
      setEnabled(settings.business_hours_enabled);
      setStart(settings.business_hours_start ?? '09:00');
      setEnd(settings.business_hours_end ?? '17:00');
      setDays(settings.business_hours_days ?? [1, 2, 3, 4, 5]);
      setAfterHours(settings.after_hours_behavior ?? 'voicemail');
    }
  }, [settings]);

  const toggleDay = (day: number) => {
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  const handleSave = async () => {
    const ok = await updateSettings({
      business_hours_enabled: enabled,
      business_hours_start: start,
      business_hours_end: end,
      business_hours_days: days,
      after_hours_behavior: afterHours,
    });
    if (ok) {
      setToast({ message: 'Business hours saved', type: 'success' });
      setTimeout(() => navigation.goBack(), 500);
    } else {
      setToast({ message: 'Failed to save', type: 'error' });
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Card style={{ padding: spacing.lg, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Enable Business Hours</Text>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.primary }} />
          </View>
        </Card>
        {enabled && (
          <>
            <Card style={{ padding: spacing.lg, marginBottom: spacing.md }}>
              <Text style={{ ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm }}>Hours</Text>
              <Text style={{ ...typography.body, color: colors.textPrimary }}>{start} - {end}</Text>
            </Card>
            <Card style={{ padding: spacing.lg, marginBottom: spacing.md }}>
              <Text style={{ ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm }}>Active Days</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map((label, i) => (
                  <Button key={i} title={label} size="small" variant={days.includes(i) ? 'primary' : 'outline'} onPress={() => toggleDay(i)} />
                ))}
              </View>
            </Card>
          </>
        )}
        <Button title="Save" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
      </ScrollView>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </ScreenWrapper>
  );
}
