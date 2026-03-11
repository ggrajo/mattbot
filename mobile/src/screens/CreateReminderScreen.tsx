import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';

type CreateReminderParams = { callId?: string };

function parseDateInput(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // YYYY-MM-DD format
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
    return isNaN(date.getTime()) ? null : date;
  }
  // Try native parsing
  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CreateReminderScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ CreateReminder: CreateReminderParams }, 'CreateReminder'>>();
  const callId = route.params?.callId;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; due_date?: string }>({});

  const validate = (): boolean => {
    const next: { title?: string; due_date?: string } = {};
    if (!title.trim()) {
      next.title = 'Title is required';
    }
    const parsed = parseDateInput(dueDateInput);
    if (!parsed) {
      next.due_date = 'Enter a valid date (YYYY-MM-DD)';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      parsed.setHours(0, 0, 0, 0);
      if (parsed < today) {
        next.due_date = 'Due date must be today or in the future';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const parsed = parseDateInput(dueDateInput);
    if (!parsed) return;

    const due_date = formatDateForInput(parsed);
    setSaving(true);
    try {
      if (callId) {
        await apiClient.post(`/reminders/calls/${callId}`, {
          title: title.trim(),
          notes: notes.trim() || undefined,
          due_date,
        });
      } else {
        await apiClient.post('/reminders', {
          title: title.trim(),
          notes: notes.trim() || undefined,
          due_date,
        });
      }
      Alert.alert('Success', 'Reminder created successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
            Create Reminder
          </Text>
        </FadeIn>

        {callId && (
          <FadeIn delay={40}>
            <Card style={{ marginBottom: spacing.lg }}>
              <View style={styles.linkedRow}>
                <Text style={styles.linkedEmoji}>📞</Text>
                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                  Linked to call
                </Text>
              </View>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={60}>
          <TextInput
            label="Title"
            placeholder="What do you need to remember?"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
            }}
            error={errors.title}
            autoCapitalize="sentences"
          />
        </FadeIn>

        <FadeIn delay={120}>
          <TextInput
            label="Notes"
            placeholder="Optional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </FadeIn>

        <FadeIn delay={180}>
          <TextInput
            label="Due date"
            placeholder="YYYY-MM-DD"
            value={dueDateInput}
            onChangeText={(t) => {
              setDueDateInput(t);
              if (errors.due_date) setErrors((e) => ({ ...e, due_date: undefined }));
            }}
            error={errors.due_date}
          />
        </FadeIn>

        <FadeIn delay={240}>
          <Button
            title="Create Reminder"
            onPress={handleSubmit}
            loading={saving}
            disabled={!title.trim() || !dueDateInput.trim()}
            style={{ marginTop: spacing.lg }}
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkedEmoji: {
    fontSize: 18,
  },
});
