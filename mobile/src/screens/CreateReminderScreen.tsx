import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import { formatDateTime, getUserTimezone } from '../utils/formatDate';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'>;

export function CreateReminderScreen({ route }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const tz = getUserTimezone();

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!dueDate) {
      Alert.alert('Error', 'Please select a due date');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(`/reminders/calls/${callId}`, {
        title: title.trim(),
        due_at: dueDate.toISOString(),
        timezone: tz,
      });
      Alert.alert('Success', 'Reminder created', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || e?.response?.data?.detail || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  }

  function onDateChange(_: any, selected?: Date) {
    setShowDatePicker(false);
    if (selected) {
      const merged = dueDate ? new Date(dueDate) : new Date();
      merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDueDate(merged);
      setTimeout(() => setShowTimePicker(true), 300);
    }
  }

  function onTimeChange(_: any, selected?: Date) {
    setShowTimePicker(false);
    if (selected) {
      const merged = dueDate ? new Date(dueDate) : new Date();
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDueDate(merged);
    }
  }

  const defaultPickerDate = dueDate || (() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }}>
          Create Reminder
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || !title.trim() || !dueDate}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: (!title.trim() || !dueDate) ? colors.textDisabled : colors.primary,
            borderRadius: radii.full,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <FadeIn delay={0}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>
              Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Reminder title"
              placeholderTextColor={colors.textDisabled}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />
          </FadeIn>

          <FadeIn delay={40}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.xs }}>
              Due Date & Time
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: dueDate ? colors.primary : colors.border,
                padding: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                <Icon name="calendar-clock" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                {dueDate ? (
                  <>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
                      {formatDateTime(dueDate, tz)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {tz}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 16, color: colors.textDisabled }}>
                    Tap to select date and time
                  </Text>
                )}
              </View>
              {dueDate && (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); setDueDate(null); }}
                  hitSlop={8}
                  style={{ marginLeft: spacing.sm }}
                >
                  <Icon name="close-circle" size={20} color={colors.textDisabled} />
                </Pressable>
              )}
            </Pressable>

            {dueDate && (
              <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.lg }}
                >
                  <Icon name="pencil-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginLeft: 4 }}>Change date</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Icon name="pencil-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginLeft: 4 }}>Change time</Text>
                </Pressable>
              </View>
            )}
          </FadeIn>

          {/* Quick presets */}
          <FadeIn delay={80}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm }}>
              Quick Set
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { label: 'In 1 hour', hours: 1 },
                { label: 'In 3 hours', hours: 3 },
                { label: 'Tomorrow 9am', hours: -1 },
                { label: 'In 1 week', hours: -2 },
              ].map((preset, i) => (
                <Pressable
                  key={preset.label}
                  onPress={() => {
                    const d = new Date();
                    if (preset.hours === -1) {
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                    } else if (preset.hours === -2) {
                      d.setDate(d.getDate() + 7);
                      d.setHours(9, 0, 0, 0);
                    } else {
                      d.setHours(d.getHours() + preset.hours, 0, 0, 0);
                    }
                    setDueDate(d);
                  }}
                  style={{
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={defaultPickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={defaultPickerDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}
