import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useReminderStore } from '../store/reminderStore';
import { useSettingsStore } from '../store/settingsStore';
import { getTimezoneAbbr } from '../utils/timezones';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'>;

export function CreateReminderScreen({ route, navigation }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const { addReminder: createReminder } = useReminderStore();
  const { settings } = useSettingsStore();
  const userTz = settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      const updated = new Date(dueDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setDueDate(updated);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      const updated = new Date(dueDate);
      updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setDueDate(updated);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: userTz });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: userTz });

  const isPastDue = dueDate.getTime() <= Date.now();

  const handleSave = async () => {
    if (!title.trim()) return;
    if (isPastDue) {
      setToast({ message: 'Due date must be in the future', type: 'error' });
      return;
    }
    setSaving(true);
    const ok = await createReminder(callId, {
      title: title.trim(),
      due_at: dueDate.toISOString(),
      timezone: userTz,
    });
    if (ok) {
      setToast({ message: 'Reminder created', type: 'success' });
      setTimeout(() => navigation.goBack(), 500);
    } else {
      const storeError = useReminderStore.getState().error;
      setToast({ message: storeError || 'Could not create reminder. Please try again.', type: 'error' });
    }
    setSaving(false);
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">

        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.lg }}>
          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Call her back, Follow up on quote..."
            maxLength={200}
          />

          <View>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>
              Due Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.md,
                backgroundColor: colors.surfaceVariant,
              }}
            >
              <Icon name="calendar" size="sm" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>
                {formatDate(dueDate)}
              </Text>
              <Icon name="chevron-right" size="sm" color={colors.textDisabled} />
            </TouchableOpacity>
          </View>

          <View>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>
              Due Time
            </Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: radii.md,
                backgroundColor: colors.surfaceVariant,
              }}
            >
              <Icon name="clock-outline" size="sm" color={colors.primary} />
              <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>
                {formatTime(dueDate)} {getTimezoneAbbr(userTz)}
              </Text>
              <Icon name="chevron-right" size="sm" color={colors.textDisabled} />
            </TouchableOpacity>
            {isPastDue && (
              <Text style={{ ...typography.caption, color: colors.error, marginTop: spacing.xs }}>
                Time must be in the future
              </Text>
            )}
          </View>

          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes for this reminder..."
            multiline
            numberOfLines={3}
          />
        </Card>

        <Button
          title="Create Reminder"
          onPress={handleSave}
          loading={saving}
          disabled={!title.trim() || isPastDue}
        />

        {(showDatePicker || (Platform.OS === 'ios' && showDatePicker)) && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
        {(showTimePicker || (Platform.OS === 'ios' && showTimePicker)) && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </ScrollView>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible
          onDismiss={() => setToast(null)}
        />
      )}
    </ScreenWrapper>
  );
}
