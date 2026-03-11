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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'>;

export function CreateReminderScreen({ route }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(`/reminders/calls/${callId}`, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        due_at: dueAt.trim() || undefined,
      });
      Alert.alert('Success', 'Reminder created', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  }

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
          disabled={saving || !title.trim()}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: !title.trim() ? colors.textDisabled : colors.primary,
            borderRadius: radii.full,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: colors.onPrimary, fontSize: 14 }}>Save</Text>
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
            <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
              TITLE
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
                ...typography.body,
                color: colors.textPrimary,
              }}
            />
          </FadeIn>

          <FadeIn delay={40}>
            <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.xs }}>
              NOTES
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes..."
              placeholderTextColor={colors.textDisabled}
              multiline
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                minHeight: 100,
                ...typography.body,
                color: colors.textPrimary,
                textAlignVertical: 'top',
              }}
            />
          </FadeIn>

          <FadeIn delay={80}>
            <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.xs }}>
              DUE DATE
            </Text>
            <TextInput
              value={dueAt}
              onChangeText={setDueAt}
              placeholder="YYYY-MM-DDTHH:MM:SS (e.g. 2026-03-15T09:00:00)"
              placeholderTextColor={colors.textDisabled}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                ...typography.body,
                color: colors.textPrimary,
              }}
            />
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>
              ISO format date and time
            </Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
